import { Inject, Injectable, Logger } from "@nestjs/common";
import * as fs from "fs";
import * as path from "path";
import { exec } from "child_process";

/**
 * 原系统（智能健康检测系统 V13 / Quantum Analyzer）深度接入
 *
 * 战略：不逆向、不重写他的代码，让他的系统【全量跑起来】，
 *       我们只【捕获结果】(HTML 报告) 并融合进我们的报告/客户/中医/药食/AI 体系。
 *
 * 数据流：
 *   原系统测量 -> ReportC/ 输出 47 份 HTML 报告（每份含客户+时间+指标）
 *   -> 本服务按 (客户+时间) 分组 -> 创建 1 个检测记录 + 47 份报告
 *   -> 每份报告叠加我们的 TCM 体质 / 药食同源 / 调理方案 / AI 解读
 */

const ORIGIN_DIR = "C:\\Quantum Analyzer(13)";
const REPORT_DIR = path.join(ORIGIN_DIR, "ReportC");
const POLL_MS = 8000;

export interface ParsedReport {
  filename: string;
  category: string;           // 报告类别（如"心脑血管评估报告"）
  customer: { name: string; gender: number; age: number; heightCm: number; weightKg: number };
  measuredAt: Date;
  indicators: { name: string; range: string; value: string; severity: string }[];
}

@Injectable()
export class OriginalSystemService {
  private readonly logger = new Logger(OriginalSystemService.name);
  private pollTimer: any = null;
  private importHistory: { time: Date; result: any }[] = [];
  private lastFileSet = new Set<string>();

  constructor(@Inject("PRISMA_CLIENT") private readonly prisma: any) {}

  startPolling() {
    if (this.pollTimer) return;
    this.logger.log("原系统结果监听启动: " + REPORT_DIR);
    this.pollTimer = setInterval(() => this.pollNew(), POLL_MS);
  }
  stopPolling() { if (this.pollTimer) { clearInterval(this.pollTimer); this.pollTimer = null; } }

  /** 解析单个 HTML 报告文件 */
  parseHtml(content: string, filename: string): ParsedReport | null {
    try {
      const mName = /姓名[：:]([^<\s]+)/.exec(content);
      if (!mName) return null;
      const name = mName[1].trim();
      const gender = /性别[：:]([^<]+)/.test(content) ? (/性别[：:]([^<]+)/.exec(content)![1].includes("女") ? 2 : 1) : 1;
      const age = parseInt((/年龄[：:]([^<]+)/.exec(content)?.[1] || "30").replace(/\D/g, "")) || 30;
      const heightCm = parseInt((/身高[：:]([^<]+)/.exec(content)?.[1] || "170").replace(/\D/g, "")) || 170;
      const weightKg = parseFloat((/体重[：:]([^<]+)/.exec(content)?.[1] || "60").replace(/[^0-9.]/g, "")) || 60;

      // 检测时间（支持多种格式）
      const mDate = /(20\d{2})[-\/年](0?\d|1[0-2])[-\/月](0?\d|[12]\d|3[01])[日]?\s*([01]?\d|2[0-3])[：:时]([0-5]\d)/.exec(content);
      let measuredAt = new Date();
      if (mDate) {
        const y = mDate[1], mo = mDate[2].padStart(2, "0"), d = mDate[3].padStart(2, "0"), h = mDate[4].padStart(2, "0"), mi = mDate[5];
        measuredAt = new Date(`${y}-${mo}-${d}T${h}:${mi}:00`);
      }

      // 指标：检测项目 | 正常范围 | 实际测量值 | 检测结果
      const indRe = /<TD class=td align=middle>([^<]+)<\/TD><TD class=td align=middle>([^<]+)<\/TD><TD class=td align=middle>([^<]+)<\/TD><TD class=td align=middle>(?:<font color=[^>]+>)?([^<]+)(?:<\/font>)?<\/TD>/g;
      const indicators: any[] = [];
      let m: RegExpExecArray | null;
      while ((m = indRe.exec(content)) !== null) {
        indicators.push({ name: m[1].trim(), range: m[2].trim(), value: m[3].trim(), severity: m[4].trim() });
      }
      return { filename, category: filename.replace(/\.html$/i, ""), customer: { name, gender, age, heightCm, weightKg }, measuredAt, indicators };
    } catch (e) { return null; }
  }

