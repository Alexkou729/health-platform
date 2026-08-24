import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SettlementService } from './settlement.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('settlement')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermission('franchise')
@Controller('settlements')
export class SettlementController {
  constructor(private readonly service: SettlementService) {}

  @Get()
  @ApiOperation({ summary: '门店结算比例列表' })
  list(@CurrentUser() user: any) { return this.service.list(user); }

  @Post()
  @ApiOperation({ summary: '设置门店结算比例' })
  set(@CurrentUser() user: any, @Body() body: { storeId: string; ratio: number; remark?: string }) {
    return this.service.set(user, body.storeId, body.ratio, body.remark);
  }
}
