import { Controller, Get, Param, Res } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { ReportService } from './report.service';
import { ReportRenderer } from './report.renderer';

/**
 * 公开报告页（客户免登录查看）
 * 通过分享令牌访问：/api/public/reports/:id/:shareToken
 */
@ApiTags('public-report')
@Controller('public/reports')
export class ReportPublicController {
  constructor(
    private readonly service: ReportService,
    private readonly renderer: ReportRenderer,
  ) {}

  @Get(':id/:shareToken')
  async html(@Param('id') id: string, @Param('shareToken') shareToken: string, @Res() res: Response) {
    const report = await this.service.findPublic(id, shareToken);
    const html = await this.renderer.renderHtml(report);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  }
}
