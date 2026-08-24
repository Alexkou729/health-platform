import { Inject, Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';

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
    const indicators = this.generateIndicators(detection, template);
    const score = this.calculateScore(indicators);
    const conclusion = this.generateConclusion(template, score, indicators);
    const suggestions = this.generateSuggestions(template, score, indicators, customer);
    const warnings = this.generateWarnings(indicators);
    const highlights = this.generateHighlights(indicators);
    return this.prisma.report.create({
      data: {
        detectionId: detection.id,
        customerId: detection.customerId,
        templateCode: template.code,
        title: template.name,
        score,
        conclusion,
        indicators,
        suggestions,
        warnings,
        highlights,
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

  getAllTemplates() {
    return [
      { code: 'comprehensive', name: '综合报告', category: '综合', applicable: ['all'], indicatorsCount: 50 },
      { code: 'comparison', name: '对比分析报告', category: '综合', applicable: ['all'], indicatorsCount: 0 },
      { code: 'expert_analysis', name: '专家分析报告', category: '综合', applicable: ['all'], indicatorsCount: 0 },
      { code: 'basic_constitution', name: '基本体质评估', category: '综合', applicable: ['all'], indicatorsCount: 50 },
      { code: 'cardiovascular', name: '心脑血管评估', category: '系统器官', applicable: ['all', 'elderly'], indicatorsCount: 32 },
      { code: 'immune_system', name: '免疫系统评估', category: '系统器官', applicable: ['all'], indicatorsCount: 28 },
      { code: 'gi_function', name: '胃肠功能评估', category: '系统器官', applicable: ['all'], indicatorsCount: 24 },
      { code: 'endocrine', name: '内分泌系统评估', category: '系统器官', applicable: ['all'], indicatorsCount: 26 },
      { code: 'lung_function', name: '肺功能评估', category: '系统器官', applicable: ['all'], indicatorsCount: 18 },
      { code: 'cardiac_muscle', name: '心肌功能评估', category: '系统器官', applicable: ['all'], indicatorsCount: 22 },
      { code: 'bone_deficiency', name: '骨气不足评估', category: '系统器官', applicable: ['all', 'elderly'], indicatorsCount: 16 },
      { code: 'bone_density', name: '骨骼密度评估', category: '系统器官', applicable: ['all', 'elderly'], indicatorsCount: 14 },
      { code: 'allergy', name: '过敏评估', category: '系统器官', applicable: ['all'], indicatorsCount: 30 },
      { code: 'respiratory', name: '呼吸功能评估', category: '系统器官', applicable: ['all'], indicatorsCount: 12 },
      { code: 'respiratory_detail', name: '呼吸功能(详细)', category: '系统器官', applicable: ['all'], indicatorsCount: 16 },
      { code: 'skin_symptom', name: '皮肤症状评估', category: '系统器官', applicable: ['all'], indicatorsCount: 20 },
      { code: 'eye', name: '眼部评估', category: '系统器官', applicable: ['all'], indicatorsCount: 18 },
      { code: 'cervical_vascular', name: '颈椎与脑血管', category: '系统器官', applicable: ['all', 'elderly'], indicatorsCount: 20 },
      { code: 'lymphatic', name: '淋巴评估', category: '系统器官', applicable: ['all'], indicatorsCount: 14 },
      { code: 'trace_elements', name: '微量元素评估', category: '营养', applicable: ['all'], indicatorsCount: 24 },
      { code: 'vitamins', name: '维生素评估', category: '营养', applicable: ['all'], indicatorsCount: 18 },
      { code: 'blood_lipid', name: '血脂评估', category: '营养', applicable: ['all', 'elderly'], indicatorsCount: 16 },
      { code: 'blood_calcium', name: '血钙评估', category: '营养', applicable: ['all'], indicatorsCount: 8 },
      { code: 'fatty_acid', name: '脂肪酸评估', category: '营养', applicable: ['all'], indicatorsCount: 14 },
      { code: 'efa', name: '基本脂肪酸评估', category: '营养', applicable: ['all'], indicatorsCount: 12 },
      { code: 'prostate', name: '前列腺评估', category: '男性', applicable: ['male'], indicatorsCount: 18 },
      { code: 'sperm_semen', name: '精子与精液评估', category: '男性', applicable: ['male'], indicatorsCount: 20 },
      { code: 'male_sexual', name: '男性性功能评估', category: '男性', applicable: ['male'], indicatorsCount: 16 },
      { code: 'menstrual', name: '月经周期评估', category: '女性', applicable: ['female'], indicatorsCount: 20 },
      { code: 'probiotic_index', name: '益生菌指数评估', category: '女性', applicable: ['female'], indicatorsCount: 14 },
      { code: 'body_toxin', name: '人体毒素评估', category: '风险', applicable: ['all'], indicatorsCount: 18 },
      { code: 'body_toxin_detail', name: '人体毒素(详细)', category: '风险', applicable: ['all'], indicatorsCount: 24 },
      { code: 'heavy_metal', name: '重金属态评估', category: '风险', applicable: ['all'], indicatorsCount: 16 },
      { code: 'disease_risk', name: '疾病风险评估', category: '风险', applicable: ['all'], indicatorsCount: 30 },
      { code: 'body_composition', name: '人体成分评估', category: '体成分', applicable: ['all'], indicatorsCount: 20 },
      { code: 'body_fluid', name: '体液评估', category: '体成分', applicable: ['all'], indicatorsCount: 12 },
      { code: 'collagen', name: '胶原蛋白评估', category: '体成分', applicable: ['female', 'elderly'], indicatorsCount: 10 },
      { code: 'thyroid', name: '甲状腺评估', category: '体成分', applicable: ['all'], indicatorsCount: 16 },
      { code: 'consciousness_posture', name: '人体意识体态评估', category: '体成分', applicable: ['all'], indicatorsCount: 16 },
      { code: 'skin', name: '皮肤评估', category: '专项', applicable: ['all', 'female'], indicatorsCount: 20 },
      { code: 'rheumatism', name: '类风湿评估', category: '专项', applicable: ['all', 'elderly'], indicatorsCount: 18 },
      { code: 'comprehensive_immunity', name: '人体综合免疫力', category: '专项', applicable: ['all'], indicatorsCount: 24 },
      { code: 'gut_flora', name: '肠道菌群评估', category: '专项', applicable: ['all'], indicatorsCount: 20 },
    ];
  }

  generateIndicators(detection, template) {
    const indicators = [];
    const noise = Math.random() * 0.3;
    for (let i = 0; i < template.indicatorsCount; i++) {
      const value = 60 + Math.random() * 35 + noise * 10;
      const low = 70; const high = 90;
      const status = value < low - 5 ? 4 : value < low ? 2 : value > high + 5 ? 3 : value > high ? 1 : 0;
      indicators.push({
        code: 'IND_' + template.code.toUpperCase() + '_' + (i + 1),
        name: this.getIndicatorName(template.code, i),
        value: Math.round(value * 10) / 10,
        unit: this.getIndicatorUnit(i),
        lowLimit: low, highLimit: high, referenceRange: low + '-' + high, status,
      });
    }
    return indicators;
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
