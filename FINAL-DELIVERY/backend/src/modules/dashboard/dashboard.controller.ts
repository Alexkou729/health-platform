import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('dashboard')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly service: DashboardService) {}

  @Get('overview')
  @ApiOperation({ summary: '运营概览' })
  async overview(@Query('storeId') storeId) { return this.service.overview(storeId); }

  @Get('trend')
  @ApiOperation({ summary: '趋势数据' })
  async trend(@Query('days') days = 7, @Query('storeId') storeId) { return this.service.trend(+days, storeId); }

  @Get('constitution')
  @ApiOperation({ summary: '体质分布' })
  async constitution() { return this.service.constitutionDistribution(); }

  @Get('hot-reports')
  @ApiOperation({ summary: '热门报告' })
  async hotReports(@Query('limit') limit = 10) { return this.service.hotReports(+limit); }
}
