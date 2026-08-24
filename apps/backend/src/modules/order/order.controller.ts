import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { OrderService } from './order.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { CreateOrderDto, PayOrderDto } from './dto/order.dto';

@ApiTags('order')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermission('orders')
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
  async findOne(@CurrentUser() user: any, @Param('id') id: string) { return this.service.findOne(id, user); }

  @Post()
  @ApiOperation({ summary: '创建订单' })
  async create(@CurrentUser() user: any, @Body() body: CreateOrderDto) { return this.service.create(body, user); }

  @Post(':id/pay')
  @ApiOperation({ summary: '支付订单' })
  async pay(@CurrentUser() user: any, @Param('id') id: string, @Body() body: PayOrderDto) { return this.service.pay(id, body.paymentMethod, body.paymentTradeNo, user); }

  @Post(':id/cancel')
  @ApiOperation({ summary: '取消订单' })
  async cancel(@CurrentUser() user: any, @Param('id') id: string, @Body() body: { reason?: string }) { return this.service.cancel(id, body.reason, user); }

  @Post(':id/refund')
  @ApiOperation({ summary: '退款' })
  async refund(@CurrentUser() user: any, @Param('id') id: string) { return this.service.refund(id, user); }
}
