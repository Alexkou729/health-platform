import { Body, Controller, ForbiddenException, Get, Param, Post, Query, Req, Res, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { AIService, AIProvider } from './ai.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('ai')
@ApiBearerAuth()
@Controller('ai')
export class AIController {
  constructor(private readonly aiService: AIService) {}

  private assertHeadOffice(req: Request) {
    const user = (req as any)?.user;
    if (user?.role !== 'SUPER_ADMIN') throw new ForbiddenException('仅总部可调用 AI 解读，门店请通过服务申请提交');
  }

  @Post('interpret/:reportId')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'AI 解读报告' })
  async interpret(@Req() req: Request, @Param('reportId') reportId: string, @Body() body: any) {
    this.assertHeadOffice(req);
    return this.aiService.interpretReport(reportId, { provider: body?.provider });
  }

  @Post('interpret-batch')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '批量解读报告' })
  async interpretBatch(@Req() req: Request, @Body() body: { reportIds: string[]; provider?: AIProvider }) {
    this.assertHeadOffice(req);
    return this.aiService.batchInterpret(body.reportIds, body.provider);
  }

  @Get('interpret/:reportId/stream')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'SSE 流式解读' })
  async interpretStream(@Param('reportId') reportId: string, @Query('provider') provider: AIProvider, @Req() req: Request, @Res() res: Response) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    try {
      for await (const chunk of this.aiService.interpretReportStream(reportId, provider || 'tongyi')) {
        res.write('data: ' + JSON.stringify({ content: chunk }) + '\n\n');
      }
      res.write('data: [DONE]\n\n');
      res.end();
    } catch (e: any) {
      res.write('data: ' + JSON.stringify({ error: e.message }) + '\n\n');
      res.end();
    }
  }

  @Post('chat')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'AI 健康咨询对话' })
  async chat(@Req() req: Request, @Body() body: { messages: any[]; provider?: AIProvider }) {
    this.assertHeadOffice(req);
    const reply = await this.aiService.chat(body.messages, body.provider);
    return { reply };
  }
}
