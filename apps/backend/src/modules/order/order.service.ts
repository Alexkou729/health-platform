import { Inject, Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { scopedWhere } from '../../common/utils/scope';
import { randomBytes } from 'crypto';

@Injectable()
export class OrderService {
  constructor(@Inject('PRISMA_CLIENT') private readonly prisma) {}

  async list(params) {
    const { page = 1, pageSize = 20, customerId, staffId, storeId, status, startDate, endDate, keyword } = params;
    const where: any = {};
    if (customerId) where.customerId = customerId;
    if (staffId) where.staffId = staffId;
    if (storeId) where.storeId = storeId;
    if (status !== undefined) where.status = status;
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }
    if (keyword) where.OR = [{ orderNo: { contains: keyword } }, { customer: { name: { contains: keyword } } }, { customer: { phone: { contains: keyword } } }];
    const [items, total] = await Promise.all([
      this.prisma.order.findMany({
        where, skip: (page - 1) * pageSize, take: pageSize, orderBy: { createdAt: 'desc' },
        include: {
          customer: { select: { id: true, name: true, phone: true } },
          staff: { select: { id: true, name: true } },
          items: { include: { package: true } },
        },
      }),
      this.prisma.order.count({ where }),
    ]);
    return { items, total, page, pageSize };
  }

  async findOne(id, user?: any) {
    const order = await this.prisma.order.findUnique({ where: scopedWhere(user, { id }), include: { customer: true, staff: true, items: { include: { package: true } } } });
    if (!order) throw new NotFoundException('订单不存在');
    return order;
  }

  async create(data, user?: any) {
    const storeId = data.storeId || user?.storeId;
    if (!storeId) throw new BadRequestException('门店信息缺失');
    const orderNo = this.genOrderNo();
    const items = data.items || [];
    let totalAmount = 0;
    const orderItems = [];
    for (const item of items) {
      const pkg = await this.prisma.package.findUnique({ where: { id: item.packageId } });
      if (!pkg) throw new NotFoundException('套餐不存在: ' + item.packageId);
      const subtotal = pkg.price * (item.quantity || 1);
      totalAmount += subtotal;
      orderItems.push({ packageId: pkg.id, name: pkg.name, price: pkg.price, quantity: item.quantity || 1, subtotal });
    }
    let discount = data.discountAmount || 0;
    let couponId: string | null = null;
    let customerCoupon: any = null;
    // 优惠券核销：按券码匹配客户未使用的券
    if (data.couponCode) {
      customerCoupon = await this.prisma.customerCoupon.findUnique({
        where: { code: data.couponCode },
        include: { coupon: true },
      });
      if (!customerCoupon) throw new BadRequestException('优惠券不存在');
      if (customerCoupon.customerId !== data.customerId) throw new BadRequestException('该券不属于此客户');
      if (customerCoupon.status !== 'UNUSED') throw new BadRequestException('优惠券已使用或已过期');
      if (customerCoupon.expiresAt && new Date(customerCoupon.expiresAt) < new Date()) throw new BadRequestException('优惠券已过期');
      const cp = customerCoupon.coupon;
      if (cp && totalAmount < cp.minSpend) throw new BadRequestException('未达到满减门槛 ¥' + cp.minSpend);
      if (cp?.type === 'AMOUNT') discount += cp.value;
      else if (cp?.type === 'PERCENTAGE') discount += (totalAmount * cp.value) / 100;
      couponId = cp?.id || null;
    }
    const finalTotal = Math.max(0, totalAmount - discount);
    return this.prisma.$transaction(async (tx: any) => {
      const order = await tx.order.create({
        data: {
          orderNo, customerId: data.customerId, staffId: data.staffId, storeId,
          totalAmount: finalTotal, discountAmount: discount, paidAmount: 0, couponId, remark: data.remark,
          items: { create: orderItems },
        },
        include: { items: true, customer: true },
      });
      if (customerCoupon) {
        await tx.customerCoupon.update({ where: { id: customerCoupon.id }, data: { status: 'USED', usedAt: new Date(), orderId: order.id } });
        await tx.coupon.update({ where: { id: customerCoupon.couponId }, data: { usedQuantity: { increment: 1 } } });
      }
      return order;
    });
  }

  async pay(id, paymentMethod, paymentTradeNo, user?: any) {
    const order = await this.prisma.order.findUnique({ where: scopedWhere(user, { id }) });
    if (!order) throw new NotFoundException('订单不存在');
    if (order.status !== 0) throw new BadRequestException('订单状态不允许支付');
    return this.prisma.order.update({
      where: scopedWhere(user, { id }),
      data: {
        status: 1, paymentMethod, paymentTradeNo,
        paidAmount: order.totalAmount - order.discountAmount,
        paidAt: new Date(),
      },
    });
  }

  async cancel(id, reason, user?: any) {
    const order = await this.prisma.order.findUnique({ where: scopedWhere(user, { id }) });
    if (!order) throw new NotFoundException('订单不存在');
    if (order.status !== 0) throw new BadRequestException('仅未支付订单可取消');
    return this.prisma.order.update({ where: scopedWhere(user, { id }), data: { status: 3, remark: reason } });
  }

  async refund(id, user?: any) {
    const order = await this.prisma.order.findUnique({ where: scopedWhere(user, { id }) });
    if (!order) throw new NotFoundException('订单不存在');
    if (order.status !== 1) throw new BadRequestException('仅已支付订单可退款');
    return this.prisma.order.update({ where: scopedWhere(user, { id }), data: { status: 2, refundedAt: new Date() } });
  }

  /** 订单号：日期 + 纳秒随机，碰撞概率极低 */
  private genOrderNo(): string {
    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const stamp = d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate()) + pad(d.getHours()) + pad(d.getMinutes()) + pad(d.getSeconds());
    return 'ORD' + stamp + randomBytes(4).toString('hex').toUpperCase();
  }

  async getStatistics(storeId) {
    const where: any = {};
    if (storeId) where.storeId = storeId;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);
    const [total, todayCount, monthRevenue, totalRevenue, byStatus] = await Promise.all([
      this.prisma.order.count({ where }),
      this.prisma.order.count({ where: { ...where, createdAt: { gte: today } } }),
      this.prisma.order.aggregate({ where: { ...where, status: 1, createdAt: { gte: monthStart } }, _sum: { paidAmount: true } }),
      this.prisma.order.aggregate({ where: { ...where, status: 1 }, _sum: { paidAmount: true } }),
      this.prisma.order.groupBy({ by: ['status'], where, _count: true, _sum: { paidAmount: true } }),
    ]);
    return { total, todayCount, monthRevenue: monthRevenue._sum.paidAmount || 0, totalRevenue: totalRevenue._sum.paidAmount || 0, byStatus };
  }
}
