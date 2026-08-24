import { Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { DeviceService } from './device.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';

@ApiTags('device')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermission('devices')
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
  async findOne(@CurrentUser() user: any, @Param('id') id: string) { return this.service.findOne(id, user); }

  @Post()
  @ApiOperation({ summary: '新增设备' })
  async create(@CurrentUser() user: any, @Body() body: any) { return this.service.create(body, user); }

  @Put(':id')
  @ApiOperation({ summary: '更新设备' })
  async update(@CurrentUser() user: any, @Param('id') id: string, @Body() body: any) { return this.service.update(id, body, user); }

  @Delete(':id')
  @ApiOperation({ summary: '删除设备' })
  async remove(@CurrentUser() user: any, @Param('id') id: string) { return this.service.remove(id, user); }

  // 设备绑定（由桌面端/HQ 调用，JWT 鉴权，绑定后返回设备密钥供设备签名使用）
  @Post('bind')
  @ApiOperation({ summary: '绑定设备' })
  async bind(@Body() body: { deviceNo: string; storeId: string; expiresAt?: string }) {
    return this.service.bind(body.deviceNo, body.storeId, body.expiresAt);
  }
}
