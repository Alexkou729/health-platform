import { Controller, Get, Param, Post, Query, UseGuards, Res, Delete } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { ReportService } from './report.service';
import { ReportRenderer } from './report.renderer';
import { ReportEngine } from './report.engine';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';

@ApiTags('report')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermission('reports')
@Controller('reports')
export class ReportController {
  constructor(
    private readonly service: ReportService,
    private readonly renderer: ReportRenderer,
    private readonly engine: ReportEngine,
  ) {}

  @Get()
  @ApiOperation({ summary: '报告列表' })
  async list(
    @Query('page') page = 1, @Query('pageSize') pageSize = 20,
    @Query('customerId') customerId, @Query('templateCode') templateCode,
    @Query('status') status, @Query('startDate') startDate, @Query('endDate') endDate,
    @Query('storeId') storeId,
  ) {
    return this.service.list({
      page: +page, pageSize: +pageSize, customerId, templateCode,
      status: status !== undefined ? +status : undefined, startDate, endDate, storeId,
    });
  }

  @Get('templates')
  @ApiOperation({ summary: '检测种类模板（性别/年龄适用性）' })
  async templates() {
    return this.engine.getTemplates();
  }

  @Get('statistics')
  @ApiOperation({ summary: '报告统计' })
  async statistics() {
    return this.service.getStatistics();
  }

  @Get('comparison/:customerId')
  @ApiOperation({ summary: '历史对比' })
  async comparison(@CurrentUser() user: any, @Param('customerId') customerId, @Query('templateCode') templateCode) {
    return this.service.getComparison(customerId, templateCode, user);
  }

  @Get(':id')
  @ApiOperation({ summary: '报告详情' })
  async findOne(@CurrentUser() user: any, @Param('id') id: string) {
    return this.service.findOne(id, user);
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除报告' })
  async remove(@CurrentUser() user: any, @Param('id') id: string) {
    return this.service.remove(id, user);
  }

  @Post(':id/send')
  @ApiOperation({ summary: '发送报告给客户（生成分享链接）' })
  async send(@Param('id') id: string) {
    return this.service.getShareUrl(id);
  }

  @Get(':id/html')
  @ApiOperation({ summary: '在线报告 H5' })
  async html(@Param('id') id: string, @Res() res: Response) {
    const report = await this.service.findOne(id);
    const html = await this.renderer.renderHtml(report);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  }

  @Get(':id/pdf')
  @ApiOperation({ summary: '下载 PDF' })
  async pdf(@Param('id') id: string, @Res() res: Response) {
    const report = await this.service.findOne(id);
    const pdfBuffer = await this.renderer.renderPdf(report);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="report-' + report.id + '.pdf"');
    res.send(pdfBuffer);
  }
}
