import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { DetectionService } from './detection.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { StartDetectionDto, CompleteDetectionDto } from './dto/detection.dto';

@ApiTags('detection')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermission('detection')
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
  async start(@CurrentUser() user: any, @Body() body: StartDetectionDto) {
    return this.service.startDetection(body, user);
  }

  @Post(':id/complete')
  @ApiOperation({ summary: '完成检测' })
  async complete(@CurrentUser() user: any, @Param('id') id, @Body() body: CompleteDetectionDto) {
    return this.service.completeDetection(id, body, user);
  }

  @Post(':id/cancel')
  @ApiOperation({ summary: '取消检测' })
  async cancel(@CurrentUser() user: any, @Param('id') id, @Body() body) {
    return this.service.cancelDetection(id, body?.reason, user);
  }

  @Get(':id')
  @ApiOperation({ summary: '检测详情' })
  async findOne(@CurrentUser() user: any, @Param('id') id) {
    return this.service.findOne(id, user);
  }
  @Post('import')
  @ApiOperation({ summary: '导入原版软件检测报告（真实数据）' })
  async import(@CurrentUser() user: any, @Body() body: any) {
    return this.service.importReports(user, body);
  }
}
