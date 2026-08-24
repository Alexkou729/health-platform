import { Inject, Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { scopedWhere, genNo } from '../../common/utils/scope';

@Injectable()
export class CouponService {
  constructor(@Inject('PRISMA_CLIENT') private readonly prisma: any) {}

  async list(user: any) {
    const where = scopedWhere(user, {});
    return this.prisma.coupon.findMany({ where, orderBy: { createdAt: 'desc' }, include: { _count: { select: { customerCoupons: true } } } });
  }

  async create(user: any, data: any) {
    if (!data?.name || data.value === undefined) throw new BadRequestException('请填写券名称与面值');
    return this.prisma.coupon.create({
      data: {
        code: data.code || genNo('CP'),
        name: data.name,
        type: data.type || 'AMOUNT',
        value: Number(data.value),
        minSpend: Number(data.minSpend) || 0,
        validFrom: data.validFrom ? new Date(data.validFrom) : new Date(),
        validTo: data.validTo ? new Date(data.validTo) : new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
        totalQuantity: Number(data.totalQuantity) || 1000,
        perCustomerLimit: Number(data.perCustomerLimit) || 1,
        description: data.description || null,
        storeId: data.storeId || user?.storeId || null,
      },
    });
  }

  async issue(user: any, couponId: string, customerId: string) {
    const coupon = await this.prisma.coupon.findUnique({ where: { id: couponId } });
    if (!coupon) throw new NotFoundException('优惠券不存在');
    if (coupon.status !== 'ACTIVE') throw new BadRequestException('优惠券未启用');
    if (coupon.usedQuantity >= coupon.totalQuantity) throw new BadRequestException('优惠券已发完');
    const held = await this.prisma.customerCoupon.count({ where: { couponId, customerId } });
    if (held >= coupon.perCustomerLimit) throw new BadRequestException('该客户已达领取上限');
    return this.prisma.customerCoupon.create({
      data: {
        customerId,
        couponId,
        code: genNo('CC'),
        status: 'UNUSED',
        expiresAt: coupon.validTo,
      },
    });
  }

  async customerCoupons(customerId: string) {
    return this.prisma.customerCoupon.findMany({
      where: { customerId, status: 'UNUSED' },
      include: { coupon: true },
      orderBy: { createdAt: 'desc' },
    });
  }
}
