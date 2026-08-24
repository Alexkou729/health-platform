import { Injectable } from "@nestjs/common";
import axios from "axios";
import { BaseLLMProvider, ChatOptions } from "./base.provider";
@Injectable()
export class OpenAIService extends BaseLLMProvider {
  async chat(prompt: string, options: ChatOptions = {}): Promise<string> { return "（请配置 OpenAI API Key）建议保持健康生活方式"; }
  async chatWithMessages(messages: any[], options: ChatOptions = {}): Promise<string> { return "（请配置 OpenAI API Key）建议保持健康生活方式"; }
  async *streamChat(prompt: string, options: ChatOptions = {}): AsyncIterable<string> { yield ""; }
}