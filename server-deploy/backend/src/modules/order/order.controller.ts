import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { OrderService } from './order.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('order')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('orders')
export class OrderController {
  constructor(private readonly service: OrderService) {}

  @Get()
  @ApiOperation({ summary: '订单列表' })
  async list(@Query('page') page = 1, @Query('pageSize') pageSize = 20, @Query('customerId') customerId, @Query('staffId') staffId, @Query('storeId') storeId, @Query('status') status, @Query('startDate') startDate, @Query('endDate') endDate, @Query('keyword') keyword) {
    return this.service.list({ page: +page, pageSize: +pageSize, customerId, staffId, storeId, status: status !== undefined ? +status : undefined, startDate, endDate, keyword });
  }

  @Get('statistics')
  @ApiOperation({ summary: '订单统计' })
  async statistics(@Query('storeId') storeId) { return this.service.getStatistics(storeId); }

  @Get(':id')
  @ApiOperation({ summary: '订单详情' })
  async findOne(@Param('id') id: string) { return this.service.findOne(id); }

  @Post()
  @ApiOperation({ summary: '创建订单' })
  async create(@Body() body: any) { return this.service.create(body); }

  @Post(':id/pay')
  @ApiOperation({ summary: '支付订单' })
  async pay(@Param('id') id: string, @Body() body: { paymentMethod: string; paymentTradeNo?: string }) { return this.service.pay(id, body.paymentMethod, body.paymentTradeNo); }

  @Post(':id/cancel')
  @ApiOperation({ summary: '取消订单' })
  async cancel(@Param('id') id: string, @Body() body: { reason?: string }) { return this.service.cancel(id, body.reason); }

  @Post(':id/refund')
  @ApiOperation({ summary: '退款' })
  async refund(@Param('id') id: string) { return this.service.refund(id); }
}
