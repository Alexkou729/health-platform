import { Injectable } from "@nestjs/common";
import axios from "axios";
import { BaseLLMProvider, ChatOptions } from "./base.provider";
@Injectable()
export class TongyiService extends BaseLLMProvider {
  async chat(prompt: string, options: ChatOptions = {}): Promise<string> { return this.call(prompt, options); }
  async chatWithMessages(messages: any[], options: ChatOptions = {}): Promise<string> { return this.callMessages(messages, options); }
  async *streamChat(prompt: string, options: ChatOptions = {}): AsyncIterable<string> { yield ""; }
  private async call(prompt: string, options: ChatOptions): Promise<string> { return "（请配置通义千问 API Key）建议保持健康生活方式"; }
  private async callMessages(messages: any[], options: ChatOptions): Promise<string> { return "（请配置通义千问 API Key）建议保持健康生活方式"; }
}