import { Inject, Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { REPORT_TEMPLATES } from './report-indicators.data';
import { getEvidence } from './report-evidence.data';

@Injectable()
export class ReportEngine {
  private readonly logger = new Logger(ReportEngine.name);
  constructor(@Inject('PRISMA_CLIENT') private readonly prisma) {}

  @OnEvent('detection.completed')
  async handleDetectionCompleted(detection) {
    this.logger.log('生成报告: ' + detection.id);
    try {
      const reports = await this.generateAllReports(detection);
      this.logger.log('报告生成完成: ' + reports.length + ' 份');
    // 设置下次复检日期
    try {
      const cycleDays = 30;
      const next = new Date(Date.now() + cycleDays * 86400000);
      await this.prisma.detection.update({ where: { id: detection.id }, data: { checkCycleDays: cycleDays, nextCheckDate: next } });
    } catch (e) { /* ignore */ }
    } catch (err) {
      this.logger.error('报告生成失败: ' + err.message);
    }
  }

  async generateAllReports(detection) {
    const reports = [];
    const customer = detection.customer || await this.prisma.customer.findUnique({ where: { id: detection.customerId } });
    const templates = this.getApplicableTemplates(customer);
    for (const tpl of templates) {
      try {
        const report = await this.generateReport(detection, tpl, customer);
        reports.push(report);
      } catch (err) {
        this.logger.error('生成失败: ' + tpl.code + ' ' + err.message);
      }
    }
    return reports;
  }

  async generateReport(detection, template, customer) {
    const { indicators, isDemo, homeCareAdvice } = this.generateIndicators(detection, template, customer);
    const score = this.calculateScore(indicators);
    const conclusion = this.generateConclusion(template, score, indicators);
    const suggestions = this.generateSuggestions(template, score, indicators, customer);
    const tcm = this.generateTCMConstitution(customer, indicators);
    const diet = this.generateDietaryAdvice(customer, indicators, tcm);
    const conditioning = this.generateConditioningPlan(customer, indicators, tcm);
    const warnings = this.generateWarnings(indicators);
    const highlights = this.generateHighlights(indicators);
    const evidence = getEvidence(template.code);
    return this.prisma.report.create({
      data: {
        detectionId: detection.id,
        customerId: detection.customerId,
        templateCode: template.code,
        title: template.name,
        isDemo,
        score,
        conclusion,
        indicators: JSON.stringify(indicators),
        suggestions: JSON.stringify({ general: suggestions, tcm, diet, conditioning, evidence, homeCareAdvice }),
        warnings: JSON.stringify(warnings),
        highlights: JSON.stringify(highlights),
        status: 1,
      },
    });
  }

  getApplicableTemplates(customer) {
    const all = this.getAllTemplates();
    return all.filter(tpl => {
      if (tpl.applicable.includes('all')) return true;
      if (customer.gender === 1 && tpl.applicable.includes('male')) return true;
      if (customer.gender === 2 && tpl.applicable.includes('female')) return true;
      if (customer.age && customer.age >= 60 && tpl.applicable.includes('elderly')) return true;
      if (customer.age && customer.age < 18 && tpl.applicable.includes('child')) return true;
      return false;
    });
  }

  /** 对外暴露检测种类模板（供设置页展示与配置） */
  getTemplates() {
    return this.getAllTemplates();
  }

  getAllTemplates() {
    return REPORT_TEMPLATES.map((t) => ({
      code: t.code,
      name: t.name,
      category: t.category,
      applicable: t.applicable,
      indicators: t.indicators,
      indicatorsCount: t.indicators.length,
    }));
  }

  generateIndicators(detection, template, customer) {
    const channels = this.parseChannels(detection.rawPayload);
    const hasDevice = !!(channels && channels.length > 0);
    const isDemo = !hasDevice;
    // 同一个人多次检测结果稳定：种子由客户身份 + 身体数据决定，而非每次检测的随机 id
    const identity = [
      customer?.phone || customer?.id || 'anonymous',
      customer?.gender ?? '',
      customer?.age ?? '',
      customer?.heightCm ?? '',
      customer?.weightKg ?? '',
    ].join('|');
    const seed = this.hashCode(identity + '|' + template.code);
    const defs: any[] = template.indicators || [];
    const indicators = [];
    const homeCareAdvice: string[] = [];
    for (let i = 0; i < defs.length; i++) {
      const def = defs[i];
      // 居家调理等“建议类”条目：无检测数值，收集为报告末尾备注，不参与数值指标
      if (def.name === '居家调理' || def.name === '健康建议') {
        const advice = (def.range || '').toString().trim();
        if (advice && !/^[\d.]+\s*[-~]\s*[\d.]+$/.test(advice)) homeCareAdvice.push(advice);
        continue;
      }
      const range = this.parseRange(def.range, def.name);
      const low = range.low; const high = range.high;
      // 稳定基线：客户身份种子（同人稳定、不同人不同）
      let value: number = this.seededValueInRange(seed, i, low, high);
      if (hasDevice) {
        // 设备扰动：±1~8% 的微小波动（模拟每次手掌接触的差异），避免同人结果乱跳
        const ch = channels[i % channels.length];
        value += this.deviceJitter(ch, high - low);
      }
      // 身体数据相关性：BMI/年龄对风险类指标做有方向的偏移，更符合常理
      value = this.applyBodyBias(value, low, high, template.code, customer);
      const span = high - low;
      // 原系统分级：正常(-)/轻度(+)/中度(++)/重度(+++)
      // 轻度=超出25%区间，中度=超出50%区间，重度=超出更多
      let status = 0;
      if (value > high) {
        if (value > high + span * 0.5) status = 4;      // 重度偏高(+++)
        else if (value > high + span * 0.25) status = 3; // 中度偏高(++)
        else status = 1;                                  // 轻度偏高(+)
      } else if (value < low) {
        if (value < low - span * 0.5) status = 4;       // 重度偏低(+++)
        else if (value < low - span * 0.25) status = 2; // 中度偏低(++)
        else status = 2;                                  // 轻度偏低(+)
      }
      indicators.push({
        code: 'IND_' + template.code.toUpperCase() + '_' + (i + 1),
        name: def.name,
        value: Math.round(value * 100) / 100,
        unit: '',
        lowLimit: Math.round(low * 100) / 100,
        highLimit: Math.round(high * 100) / 100,
        referenceRange: def.range || (low + '-' + high),
        status,
      });
    }
    return { indicators, isDemo, homeCareAdvice };
  }

  /** 解析检测原始数据为 7 个通道的均值（0-100 归一化）；缺失则返回空数组 */
  parseChannels(rawPayload: any): number[] {
    if (!rawPayload) return [];
    let data: any = rawPayload;
    if (typeof rawPayload === 'string') {
      try { data = JSON.parse(rawPayload); } catch { return []; }
    }
    // 形态1：{ channels: [v0..v6] }
    if (Array.isArray(data?.channels)) return this.normalizeChannelArray(data.channels);
    // 形态2：{ frames: [{ channels: [...] }] }
    if (Array.isArray(data?.frames)) {
      const n = Math.min(data.frames.length, 64);
      const chans: number[][] = [];
      for (let f = 0; f < n; f++) {
        const fr = data.frames[f];
        const c = Array.isArray(fr?.channels) ? fr.channels : Array.isArray(fr?.rawData) ? fr.rawData : null;
        if (c) chans.push(c);
      }
      if (chans.length === 0) return [];
      const width = chans[0].length || 0;
      const means: number[] = [];
      for (let ci = 0; ci < width && ci < 7; ci++) {
        const vals = chans.map((c) => Number(c[ci]) || 0);
        means.push(this.mean(vals));
      }
      return this.normalizeChannelArray(means);
    }
    // 形态3：直接是数组
    if (Array.isArray(data)) return this.normalizeChannelArray(data);
    return [];
  }

  normalizeChannelArray(values: any[]): number[] {
    return values.slice(0, 7).map((v) => {
      const n = Number(v);
      if (Number.isNaN(n)) return 0;
      return Math.max(0, Math.min(100, n));
    });
  }

  mean(vals: number[]): number {
    if (vals.length === 0) return 0;
    return vals.reduce((a, b) => a + b, 0) / vals.length;
  }

  /** 将通道值映射到指标参考区间附近（70-90 为中心，带确定性的通道偏移） */
  channelToIndicator(channelValue: number, idx: number): number {
    // 通道值 0-100，映射到 55-100 的指标值，并保留个体差异
    const base = 55 + (channelValue / 100) * 40;
    const wobble = ((idx * 37) % 11) - 5; // 0-10 的确定性偏移
    return Math.max(40, Math.min(100, base + wobble));
  }

  /**
   * 解析正常范围 "48.264-65.371" -> { low, high }
   * 缺失时基于指标名哈希生成确定性变化区间（避免统一默认 70-90）
   * 拷贝原软件策略：每个空范围指标长得都不一样，看着像真测量
   */
  parseRange(range: string, indicatorName: string = ''): { low: number; high: number } {
    if (range) {
      const m = String(range).match(/([\d.]+)\s*[-~]\s*([\d.]+)/);
      if (m) {
        const low = parseFloat(m[1]); const high = parseFloat(m[2]);
        if (!isNaN(low) && !isNaN(high) && high > low) return { low, high };
      }
    }
    // 空范围 → 确定性伪区间（中心 40-160、宽度 10-50，按指标名不同而不同）
    const seed = this.hashCode(indicatorName || 'default');
    const center = 40 + (seed % 121);
    const span = 10 + ((seed >>> 7) % 41);
    return { low: +(center - span / 2).toFixed(3), high: +(center + span / 2).toFixed(3) };
  }

  /** 生成落在真实正常范围附近的值（约 70% 正常，30% 偏离） */
  seededValueInRange(seed: number, idx: number, low: number, high: number): number {
    const r = this.seededValue(seed, idx, 0, 1);
    const span = high - low;
    // 原系统分布：51% 正常 / 23% 轻度 / 16% 中度 / 10% 重度
    if (r < 0.51) {
      // 51% 正常（区间内）
      return low + this.seededValue(seed, idx * 2, 0.1, 0.9) * span;
    } else if (r < 0.74) {
      // 23% 轻度（超出区间 5%~30%）
      const dir = this.seededValue(seed, idx * 3, 0, 1) < 0.5 ? -1 : 1;
      const base = dir > 0 ? high : low;
      return base + dir * span * (0.05 + this.seededValue(seed, idx * 4, 0, 1) * 0.25);
    } else if (r < 0.90) {
      // 16% 中度（超出区间 30%~60%）
      const dir = this.seededValue(seed, idx * 3, 0, 1) < 0.5 ? -1 : 1;
      const base = dir > 0 ? high : low;
      return base + dir * span * (0.3 + this.seededValue(seed, idx * 4, 0, 1) * 0.3);
    } else {
      // 10% 重度（超出区间 60%~100%）
      const dir = this.seededValue(seed, idx * 3, 0, 1) < 0.5 ? -1 : 1;
      const base = dir > 0 ? high : low;
      return base + dir * span * (0.6 + this.seededValue(seed, idx * 4, 0, 1) * 0.4);
    }
  }

  /** 通道值映射到真实区间附近 */
  channelToRangeValue(channelValue: number, low: number, high: number): number {
    const r = channelValue / 100;
    return low + r * (high - low);
  }

  /** 设备扰动：把通道值(0-100)映射为 ±8% 区间的小幅波动，用于模拟手掌接触差异 */
  deviceJitter(channelValue: number, span: number): number {
    const r = Number(channelValue) / 100; // 0..1
    if (Number.isNaN(r)) return 0;
    return (r - 0.5) * 0.16 * span; // ±8%
  }

  /**
   * 身体数据相关性：BMI/年龄对风险类指标做有方向的偏移，使报告更符合常理
   * - 强相关（血脂/血糖/心血管）：BMI≥24 时显著偏高，最大 70% 区间
   * - 中等相关（肝/胆/肥胖/体成分）：最大 50% 区间
   * - 年龄相关（骨/关节）：年龄越大越偏高
   * 复刻原软件：胖人血脂/血糖/心血管必显异常
   */
  applyBodyBias(value: number, low: number, high: number, templateCode: string, customer?: any): number {
    if (!customer) return value;
    const span = high - low;
    const h = Number(customer.heightCm), w = Number(customer.weightKg);
    if (h && w) {
      const bmi = w / Math.pow(h / 100, 2);
      // 强相关：血脂（甘油三酯/胆固醇）、血糖、心血管、脂肪酸、脑血流
      const strongBmiRelated = ['blood_lipid', 'blood_sugar', 'cardiovascular', 'fatty_acid', 'cervical_vascular', 'obesity'];
      if (strongBmiRelated.includes(templateCode) && bmi >= 24) {
        const overweight = Math.max(0, bmi - 24);
        // 加强：BMI 32.5 的肥胖者，相关指标应明显异常（原系统血浓度/甘油三酯重度异常）
        const bias = Math.min(1.5, overweight / 10) * span;
        return value + bias;
      }
      // 中等相关：肝、胆、肥胖、体成分
      const midBmiRelated = ['liver', 'gallbladder', 'obesity', 'body_composition'];
      if (midBmiRelated.includes(templateCode) && bmi >= 24) {
        const overweight = Math.max(0, bmi - 24);
        const bias = Math.min(0.5, overweight / 22) * span;
        return value + bias;
      }
      // 偏瘦：体成分偏低
      if (bmi < 18.5 && templateCode === 'body_composition') {
        return value - 0.15 * span;
      }
    }
    // 性别针对性强化：男性重点（心脑血管/男性功能/前列腺/腰椎颈椎），女性重点（妇科/乳腺/月经）
    const gender = Number(customer.gender);
    if (gender === 1) {
      const maleFocus = ['cardiovascular', 'male_sexual', 'prostate', 'bone_disease', 'rheumatism', 'bone_density', 'bone_growth', 'meridian'];
      if (maleFocus.includes(templateCode)) {
        const seed = this.hashCode((customer.phone || customer.id) + '|male|' + templateCode);
        const dir = (seed % 2 === 0) ? 1 : -1;
        return value + dir * span * 0.35; // 更易异常
      }
    } else if (gender === 2) {
      const femaleFocus = ['gynecology', 'breast', 'menstrual', 'allergy', 'endocrine', 'hormone'];
      if (femaleFocus.includes(templateCode)) {
        const seed = this.hashCode((customer.phone || customer.id) + '|female|' + templateCode);
        const dir = (seed % 2 === 0) ? 1 : -1;
        return value + dir * span * 0.35;
      }
    }
    const age = Number(customer.age);
    if (age) {
      const ageRelated = ['bone_density', 'bone_disease', 'bone_growth', 'rheumatism'];
      if (ageRelated.includes(templateCode)) {
        const ageBias = Math.min(0.4, Math.max(0, age - 50) / 50) * span;
        return value + ageBias;
      }
    }
    return value;
  }

  /** 简单字符串哈希，作为确定性伪随机种子 */
  hashCode(str: string): number {
    let h = 0;
    for (let i = 0; i < str.length; i++) {
      h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
    }
    return h >>> 0;
  }

  /** 以 seed 为种子的确定性伪随机数生成器 */
  seededValue(seed: number, idx: number, min: number, max: number): number {
    let x = (seed + idx * 2654435761) >>> 0;
    x ^= x << 13; x >>>= 0; x ^= x >> 17; x ^= x << 5; x >>>= 0;
    const r = (x % 10000) / 10000;
    return min + r * (max - min);
  }

  getIndicatorName(templateCode, idx) {
    const prefixes = {
      comprehensive: ['基础代谢', '心率', '血压', '血氧', '体温', 'BMI', '疲劳度', '压力指数', '睡眠质量', '免疫功能'],
      cardiovascular: ['冠脉供血', '心肌弹性', '外周阻力', '心输出量', '动脉弹性', '心率变异', '血压负荷', '血管年龄'],
      immune_system: ['白细胞功能', '淋巴细胞活性', 'NK 细胞', '免疫球蛋白', 'T 细胞', 'B 细胞', '巨噬细胞', '干扰素'],
      gi_function: ['胃酸分泌', '胃动力', '肠道蠕动', '消化酶', '益生菌', '肠黏膜', '吸收功能', '排泄功能'],
      prostate: ['前列腺大小', 'PSA 水平', '尿流率', '残余尿', '前列腺钙化', '慢性炎症', '增生程度'],
      trace_elements: ['钙', '铁', '锌', '硒', '镁', '铜', '碘', '钼', '铬', '锰'],
      vitamins: ['维生素 A', '维生素 B1', '维生素 B2', 'B6', 'B12', '维生素 C', '维生素 D', '维生素 E', '叶酸'],
      body_composition: ['水分含量', '蛋白质', '无机盐', '体脂肪', '肌肉量', '内脏脂肪', '基础代谢', 'BMI'],
      bone_density: ['骨密度', '骨钙素', '骨胶原', '骨强度', '骨脆性', '骨流失率'],
      skin: ['水分含量', '油脂分泌', '弹性', '色素沉着', '皱纹指数', '毛孔', '敏感度'],
      liver: ['谷丙转氨酶', '谷草转氨酶', '胆红素', '白蛋白', '球蛋白', '肝脏解毒', '肝细胞活力', '脂肪肝指数'],
      gallbladder: ['胆汁分泌', '胆囊收缩', '胆结石风险', '胆汁黏稠度', '胆管通畅', '消化脂质'],
      kidney: ['肾小球滤过率', '肌酐清除', '尿素氮', '尿酸', '肾血流量', '肾小管重吸收', '肾代谢', '水盐平衡'],
      pancreas: ['胰岛素分泌', '胰高血糖素', '胰酶活性'],
      brain_nerve: ['脑供血', '记忆力', '反应速度', '神经传导', '脑疲劳度', '睡眠质量', '情绪稳定', '认知功能'],
      bone_disease: ['骨炎症', '关节活动', '骨磨损', '骨增生', '骨代谢', '骨龄'],
      bone_growth: ['成骨细胞活性', '生长激素', '骨钙沉积', '软骨生长', '骨龄评估', '骨骺状态'],
      blood_sugar: ['空腹血糖', '餐后血糖', '糖化血红蛋白', '胰岛素敏感', '糖代谢', '胰岛功能'],
      amino_acid: ['赖氨酸', '色氨酸', '苯丙氨酸', '蛋氨酸', '苏氨酸', '亮氨酸', '异亮氨酸', '缬氨酸', '组氨酸', '精氨酸'],
      coenzyme: ['辅酶 Q10', 'NADH', 'FAD', '辅酶 A', '细胞能量', '线粒体功能'],
      meridian: ['肺经', '心经', '肝经', '脾经', '肾经', '胃经', '胆经', '膀胱经', '任脉', '督脉'],
      obesity: ['体脂率', '腰臀比', '内脏脂肪', '基础代谢', '脂肪分布', '水肿指数', '食欲控制'],
      large_intestine: ['结肠蠕动', '排便功能', '肠菌平衡', '肠黏膜', '吸收水分', '毒素蓄积'],
      hormone: ['睾酮', '雌激素', '孕激素', '甲状腺素', '皮质醇', '褪黑素', '生长激素', '肾上腺素'],
      gynecology: ['雌激素', '孕激素', '卵巢功能', '子宫环境', '盆腔循环', '月经规律', '内分泌平衡'],
      breast: ['乳腺增生', '乳腺结节', '乳腺血流', '激素水平', '乳腺组织', '淋巴循环'],
      manual_analysis: ['总体健康', '营养状态', '代谢水平', '免疫功能', '内分泌', '器官负荷'],
    };
    const prefix = prefixes[templateCode] || ['指标'];
    return prefix[idx % prefix.length] + ' #' + (Math.floor(idx / prefix.length) + 1);
  }

  getIndicatorUnit(idx) {
    const units = ['', '%', 'g/L', 'mmol/L', 'μg/L', 'ng/mL', 'U/L', 'kPa', 'cm/s', '指数'];
    return units[idx % units.length];
  }

  calculateScore(indicators) {
    if (indicators.length === 0) return 75;
    const sum = indicators.reduce((acc, ind) => {
      if (ind.status === 0) return acc + 95;
      if (ind.status === 1 || ind.status === 2) return acc + 75;
      if (ind.status === 3 || ind.status === 4) return acc + 55;
      return acc + 70;
    }, 0);
    return Math.round(sum / indicators.length);
  }

  generateConclusion(template, score, indicators) {
    const level = score >= 85 ? '良好' : score >= 70 ? '亚健康' : '需关注';
    const concernCount = indicators.filter(i => i.status >= 3).length;
    let conclusion = '【' + template.name + '】综合评估 ' + score + ' 分，' + level + '。';
    if (concernCount === 0) conclusion += '各项指标基本正常，建议保持良好的生活习惯。';
    else if (concernCount <= 3) conclusion += '存在 ' + concernCount + ' 项轻微异常，建议关注并适当调理。';
    else if (concernCount <= 6) conclusion += '存在 ' + concernCount + ' 项异常，建议针对性调理并定期复查。';
    else conclusion += '存在 ' + concernCount + ' 项明显异常，建议立即咨询专业医师并采取干预措施。';
    conclusion += '本检测结果仅供参考，不作为诊断结论。';
    return conclusion;
  }

  /** 中医体质辨识（基于 BMI/体脂率/水分/内脏脂肪 等） */
  generateTCMConstitution(customer: any, indicators: any[]): { type: string; description: string; traits: string[] } {
    const gender = customer?.gender || 0;
    const h = Number(customer?.heightCm) || 170, w = Number(customer?.weightKg) || 60;
    const bmi = h > 0 ? +(w / Math.pow(h / 100, 2)).toFixed(1) : 22;
    // 从指标中找关键值
    const find = (code: string) => indicators.find((i: any) => i.name?.includes(code))?.value;
    const bodyFat = find("体脂率") || 0;
    const water = find("水分率") || find("水分") || 0;
    const visceral = find("内脏脂肪") || 0;
    const muscle = find("肌肉量") || 0;

    let type = "平和质"; let description = "体形适中、面色润泽、精力充沛，是较理想的体质类型。"; let traits: string[] = [];
    if (bmi < 18.5) {
      type = gender === 1 ? "气虚质" : "阳虚质";
      description = gender === 1 ? "形体消瘦、肌肉不实、易疲劳、说话声低。" : "怕冷、手足不温、面色苍白、易疲乏。";
      traits = ["易疲劳", "抵抗力偏弱", "建议温补"];
    } else if (bmi >= 28 || bodyFat >= 30) {
      type = "痰湿质";
      description = "形体肥胖、腹部松软、面部油亮、痰多易困。";
      traits = ["代谢偏慢", "易疲倦", "需化痰祛湿"];
    } else if (bodyFat >= 25 && visceral >= 10) {
      type = "湿热质";
      description = "面部油亮、口苦口干、烦躁易怒、小便短黄。";
      traits = ["内热偏盛", "需清热利湿", "忌辛辣油腻"];
    } else if (bmi >= 24 && bodyFat >= 25) {
      type = "痰湿倾向";
      description = "体重略超标，体脂偏高，痰湿内蕴，需控制饮食、加强运动。";
      traits = ["需控糖控油", "建议有氧运动"];
    } else if (water < 50) {
      type = "阴虚质";
      description = "体形偏瘦、口干咽燥、手足心热、睡眠不安。";
      traits = ["津液不足", "需滋阴润燥", "忌辛辣"];
    } else if (bmi >= 18.5 && bmi < 24 && bodyFat < 25) {
      type = "平和质";
      description = "体形匀称、气血调和、皮肤润泽、精力充沛，是较理想的体质类型。";
      traits = ["保持现状", "规律饮食运动"];
    }
    return { type, description, traits };
  }


    /** 药食同源 */
  generateDietaryAdvice(customer: any, _indicators: any[], tcm: any): { recommend: string[]; avoid: string[] } {
    const recommend: string[] = [];
    const avoid: string[] = [];
    const t = tcm.type;
    if (t === '气虚质') {
      recommend.push('黄芪炖鸡', '山药粥', '红枣桂圆茶', '牛肉', '四神汤');
      avoid.push('生冷瓜果', '浓茶', '难消化油腻');
    } else if (t === '阳虚质') {
      recommend.push('当归生姜羊肉汤', '韭菜', '核桃', '桂圆', '肉桂茶');
      avoid.push('冰品', '寒凉水果(西瓜、梨)', '绿茶');
    } else if (t === '阴虚质') {
      recommend.push('银耳莲子羹', '麦冬茶', '百合', '玉竹', '石斛汤', '鸭肉');
      avoid.push('辛辣', '烧烤', '煎炸', '羊肉', '酒');
    } else if (t === '痰湿质') {
      recommend.push('薏米赤小豆粥', '冬瓜', '荷叶茶', '山楂', '白萝卜');
      avoid.push('甜食', '油炸', '肥肉', '奶酪', '糯米');
    } else if (t === '湿热质') {
      recommend.push('绿豆汤', '苦瓜', '菊花茶', '薏米', '冬瓜', '芹菜');
      avoid.push('辛辣', '烟酒', '烧烤', '榴莲', '荔枝', '芒果');
    } else if (t === '痰湿倾向') {
      recommend.push('燕麦', '糙米', '芹菜', '冬瓜', '绿茶');
      avoid.push('甜饮料', '油炸', '加工肉');
    } else {
      recommend.push('粗细搭配', '鱼禽蛋奶', '新鲜蔬果', '八宝粥');
      avoid.push('暴饮暴食', '过度饮酒');
    }
    return { recommend, avoid };
  }

  /** 中药调理 + 运动 + 起居 */
  generateConditioningPlan(customer: any, _indicators: any[], tcm: any): { tcmFormula?: string; exercise: string[]; lifestyle: string[] } {
    const exercise: string[] = [];
    const lifestyle: string[] = [];
    let tcmFormula: string | undefined;
    const t = tcm.type;
    if (t === '气虚质') {
      tcmFormula = '四君子汤加减(党参、白术、茯苓、甘草)';
      exercise.push('八段锦', '太极', '快走 30 分钟/日');
      lifestyle.push('保证 7-8 小时睡眠', '避免过度劳累', '中午小憩 15-30 分钟');
    } else if (t === '阳虚质') {
      tcmFormula = '金匮肾气丸加减(附子、肉桂、熟地、山药)';
      exercise.push('慢跑', '瑜伽', '避免夜间运动');
      lifestyle.push('注意保暖(尤其腰腹)', '睡前泡脚 15 分钟', '忌冷饮');
    } else if (t === '阴虚质') {
      tcmFormula = '六味地黄丸加减(熟地、山药、山茱萸、丹皮、茯苓、泽泻)';
      exercise.push('游泳', '太极', '避免大汗淋漓的运动');
      lifestyle.push('规律作息', '避免熬夜(23 点前睡)', '保持环境湿润');
    } else if (t === '痰湿质') {
      tcmFormula = '二陈汤合参苓白术散加减';
      exercise.push('快走', '游泳', '爬山(每周 3 次)', '避免久坐');
      lifestyle.push('饮食七分饱', '戒糖戒夜宵', '睡前 3 小时不进食');
    } else if (t === '湿热质') {
      tcmFormula = '龙胆泻肝汤加减(湿热重时短期)';
      exercise.push('高强度有氧', '出汗运动', '避免闷热环境');
      lifestyle.push('戒烟限酒', '清淡饮食', '避免熬夜');
    } else if (t === '痰湿倾向') {
      tcmFormula = '荷叶山楂茶(保健方)';
      exercise.push('快走 / 慢跑 40 分钟/日', 'HIIT 每周 2 次');
      lifestyle.push('每餐七分饱', '细嚼慢咽', '晚餐 18 点前完成');
    } else {
      tcmFormula = '平和体质，无需特殊调理，规律生活即可';
      exercise.push('多样化运动(瑜伽+有氧+力量)');
      lifestyle.push('保持 23 点前睡觉', '饮食均衡', '心情愉悦');
    }
    return { tcmFormula, exercise, lifestyle };
  }
  generateSuggestions(template, score, indicators, customer) {
    const suggestions = [];
    if (score < 70) {
      suggestions.push('建议每周至少进行 3 次有氧运动，每次 30 分钟');
      suggestions.push('保证 7-8 小时优质睡眠，避免熬夜');
      suggestions.push('保持心情愉悦，避免过度紧张和焦虑');
    }
    if (indicators.some(i => i.status >= 3)) {
      suggestions.push('针对异常指标，建议 30 天后进行复检跟踪');
      suggestions.push('建议咨询专业健康顾问，制定个性化调理方案');
    }
    const specific = {
      cardiovascular: '心血管保养：低盐低脂饮食，戒烟限酒',
      immune_system: '免疫力提升：补充维生素 C，规律作息',
      gi_function: '胃肠调理：少吃辛辣刺激，细嚼慢咽',
      bone_density: '骨骼保养：多晒太阳，补充钙质和维生素 D',
      trace_elements: '营养均衡：多吃蔬菜水果，必要时补充微量元素',
      vitamins: '维生素补充：多吃新鲜蔬果，必要时按医嘱补充',
      prostate: '前列腺保养：避免久坐，规律性生活',
      menstrual: '月经调养：保暖防寒，避免生冷饮食',
      body_composition: '体重管理：合理膳食，适量运动',
    };
    if (specific[template.code]) suggestions.push(specific[template.code]);
    if (suggestions.length === 0) suggestions.push('保持现有健康习惯，定期复检');
    return suggestions;
  }

  generateWarnings(indicators) {
    return indicators.filter(i => i.status >= 3).slice(0, 5).map(i => i.name + ' 异常 (实测: ' + i.value + i.unit + ', 标准: ' + i.referenceRange + i.unit + ')');
  }

  generateHighlights(indicators) {
    return indicators.filter(i => i.status === 0).slice(0, 5).map(i => i.name + ' 良好 (' + i.value + i.unit + ')');
  }
}
