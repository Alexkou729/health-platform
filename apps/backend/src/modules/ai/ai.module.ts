import { Module } from '@nestjs/common';
import { AIController } from './ai.controller';
import { AIService } from './ai.service';
import { OpenAICompatService } from './providers/openai-compat.service';
import { AiSettingsService } from './ai-settings.service';

@Module({
  controllers: [AIController],
  providers: [AIService, AiSettingsService, OpenAICompatService],
  exports: [AIService, AiSettingsService],
})
export class AIModule {}
