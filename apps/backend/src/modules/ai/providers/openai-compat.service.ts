import { Injectable } from '@nestjs/common';
import axios from 'axios';
import { BaseLLMProvider, ChatOptions } from './base.provider';
import { AiSettingsService } from '../ai-settings.service';

/**
 * 通用 OpenAI 兼容大模型服务
 * 支持：千问(DashScope)、豆包(火山方舟)、Kimi(Moonshot)、MiniMax、DeepSeek、智谱、蚂蚁百灵等
 * 所有厂商均提供 /chat/completions 兼容端点，统一调用。
 * 实际 baseUrl / model / apiKey 由总部在“系统设置 - AI 接口配置”中填写，存于 SystemConfig。
 */
@Injectable()
export class OpenAICompatService extends BaseLLMProvider {
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
      return `（尚未配置 ${this.providerLabel(cfg.provider)} API Key）请在“系统设置 → AI 接口配置”中填写后可正常解读报告。`;
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
          timeout: 90000,
          proxy: false, // AI 供应商国内直连，绕过服务器代理
        },
      );
      const content = res.data?.choices?.[0]?.message?.content;
      if (!content) throw new Error('模型未返回内容: ' + JSON.stringify(res.data?.error || res.data).slice(0, 200));
      return content;
    } catch (e: any) {
      const msg = e?.response?.data?.error?.message || e?.response?.data?.message || e?.message || String(e);
      this.logger.error(`模型调用失败 [${cfg.provider}]: ` + msg);
      throw new Error(`${this.providerLabel(cfg.provider)}调用失败: ` + msg);
    }
  }

  private providerLabel(provider: string): string {
    const map: Record<string, string> = {
      qwen: '通义千问',
      doubao: '豆包',
      kimi: 'Kimi',
      minimax: 'MiniMax',
      deepseek: 'DeepSeek',
      zhipu: '智谱',
      'ant-ling': '蚂蚁百灵',
      tongyi: '通义千问',
      openai: 'OpenAI',
    };
    return map[provider] || provider || '大模型';
  }
}
