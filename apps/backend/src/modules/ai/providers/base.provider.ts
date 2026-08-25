import { Logger } from "@nestjs/common";
export interface ChatOptions { temperature?: number; maxTokens?: number; model?: string; systemPrompt?: string; responseFormat?: 'json_object' | 'text'; }
export abstract class BaseLLMProvider {
  protected readonly logger = new Logger(this.constructor.name);
  abstract chat(prompt: string, options?: ChatOptions): Promise<string>;
  abstract chatWithMessages(messages: any[], options?: ChatOptions): Promise<string>;
  abstract streamChat(prompt: string, options?: ChatOptions): AsyncIterable<string>;
  protected buildSystemPrompt() { return "你是健康管理系统中的 AI 健康管理助手，专注于中医体质分析和健康咨询。回答必须基于医学常识，对于不确定的医学建议提醒用户咨询专业医师。"; }
}