  /** 找/创建客户（按姓名+性别+年龄+身高，防同名） */
  private async findOrCreateCustomer(c: ParsedReport["customer"], storeId: string) {
    let customer = await this.prisma.customer.findFirst({
      where: { name: c.name, gender: c.gender, age: c.age, heightCm: c.heightCm, storeId },
    });
    if (!customer) {
      customer = await this.prisma.customer.create({
        data: {
          name: c.name, gender: c.gender, age: c.age, heightCm: c.heightCm, weightKg: c.weightKg,
          phone: "原系统-" + Date.now(), storeId, source: "IMPORTED",
        },
      });
      this.logger.log("新建客户(原系统): " + customer.name);
    }
    return customer;
  }

  /** 由指标算评分（异常越多分越低） */
  private scoreFromIndicators(indicators: any[]): number {
    if (!indicators.length) return 75;
    const abnormal = indicators.filter(i => /异常/.test(i.severity)).length;
    return Math.max(40, Math.round(95 - abnormal * 3));
  }

  /** 融合 TCM/药食/调理（复用报告引擎逻辑的简化版，真实指标驱动） */
  private buildSuggestions(customer: any, indicators: any[]) {
    // 基于真实指标推算体质
    const findVal = (kw: string) => {
      const it = indicators.find(i => i.name.includes(kw));
      return it ? parseFloat(it.value) || 0 : 0;
    };
    const bodyFat = findVal("体脂");
    const water = findVal("水分");
    const bmi = customer.weightKg ? +(customer.weightKg / Math.pow((customer.heightCm || 170) / 100, 2)).toFixed(1) : 22;
    let tcm = { type: "平和质", description: "体形适中、气血调和，是较理想的体质类型。", traits: ["保持现状", "规律作息"] };
    if (bmi >= 28 || bodyFat >= 30) tcm = { type: "痰湿质", description: "形体肥胖、腹部松软、痰湿内蕴。", traits: ["代谢偏慢", "需化痰祛湿", "控糖控油"] };
    else if (bodyFat >= 25) tcm = { type: "湿热质", description: "面部油亮、口苦口干、内热偏盛。", traits: ["需清热利湿", "忌辛辣"] };
    else if (bmi < 18.5) tcm = { type: customer.gender === 1 ? "气虚质" : "阳虚质", description: "形体偏瘦、易疲乏、抵抗力弱。", traits: ["易疲劳", "建议温补"] };
    else if (water && water < 50) tcm = { type: "阴虚质", description: "口干咽燥、手足心热、睡眠不安。", traits: ["需滋阴润燥", "忌辛辣"] };

    const diet = {
      recommend: tcm.type === "痰湿质" ? ["薏米赤小豆粥", "冬瓜", "荷叶茶", "山楂", "白萝卜"] :
                tcm.type === "湿热质" ? ["绿豆汤", "苦瓜", "菊花茶", "薏米", "冬瓜"] :
                tcm.type === "阴虚质" ? ["银耳莲子羹", "麦冬茶", "百合", "玉竹", "鸭肉"] :
                tcm.type.includes("气虚") ? ["黄芪炖鸡", "山药粥", "红枣桂圆茶"] :
                tcm.type.includes("阳虚") ? ["当归生姜羊肉汤", "韭菜", "核桃"] : ["粗细搭配", "鱼禽蛋奶", "新鲜蔬果"],
      avoid: tcm.type === "痰湿质" ? ["甜食", "油炸", "肥肉"] :
             tcm.type === "湿热质" ? ["辛辣", "烟酒", "烧烤"] :
             tcm.type === "阴虚质" ? ["辛辣", "烧烤", "煎炸"] :
             tcm.type.includes("气虚") ? ["生冷瓜果", "浓茶"] :
             tcm.type.includes("阳虚") ? ["冰品", "寒凉水果"] : ["暴饮暴食", "过度饮酒"],
    };
    const conditioning = {
      tcmFormula: tcm.type === "痰湿质" ? "二陈汤合参苓白术散加减" :
                  tcm.type === "湿热质" ? "龙胆泻肝汤加减（短期）" :
                  tcm.type === "阴虚质" ? "六味地黄丸加减" :
                  tcm.type.includes("气虚") ? "四君子汤加减" :
                  tcm.type.includes("阳虚") ? "金匮肾气丸加减" : "平和体质，规律生活即可",
      exercise: ["快走 30 分钟/日", "八段锦", "太极"],
      lifestyle: ["保证 7-8 小时睡眠", "饮食七分饱", "保持心情愉悦"],
    };
    return { general: [], tcm, diet, conditioning };
  }

