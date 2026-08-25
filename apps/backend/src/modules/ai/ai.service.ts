import { Inject, Injectable, Logger } from '@nestjs/common';
import { OpenAICompatService } from './providers/openai-compat.service';
import { AiSettingsService } from './ai-settings.service';

export type AIProvider = 'qwen' | 'doubao' | 'kimi' | 'minimax' | 'deepseek' | 'zhipu' | 'ant-ling' | 'tongyi' | 'openai' | 'afu';

@Injectable()
export class AIService {
  private readonly logger = new Logger(AIService.name);
  constructor(
    @Inject('PRISMA_CLIENT') private readonly prisma: any,
    private readonly llm: OpenAICompatService,
    private readonly settings: AiSettingsService,
  ) {}

  async interpretReport(reportId: string, options: { provider?: AIProvider } = {}) {
    const report = await this.prisma.report.findUnique({ where: { id: reportId }, include: { detection: { include: { customer: true } } } });
    if (!report) throw new Error('报告不存在');
    return this.generateInterpretation(this.parseReportForAI(report), options);
  }

  /**
   * 结构化 JSON 解读：返回固定 schema，供报告生成器直接消费，
   * 并落库到 AIInterpretation.advice（JSON）。
   */
  async interpretReportStructured(reportId: string, options: { provider?: AIProvider } = {}) {
    const report = await this.prisma.report.findUnique({ where: { id: reportId }, include: { detection: { include: { customer: true } } } });
    if (!report) throw new Error('报告不存在');
    const cfg = await this.settings.get();
    const provider = options.provider || (cfg.provider as AIProvider) || 'minimax';
    const prompt = this.buildStructuredPrompt(this.parseReportForAI(report));
    const startTime = Date.now();
    try {
      const structured = await this.getProvider(provider).chatJSON(prompt, { temperature: 0.3, maxTokens: 5000 });
      const duration = Date.now() - startTime;
      const storeId = report.detection?.storeId || report.customer?.storeId || null;
      let interpretationId: string | null = null;
      if (storeId && report.customerId) {
        const saved = await this.prisma.aIInterpretation.create({
          data: {
            reportId: report.id,
            customerId: report.customerId,
            storeId,
            provider,
            type: 'AI',
            status: 'COMPLETED',
            content: JSON.stringify(structured),
            summary: String(structured?.overallAssessment || '').slice(0, 200),
            advice: JSON.stringify({ structured }),
            durationMs: duration,
          },
        }).catch(() => null);
        interpretationId = saved?.id || null;
      }
      return { reportId: report.id, provider, duration, structured, interpretationId, cached: false };
    } catch (e: any) {
      this.logger.error('AI 结构化解读失败 [' + provider + ']:', e.message);
      throw new Error('AI 结构化解读失败: ' + e.message);
    }
  }

  async *interpretReportStream(reportId: string, provider: AIProvider = 'minimax') {
    const report = await this.prisma.report.findUnique({ where: { id: reportId }, include: { detection: { include: { customer: true } } } });
    if (!report) throw new Error('报告不存在');
    const prompt = this.buildPrompt(this.parseReportForAI(report));
    const stream = this.getProvider(provider).streamChat(prompt);
    for await (const chunk of stream) yield chunk;
  }

  async batchInterpret(reportIds: string[], provider: AIProvider = 'minimax') {
    const reports = await this.prisma.report.findMany({ where: { id: { in: reportIds } }, include: { detection: { include: { customer: true } } } });
    const prompt = this.buildBatchPrompt(reports.map((r) => this.parseReportForAI(r)));
    return this.getProvider(provider).chat(prompt, { temperature: 0.5, maxTokens: 2000 });
  }

  async chat(messages: Array<{ role: string; content: string }>, provider: AIProvider = 'minimax') {
    return this.getProvider(provider).chatWithMessages(messages, { temperature: 0.7 });
  }

  async generateCarePlan(customerId: string, provider?: AIProvider) {
    const customer = await this.prisma.customer.findUnique({ where: { id: customerId } });
    if (!customer) throw new Error('客户不存在');
    const latestReport = await this.prisma.report.findFirst({
      where: { customerId },
      orderBy: { createdAt: 'desc' },
    });
    const cfg = await this.settings.get();
    const p = provider || (cfg.provider as AIProvider) || 'minimax';
    const prompt = this.buildCarePlanPrompt(customer, latestReport);
    try {
      const content = await this.getProvider(p).chat(prompt, { temperature: 0.4, maxTokens: 1200 });
      return { customerId, provider: p, plan: content };
    } catch (e: any) {
      this.logger.error('调理方案生成失败 [' + p + ']:', e.message);
      throw new Error('调理方案生成失败: ' + e.message);
    }
  }

