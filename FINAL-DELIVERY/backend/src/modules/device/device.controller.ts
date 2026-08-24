import { Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { DeviceService } from './device.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('device')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('devices')
export class DeviceController {
  constructor(private readonly service: DeviceService) {}

  @Get()
  @ApiOperation({ summary: '设备列表' })
  async list(@Query('page') page = 1, @Query('pageSize') pageSize = 20, @Query('storeId') storeId, @Query('status') status, @Query('keyword') keyword) {
    return this.service.list({ page: +page, pageSize: +pageSize, storeId, status: status !== undefined ? +status : undefined, keyword });
  }

  @Get('statistics')
  @ApiOperation({ summary: '设备统计' })
  async statistics() { return this.service.getStatistics(); }

  @Get(':id')
  @ApiOperation({ summary: '设备详情' })
  async findOne(@Param('id') id: string) { return this.service.findOne(id); }

  @Post()
  @ApiOperation({ summary: '新增设备' })
  async create(@Body() body: any) { return this.service.create(body); }

  @Put(':id')
  @ApiOperation({ summary: '更新设备' })
  async update(@Param('id') id: string, @Body() body: any) { return this.service.update(id, body); }

  @Delete(':id')
  @ApiOperation({ summary: '删除设备' })
  async remove(@Param('id') id: string) { return this.service.remove(id); }

  // 设备回调接口
  @Post('callback/heartbeat')
  @ApiOperation({ summary: '设备心跳' })
  async heartbeat(@Body() body: { deviceNo: string }) { return this.service.heartbeat(body.deviceNo); }

  @Post('callback/bind')
  @ApiOperation({ summary: '设备绑定' })
  async bind(@Body() body: { deviceNo: string; storeId: string; expiresAt?: string }) {
    return this.service.bind(body.deviceNo, body.storeId, body.expiresAt);
  }

  @Post('callback/progress/:detectionId')
  @ApiOperation({ summary: '设备上报检测进度' })
  async uploadProgress(@Param('detectionId') detectionId: string, @Body() body: any) {
    return this.service.uploadProgress(detectionId, body);
  }
}
