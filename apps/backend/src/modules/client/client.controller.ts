import { Body, Controller, Get, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ClientService } from './client.service';
import { ClientAuthGuard } from './client-auth.guard';

@ApiTags('client')
@Controller('client')
export class ClientController {
  constructor(private readonly service: ClientService) {}

  @Post('auth/send-code')
  @ApiOperation({ summary: '发送验证码' })
  sendCode(@Body() body: { phone: string }) { return this.service.sendCode(body.phone); }

  @Post('auth/login')
  @ApiOperation({ summary: '验证码登录' })
  login(@Body() body: { phone: string; code: string; storeId?: string }) { return this.service.login(body.phone, body.code, body.storeId); }

  @Get('products')
  @ApiOperation({ summary: '商城商品列表' })
  products(@Query('category') category?: string) { return this.service.listProducts(category); }

  @Get('home-services')
  @ApiOperation({ summary: '上门服务项目列表' })
  homeServices() { return this.service.listHomeServices(); }

  @Post('mall-orders')
  @UseGuards(ClientAuthGuard)
  @ApiOperation({ summary: '商城下单' })
  createMallOrder(@Req() req: any, @Body() body: any) { return this.service.createMallOrder(req.customer, body); }

  @Get('mall-orders')
  @UseGuards(ClientAuthGuard)
  @ApiOperation({ summary: '我的商城订单' })
  myMallOrders(@Req() req: any) { return this.service.myMallOrders(req.customer); }

  @Post('home-service-orders')
  @UseGuards(ClientAuthGuard)
  @ApiOperation({ summary: '上门服务下单' })
  createHomeServiceOrder(@Req() req: any, @Body() body: any) { return this.service.createHomeServiceOrder(req.customer, body); }

  @Get('home-service-orders')
  @UseGuards(ClientAuthGuard)
  @ApiOperation({ summary: '我的上门服务订单' })
  myHomeServiceOrders(@Req() req: any) { return this.service.myHomeServiceOrders(req.customer); }

  @Get('reports')
  @UseGuards(ClientAuthGuard)
  @ApiOperation({ summary: '我的报告' })
  myReports(@Req() req: any) { return this.service.myReports(req.customer); }

  @Get('care-plans')
  @UseGuards(ClientAuthGuard)
  @ApiOperation({ summary: '我的调理方案' })
  myCarePlans(@Req() req: any) { return this.service.myCarePlans(req.customer); }

  @Get('coupons')
  @UseGuards(ClientAuthGuard)
  @ApiOperation({ summary: '我的优惠券' })
  myCoupons(@Req() req: any) { return this.service.myCoupons(req.customer); }
}
