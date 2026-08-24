import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { DetectionService } from './detection.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('detection')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('detections')
export class DetectionController {
  constructor(private readonly service: DetectionService) {}

  @Get()
  @ApiOperation({ summary: '检测列表' })
  async list(
    @Query('page') page = 1, @Query('pageSize') pageSize = 20,
    @Query('customerId') customerId, @Query('deviceId') deviceId,
    @Query('staffId') staffId, @Query('storeId') storeId,
    @Query('status') status, @Query('keyword') keyword,
    @Query('startDate') startDate, @Query('endDate') endDate,
  ) {
    return this.service.list({
      page: +page, pageSize: +pageSize, customerId, deviceId, staffId, storeId,
      status: status !== undefined ? +status : undefined,
      keyword, startDate, endDate,
    });
  }

  @Get('statistics')
  @ApiOperation({ summary: '检测统计' })
  async statistics(@Query('storeId') storeId) {
    return this.service.getStatistics(storeId);
  }

  @Post()
  @ApiOperation({ summary: '开始检测' })
  async start(@Body() body) {
    return this.service.startDetection(body);
  }

  @Post(':id/complete')
  @ApiOperation({ summary: '完成检测' })
  async complete(@Param('id') id, @Body() body) {
    return this.service.completeDetection(id, body);
  }

  @Post(':id/cancel')
  @ApiOperation({ summary: '取消检测' })
  async cancel(@Param('id') id, @Body() body) {
    return this.service.cancelDetection(id, body?.reason);
  }

  @Get(':id')
  @ApiOperation({ summary: '检测详情' })
  async findOne(@Param('id') id) {
    return this.service.findOne(id);
  }
}