  /** 核心：一次测量的一组报告（同一客户+同一时间） */
  private async importGroup(reports: ParsedReport[], storeId: string): Promise<number> {
    const first = reports[0];
    const measuredAt = first.measuredAt instanceof Date ? first.measuredAt : new Date(first.measuredAt);
    const customer = await this.findOrCreateCustomer(first.customer, storeId);
    // 找/创建原系统设备记录（deviceId 是外键）
    let device = await this.prisma.device.findFirst({ where: { deviceNo: '原系统-V13' } });
    if (!device) {
      device = await this.prisma.device.create({ data: { deviceNo: '原系统-V13', vendor: 'Quantum', model: 'V13', storeId, status: 1, expiresAt: new Date('2099-12-31'), secret: 'original-system-v13' } });
    }
    // 创建检测记录
    const detection = await this.prisma.detection.create({
      data: {
        customerId: customer.id,
        deviceId: device.id,
        storeId,
        startedAt: measuredAt,
        finishedAt: measuredAt,
        durationSec: 60,
        status: 2,
        progress: 100,
        rawPayload: JSON.stringify({ source: "original-system-v13", files: reports.map(r => r.filename) }),
        remark: "原系统检测结果自动导入",
        
        nextCheckDate: new Date(measuredAt.getTime() + 30 * 86400000),
      },
    });
    await this.prisma.customer.update({
      where: { id: customer.id },
      data: { weightKg: first.customer.weightKg, lastDetectionAt: measuredAt },
    });

    // 每个文件 = 一份报告
    let imported = 0;
    for (const r of reports) {
      const exist = await this.prisma.report.findFirst({ where: { detectionId: detection.id, title: r.category } });
      if (exist) continue;
      const score = this.scoreFromIndicators(r.indicators);
      const abnormal = r.indicators.filter(i => /异常/.test(i.severity)).length;
      const suggestions = this.buildSuggestions(customer, r.indicators);
      await this.prisma.report.create({
        data: {
          detectionId: detection.id,
          customerId: customer.id,
          templateCode: "imported-" + r.category,
          title: r.category,
          score,
          conclusion: `${r.category}：共 ${r.indicators.length} 项指标，${abnormal} 项异常。由原系统真实检测数据导入，仅供参考，不作诊断依据。`,
          indicators: JSON.stringify(r.indicators),
          suggestions: JSON.stringify(suggestions),
          warnings: JSON.stringify(r.indicators.filter(i => /异常/.test(i.severity)).map(i => i.name + " 异常(实测 " + i.value + ", 标准 " + i.range + ")")),
          highlights: JSON.stringify(r.indicators.filter(i => !/异常/.test(i.severity)).slice(0, 5).map(i => i.name + " 正常(" + i.value + ")")),
          status: 1,
          isDemo: false,
        },
      });
      imported++;
    }
    return imported;
  }

