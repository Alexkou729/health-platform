import { Injectable } from '@nestjs/common';
import axios from 'axios';
import { BaseLLMProvider, ChatOptions } from './base.provider';
import { AiSettingsService } from '../ai-settings.service';

/**
 * 蚂蚁百灵大模型（蚂蚁阿福 / 蚂蚁医疗大模型底座）
 * OpenAI 兼容协议，默认端点 https://api.ant-ling.com/v1
 * 环境变量：
 *   ANT_LING_API_KEY   - 必填
 *   ANT_LING_BASE_URL  - 默认 https://api.ant-ling.com/v1
 *   ANT_LING_MODEL     - 默认 Ling-max-2.0（医疗场景可换蚂蚁医疗大模型）
 */
@Injectable()
export class AntLingService extends BaseLLMProvider {
  constructor(private readonly settings: AiSettingsService) { super(); }

  async chat(prompt: string, options: ChatOptions = {}): Promise<string> {
    return this.call([{ role: 'user', content: prompt }], options);
  }

  async chatWithMessages(messages: any[], options: ChatOptions = {}): Promise<string> {
    return this.call(messages, options);
  }

  async *streamChat(prompt: string, options: ChatOptions = {}): AsyncIterable<string> {
    const text = await this.call([{ role: 'user', content: prompt }], options);
    yield text;
  }

  private async call(messages: any[], options: ChatOptions): Promise<string> {
    const cfg = await this.settings.get();
    const baseURL = (cfg.baseUrl || '').replace(/\/+$/, '');
    if (!cfg.apiKey) {
      return '（请配置蚂蚁百灵 ANT_LING_API_KEY）建议保持健康生活方式';
    }
    try {
      const res = await axios.post(
        baseURL + '/chat/completions',
        {
          model: options.model || cfg.model,
          messages: [{ role: 'system', content: this.buildSystemPrompt() }, ...messages],
          temperature: options.temperature ?? 0.4,
          max_tokens: options.maxTokens || 2000,
        },
        {
          headers: { Authorization: 'Bearer ' + cfg.apiKey, 'Content-Type': 'application/json' },
          timeout: 60000,
        },
      );
      return res.data?.choices?.[0]?.message?.content || '';
    } catch (e: any) {
      this.logger.error('蚂蚁百灵调用失败: ' + (e.message || e));
      throw new Error('蚂蚁百灵调用失败: ' + (e.message || e));
    }
  }
}
