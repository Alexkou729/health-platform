import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { HomeServiceService } from './home-service.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('home-service')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermission('service-request')
@Controller()
export class HomeServiceController {
  constructor(private readonly service: HomeServiceService) {}

  // 服务项目
  @Get('home-services')
  listServices(@Query() q: any) { return this.service.listServices(q); }

  @Post('home-services')
  createService(@CurrentUser() user: any, @Body() body: any) { return this.service.createService(user, body); }

  // 服务订单
  @Get('home-service-orders')
  listOrders(@CurrentUser() user: any, @Query() q: any) { return this.service.listOrders(user, q); }

  @Post('home-service-orders/:id/assign')
  assign(@CurrentUser() user: any, @Param('id') id: string, @Body() body: { storeId: string }) { return this.service.assign(user, id, body.storeId); }

  @Post('home-service-orders/:id/accept')
  accept(@CurrentUser() user: any, @Param('id') id: string) { return this.service.accept(user, id); }

  @Post('home-service-orders/:id/start')
  start(@CurrentUser() user: any, @Param('id') id: string) { return this.service.start(user, id); }

  @Post('home-service-orders/:id/complete')
  complete(@CurrentUser() user: any, @Param('id') id: string) { return this.service.complete(user, id); }

  @Post('home-service-orders/:id/cancel')
  cancel(@CurrentUser() user: any, @Param('id') id: string, @Body() body: any) { return this.service.cancel(user, id, body?.reason); }

  @Post('home-service-orders/:id/pay')
  pay(@CurrentUser() user: any, @Param('id') id: string, @Body() body: any) { return this.service.pay(user, id, body?.method); }
}