  /** 全量扫描导入 */
  async scanAndImportAll(storeId?: string): Promise<any> {
    if (!fs.existsSync(REPORT_DIR)) return { scanned: 0, imported: 0, skipped: 0, errors: ["目录不存在"], details: [] };
    const sid = storeId || (await this.prisma.store.findFirst())?.id || (await this.prisma.store.create({ data: { code: "HEAD", name: "总部" } })).id;
    const files = fs.readdirSync(REPORT_DIR).filter(f => f.toLowerCase().endsWith(".html"));
    // 解析全部
    const parsed: ParsedReport[] = [];
    for (const f of files) {
      const content = fs.readFileSync(path.join(REPORT_DIR, f), "utf-8");
      const p = this.parseHtml(content, f);
      if (p && p.indicators.length) parsed.push(p);
    }
    // 按 客户名+测量时间(5分钟内) 分组
    const groups = new Map<string, ParsedReport[]>();
    for (const p of parsed) {
      const key = p.customer.name + "|" + p.customer.gender + "|" + p.customer.age + "|" + Math.floor(new Date(p.measuredAt).getTime() / 300000);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(p);
    }
    let imported = 0, skipped = 0;
    for (const [, group] of groups) {
      imported += await this.importGroup(group, sid);
    }
    const result = { scanned: parsed.length, imported, skipped, groups: groups.size, errors: [] };
    this.importHistory.unshift({ time: new Date(), result });
    if (this.importHistory.length > 20) this.importHistory.length = 20;
    return result;
  }

  /** 轮询新文件（原系统测完自动导入） */
  async pollNew(): Promise<{ imported: number }> {
    if (!fs.existsSync(REPORT_DIR)) return { imported: 0 };
    const files = fs.readdirSync(REPORT_DIR).filter(f => f.toLowerCase().endsWith(".html"));
    const current = new Set(files);
    const fresh = files.filter(f => !this.lastFileSet.has(f));
    this.lastFileSet = current;
    if (!fresh.length) return { imported: 0 };
    this.logger.log("检测到原系统新报告: " + fresh.length + " 份");
    const r = await this.scanAndImportAll();
    return { imported: r.imported || 0 };
  }

  /** 接收 Electron 本地解析好的报告数据（云端入库） */
  async importParsed(payload: { reports: ParsedReport[] }, storeId?: string) {
    const sid = storeId || (await this.prisma.store.findFirst())?.id || (await this.prisma.store.create({ data: { code: "HEAD", name: "总部" } })).id;
    const reports = payload?.reports || [];
    if (!reports.length) return { imported: 0, skipped: 0 };
    // 按客户+时间分组
    const groups = new Map<string, ParsedReport[]>();
    for (const p of reports) {
      const key = p.customer.name + "|" + p.customer.gender + "|" + p.customer.age + "|" + Math.floor(new Date(p.measuredAt).getTime() / 300000);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(p);
    }
    let imported = 0;
    for (const [, group] of groups) imported += await this.importGroup(group, sid);
    const result = { imported, groups: groups.size };
    this.importHistory.unshift({ time: new Date(), result: { ...result, scanned: reports.length } });
    return result;
  }

  getHistory() { return this.importHistory; }
  getStatus() {
    return {
      watchDir: REPORT_DIR,
      dirExists: fs.existsSync(REPORT_DIR),
      lastFiles: fs.existsSync(REPORT_DIR) ? fs.readdirSync(REPORT_DIR).filter(f => f.toLowerCase().endsWith(".html")).length : 0,
      polling: !!this.pollTimer,
      lastScanTime: new Date(),
    };
  }

  /** 启动原系统程序 */
  async launchOriginal() {
    const candidates = [
      path.join(ORIGIN_DIR, "Quantum_Analyzer.exe"),
      path.join("D:\\Tools\\Quantum Analyzer(13)", "Quantum_Analyzer.exe"),
    ];
    const exe = candidates.find(c => fs.existsSync(c));
    if (!exe) return { ok: false, error: "未找到原系统程序" };
    exec(`"${exe}"`, (err) => {
      if (err) this.logger.warn("原系统退出: " + err.message);
      else this.logger.log("原系统已启动");
      // 关闭后自动触发一次导入
      setTimeout(() => this.scanAndImportAll(), 1000);
    });
    return { ok: true, path: exe };
  }
}
