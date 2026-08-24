import { Inject, Injectable, NotFoundException, BadRequestException } from '@nestjs/common';

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

  async findOne(id) {
    const order = await this.prisma.order.findUnique({ where: { id }, include: { customer: true, staff: true, items: { include: { package: true } } } });
    if (!order) throw new NotFoundException('订单不存在');
    return order;
  }

  async create(data) {
    const orderNo = 'ORD' + Date.now() + Math.floor(Math.random() * 1000).toString().padStart(3, '0');
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
    const discount = data.discountAmount || 0;
    return this.prisma.order.create({
      data: {
        orderNo, customerId: data.customerId, staffId: data.staffId, storeId: data.storeId,
        totalAmount, discountAmount: discount, paidAmount: 0, remark: data.remark,
        items: { create: orderItems },
      },
      include: { items: true, customer: true },
    });
  }

  async pay(id, paymentMethod, paymentTradeNo) {
    const order = await this.prisma.order.findUnique({ where: { id } });
    if (!order) throw new NotFoundException('订单不存在');
    if (order.status !== 0) throw new BadRequestException('订单状态不允许支付');
    return this.prisma.order.update({
      where: { id },
      data: {
        status: 1, paymentMethod, paymentTradeNo,
        paidAmount: order.totalAmount - order.discountAmount,
        paidAt: new Date(),
      },
    });
  }

  async cancel(id, reason) { return this.prisma.order.update({ where: { id }, data: { status: 3, remark: reason } }); }
  async refund(id) { return this.prisma.order.update({ where: { id }, data: { status: 2, refundedAt: new Date() } }); }

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
