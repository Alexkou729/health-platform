import { Inject, Injectable } from '@nestjs/common';

/**
 * AI 接口配置（总台专属）
 * 配置存储在 SystemConfig 表，门店无任何读取/写入权限。
 * 环境变量仅作为兜底默认值。
 */
@Injectable()
export class AiSettingsService {
  constructor(@Inject('PRISMA_CLIENT') private readonly prisma: any) {}

  /** 可供总部选择的大模型供应商（均为 OpenAI 兼容协议） */
  listProviders() {
    return [
      { code: 'qwen', label: '通义千问（阿里云百炼）', baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1', model: 'qwen-plus' },
      { code: 'doubao', label: '豆包（火山方舟）', baseUrl: 'https://ark.cn-beijing.volces.com/api/v3', model: 'doubao-seed-1-6-250615' },
      { code: 'kimi', label: 'Kimi（月之暗面）', baseUrl: 'https://api.moonshot.cn/v1', model: 'kimi-k2-0711-preview' },
      { code: 'minimax', label: 'MiniMax', baseUrl: 'https://api.minimaxi.com/v1', model: 'MiniMax-M3' },
      { code: 'deepseek', label: 'DeepSeek（深度求索）', baseUrl: 'https://api.deepseek.com/v1', model: 'deepseek-chat' },
      { code: 'zhipu', label: '智谱 GLM', baseUrl: 'https://open.bigmodel.cn/api/paas/v4', model: 'glm-4.5' },
      { code: 'ant-ling', label: '蚂蚁百灵（蚂蚁阿福）', baseUrl: 'https://api.ant-ling.com/v1', model: 'Ling-3.0-flash' },
    ];
  }

  private defaultsOf(provider: string) {
    switch (provider) {
      case 'qwen':
      case 'tongyi':
        return { baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1', model: 'qwen-plus' };
      case 'doubao':
        return { baseUrl: 'https://ark.cn-beijing.volces.com/api/v3', model: 'doubao-seed-1-6-250615' };
      case 'kimi':
        return { baseUrl: 'https://api.moonshot.cn/v1', model: 'kimi-k2-0711-preview' };
      case 'minimax':
        return {
          baseUrl: process.env.MINIMAX_BASE_URL || 'https://api.minimaxi.com/v1',
          model: process.env.MINIMAX_MODEL || 'MiniMax-M3',
        };
      case 'ant-ling':
        return {
          baseUrl: process.env.ANT_LING_BASE_URL || 'https://api.ant-ling.com/v1',
          model: process.env.ANT_LING_MODEL || 'Ling-3.0-flash',
        };
      case 'deepseek':
        return { baseUrl: 'https://api.deepseek.com/v1', model: 'deepseek-chat' };
      case 'zhipu':
        return { baseUrl: 'https://open.bigmodel.cn/api/paas/v4', model: 'glm-4.5' };
      default:
        return { baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1', model: 'qwen-plus' };
    }
  }

  async get() {
    const rows = await this.prisma.systemConfig.findMany({
      where: { key: { in: ['ai.provider', 'ai.baseUrl', 'ai.model', 'ai.apiKey'] } },
    });
    const map: Record<string, string> = {};
    for (const r of rows) map[r.key] = r.value;
    const provider = map['ai.provider'] || process.env.DEFAULT_AI_PROVIDER || 'minimax';
    const d = this.defaultsOf(provider);
    return {
      provider,
      baseUrl: map['ai.baseUrl'] || d.baseUrl,
      model: map['ai.model'] || d.model,
      apiKey: map['ai.apiKey'] || process.env.MINIMAX_API_KEY || process.env.ANT_LING_API_KEY || '',
    };
  }

  async set(data: any) {
    const entries = [
      ['ai.provider', data?.provider],
      ['ai.baseUrl', data?.baseUrl],
      ['ai.model', data?.model],
      ['ai.apiKey', data?.apiKey],
    ].filter(([, v]) => v !== undefined && v !== null && v !== '');
    for (const [key, value] of entries) {
      await this.prisma.systemConfig.upsert({
        where: { key },
        update: { value: String(value) },
        create: { key, value: String(value) },
      });
    }
    return this.get();
  }
}