  private async generateInterpretation(report: any, options: { provider?: AIProvider }) {
    const cfg = await this.settings.get();
    const provider = options.provider || (cfg.provider as AIProvider) || 'minimax';
    const prompt = this.buildPrompt(report);
    const startTime = Date.now();
    try {
      const interpretation = await this.getProvider(provider).chat(prompt, { temperature: 0.4, maxTokens: 1500 });
      const duration = Date.now() - startTime;
      const storeId = report.detection?.storeId || report.customer?.storeId || null;
      let interpretationId: string | null = null;
      if (storeId && report.customerId) {
        const saved = await this.prisma.aIInterpretation.create({
          data: {
            reportId: report.id,
            customerId: report.customerId,
            storeId,
            provider,
            type: 'AI',
            status: 'COMPLETED',
            content: interpretation,
            summary: interpretation.slice(0, 200),
            durationMs: duration,
          },
        }).catch(() => null);
        interpretationId = saved?.id || null;
      }
      return { reportId: report.id, provider, duration, interpretation, interpretationId, cached: false };
    } catch (e: any) {
      this.logger.error('AI 解读失败 [' + provider + ']:', e.message);
      throw new Error('AI 解读服务暂时不可用: ' + e.message);
    }
  }

  private getProvider(provider: AIProvider) {
    return this.llm;
  }

  private parseReportForAI(r: any) {
    if (!r) return r;
    for (const key of ['indicators', 'suggestions', 'warnings', 'highlights']) {
      if (typeof r[key] === 'string') {
        try { r[key] = JSON.parse(r[key]); } catch { r[key] = []; }
      }
    }
    r.customer = r.detection?.customer || null;
    return r;
  }

  /** 结构化报告生成提示词（返回固定 JSON schema） */
  private buildStructuredPrompt(report: any): string {
    const customer = report.customer;
    const indicators = (report.indicators || []).filter((i: any) => i.status >= 1);
    const constitutionMap: Record<string, string> = {
      BALANCED: '平和质', QI_DEFICIENCY: '气虚质', YANG_DEFICIENCY: '阳虚质',
      YIN_DEFICIENCY: '阴虚质', PHLEGM_DAMPNESS: '痰湿质', DAMPNESS_HEAT: '湿热质',
      BLOOD_STASIS: '血瘀质', QI_STAGNATION: '气郁质', SPECIAL: '特禀质',
    };
    let tags: string[] = [];
    try { tags = JSON.parse(customer?.tags || '[]'); } catch {}
    const constitution = constitutionMap[tags[0]] || '未知';
    const indicatorText = indicators.map((i: any) => '- ' + i.name + ': ' + i.value + i.unit + ' (标准 ' + i.referenceRange + i.unit + ') [' + this.statusText(i.status) + ']').join('\n') || '无明显异常';
    return '你是一位资深中医健康管理师。请根据以下检测数据，输出 JSON 格式的健康评估与调理方案。\n\n' +
      '【客户信息】\n姓名：' + (customer?.name || '客户') + '；性别：' + (customer?.gender === 1 ? '男' : customer?.gender === 2 ? '女' : '未知') + '；年龄：' + (customer?.age || '未知') + '岁\n\n' +
      '【检测报告】\n报告类型：' + report.title + '\n综合评分：' + report.score + '分\n体质：' + constitution + '\n\n' +
      '【异常指标】\n' + indicatorText + '\n\n' +
      '【原始结论】\n' + (report.conclusion || '无') + '\n\n' +
      '请严格按以下 JSON schema 输出（不要输出任何额外文字，只输出 JSON 对象）：\n' +
      JSON.stringify({
        overallAssessment: '整体评估(150-200字，通俗总结身体状态)',
        constitutionAnalysis: '体质解读(200-300字，中医角度讲特征/成因/影响)',
        keyFindings: ['3-5条关键发现'],
        risks: [{ indicator: '异常指标名', level: '高|中|低', advice: '针对性建议' }],
        diet: [{ item: '食物', type: '宜|忌', reason: '原因' }],
        exercise: [{ type: '运动类型', intensity: '强度', frequency: '频率', duration: '时长' }],
        lifestyle: ['3条生活作息建议'],
        meridians: [{ name: '穴位名', method: '按摩方法' }],
        therapies: [{ name: '理疗项目', frequency: '频次' }],
        followUp: { days: 30, watchIndicators: ['重点观察指标'] }
      }, null, 2);
  }

