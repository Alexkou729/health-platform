import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { MallOrderService } from './mall-order.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('mall-order')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermission('marketing')
@Controller('mall-orders')
export class MallOrderController {
  constructor(private readonly service: MallOrderService) {}

  @Get()
  list(@CurrentUser() user: any, @Query() q: any) { return this.service.list(user, q); }

  @Post(':id/accept')
  accept(@CurrentUser() user: any, @Param('id') id: string) { return this.service.accept(user, id); }

  @Post(':id/ship')
  ship(@CurrentUser() user: any, @Param('id') id: string) { return this.service.ship(user, id); }

  @Post(':id/complete')
  complete(@CurrentUser() user: any, @Param('id') id: string) { return this.service.complete(user, id); }

  @Post(':id/cancel')
  cancel(@CurrentUser() user: any, @Param('id') id: string, @Body() body: any) { return this.service.cancel(user, id, body?.reason); }

  @Post(':id/pay')
  pay(@CurrentUser() user: any, @Param('id') id: string) { return this.service.pay(user, id); }
}
