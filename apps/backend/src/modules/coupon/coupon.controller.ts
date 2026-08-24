import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CouponService } from './coupon.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('coupon')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermission('marketing')
@Controller()
export class CouponController {
  constructor(private readonly service: CouponService) {}

  @Get('coupons')
  @ApiOperation({ summary: '优惠券列表' })
  list(@CurrentUser() user: any) { return this.service.list(user); }

  @Post('coupons')
  @ApiOperation({ summary: '创建优惠券' })
  create(@CurrentUser() user: any, @Body() body: any) { return this.service.create(user, body); }

  @Post('coupons/:id/issue')
  @ApiOperation({ summary: '给客户发券' })
  issue(@CurrentUser() user: any, @Param('id') id: string, @Body() body: { customerId: string }) { return this.service.issue(user, id, body.customerId); }

  @Get('customers/:id/coupons')
  @ApiOperation({ summary: '客户可用优惠券' })
  customerCoupons(@Param('id') id: string) { return this.service.customerCoupons(id); }
}