  private buildPrompt(report: any): string {
    const customer = report.customer;
    const indicators = (report.indicators || []).filter((i: any) => i.status >= 1);
    const constitutionMap: Record<string, string> = {
      BALANCED: '平和质', QI_DEFICIENCY: '气虚质', YANG_DEFICIENCY: '阳虚质',
      YIN_DEFICIENCY: '阴虚质', PHLEGM_DAMPNESS: '痰湿质', DAMPNESS_HEAT: '湿热质',
      BLOOD_STASIS: '血瘀质', QI_STAGNATION: '气郁质', SPECIAL: '特禀质',
    };
    const constitution = constitutionMap[(Array.isArray(customer?.tags) ? customer.tags[0] : customer?.tags) || ''] || '未知';
    const indicatorText = indicators.map((i: any) => `- ${i.name}: ${i.value}${i.unit} (标准: ${i.referenceRange}${i.unit}) [${this.statusText(i.status)}]`).join('\n') || '无明显异常';

    return `你是一位资深中医健康管理师。请根据以下检测数据，为客户提供专业的体质分析和个性化养生建议。

【客户信息】
姓名：${customer?.name || '客户'}
性别：${customer?.gender === 1 ? '男' : customer?.gender === 2 ? '女' : '未知'}
年龄：${customer?.age || '未知'}岁

【检测结果】
报告类型：${report.title}
综合评分：${report.score} 分
体质类型：${constitution}

【异常指标】
${indicatorText}

【原始结论】
${report.conclusion || '无'}

【请输出以下内容（不要包含任何额外说明）】
1. **整体评估**（200字）：用通俗语言总结客户当前身体状态
2. **体质深度解读**（300字）：从中医角度详细解释该体质的特征、形成原因、对健康的影响
3. **重点关注**（100字）：针对异常指标说明可能存在的健康风险
4. **饮食调理**（5条具体建议）：宜吃什么、忌什么、给出具体食谱示例
5. **运动调理**（3条建议）：适合的运动类型、强度、频率
6. **生活作息**（3条建议）：睡眠、情绪、季节调养
7. **经络穴位**（2个推荐穴位 + 按摩方法）：可日常保健的穴位
8. **推荐理疗**（3项）：适合的养生项目
9. **复检建议**：建议多少天后复检，重点观察哪些指标

要求：
- 语言温和专业，避免医学术语堆砌
- 给出可执行的具体方案，不要泛泛而谈
- 总字数控制在 800-1200 字`;
  }

  private buildBatchPrompt(reports: any[]): string {
    return `请对以下 ${reports.length} 份检测报告进行批量解读分析，重点关注共性问题和调理优先级排序。\n\n${reports.map((r, i) => `${i + 1}. ${r.customer?.name}: ${r.title}, 评分 ${r.score}, 异常 ${(r.indicators || []).filter((x: any) => x.status >= 3).length} 项`).join('\n')}\n\n请输出：\n1. 共性健康问题分析\n2. 优先调理建议（按紧急程度排序）\n3. 团体养生方案建议`;
  }

  private buildCarePlanPrompt(customer: any, report: any): string {
    const constitutionMap: Record<string, string> = {
      BALANCED: '平和质', QI_DEFICIENCY: '气虚质', YANG_DEFICIENCY: '阳虚质',
      YIN_DEFICIENCY: '阴虚质', PHLEGM_DAMPNESS: '痰湿质', DAMPNESS_HEAT: '湿热质',
      BLOOD_STASIS: '血瘀质', QI_STAGNATION: '气郁质', SPECIAL: '特禀质',
    };
    let tags: string[] = [];
    try { tags = JSON.parse(customer.tags || '[]'); } catch {}
    const constitution = constitutionMap[tags[0]] || '待确认';
    return `你是一位资深中医健康管理师。请为客户制定一份可执行的个性化调理方案。\n\n【客户信息】\n姓名：${customer.name}，性别：${customer.gender === 1 ? '男' : customer.gender === 2 ? '女' : '未知'}，年龄：${customer.age || '未知'}岁\n体质：${constitution}\n\n【最近报告】\n${report ? '评分：' + report.score + '分\n结论：' + (report.conclusion || '无') : '暂无检测报告'}\n\n请输出：\n1. 调理目标（50字）\n2. 调理原则（100字）\n3. 饮食方案（5条）\n4. 运动方案（3条）\n5. 生活作息（3条）\n6. 推荐理疗项目（3项，含频次）\n7. 建议调理周期（多少天，几个疗程）\n要求：具体可执行，避免空泛。`;
  }

  private statusText(status: number) {
    return ['正常', '偏高', '偏低', '过高', '过低', '危险'][status] || '未知';
  }
}
