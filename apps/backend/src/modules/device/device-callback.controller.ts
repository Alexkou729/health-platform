import { Body, Controller, Param, Post, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { DeviceService } from './device.service';
import { DeviceAuthGuard } from '../../common/guards/device-auth.guard';

/**
 * 设备直连回调（网络模式设备）：独立设备鉴权，不需要 JWT
 */
@ApiTags('device-callback')
@UseGuards(DeviceAuthGuard)
@Controller('devices/callback')
export class DeviceCallbackController {
  constructor(private readonly service: DeviceService) {}

  @Post('heartbeat')
  @ApiOperation({ summary: '设备心跳' })
  async heartbeat(@Body() body: { deviceNo: string }) {
    return this.service.heartbeat(body.deviceNo);
  }

  @Post('progress/:detectionId')
  @ApiOperation({ summary: '设备上报检测进度' })
  async uploadProgress(@Param('detectionId') detectionId: string, @Body() body: any) {
    return this.service.uploadProgress(detectionId, body);
  }
}
