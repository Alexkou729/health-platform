import { Inject, Injectable } from "@nestjs/common";

@Injectable()
export class PerformanceService {
  constructor(@Inject("PRISMA_CLIENT") private readonly prisma: any) {}

  async getStaffPerformance(storeId: string | undefined, period: string) {
    const where: any = { period };
    if (storeId) where.storeId = storeId;
    return this.prisma.staffPerformance.findMany({
      where,
      include: { staff: { select: { id: true, name: true, avatarUrl: true, role: true } }, store: { select: { id: true, name: true } } },
      orderBy: { revenue: "desc" },
    });
  }

  async getStoreRevenue(storeId: string | undefined, startDate?: string, endDate?: string) {
    const where: any = { status: 1 };
    if (storeId) where.storeId = storeId;
    if (startDate || endDate) {
      where.paidAt = {};
      if (startDate) where.paidAt.gte = new Date(startDate);
      if (endDate) where.paidAt.lte = new Date(endDate);
    }
    const [total, today, month, byDay] = await Promise.all([
      this.prisma.order.aggregate({ where, _sum: { paidAmount: true } }),
      this.prisma.order.aggregate({ where: { ...where, paidAt: { gte: new Date(new Date().setHours(0,0,0,0)) } }, _sum: { paidAmount: true } }),
      this.prisma.order.aggregate({ where: { ...where, paidAt: { gte: new Date(new Date(new Date().setDate(1)).setHours(0,0,0,0)) } }, _sum: { paidAmount: true } }),
      this.prisma.$queryRaw`SELECT DATE(paid_at) as date, SUM(paid_amount) as revenue, COUNT(*) as orders FROM "Order" WHERE status = 1 ${storeId ? this.prisma.$queryRaw`AND store_id = ${storeId}` : this.prisma.$queryRaw``} ${startDate ? this.prisma.$queryRaw`AND paid_at >= ${new Date(startDate)}` : this.prisma.$queryRaw``} GROUP BY DATE(paid_at) ORDER BY date DESC LIMIT 30`,
    ]);
    return { total: total._sum.paidAmount || 0, today: today._sum.paidAmount || 0, month: month._sum.paidAmount || 0, byDay };
  }

  async getProjectUsage(storeId: string | undefined, startDate?: string, endDate?: string) {
    const where: any = { status: 1 };
    if (storeId) where.storeId = storeId;
    if (startDate || endDate) {
      where.paidAt = {};
      if (startDate) where.paidAt.gte = new Date(startDate);
      if (endDate) where.paidAt.lte = new Date(endDate);
    }
    const items = await this.prisma.orderItem.findMany({
      where: { order: where },
      include: { package: { select: { name: true, category: true } } },
    });
    const stats: Record<string, any> = {};
    for (const item of items) {
      const key = item.name;
      if (!stats[key]) stats[key] = { name: item.name, quantity: 0, revenue: 0, orders: new Set() };
      stats[key].quantity += item.quantity;
      stats[key].revenue += item.subtotal;
      stats[key].orders.add(item.orderId);
    }
    return Object.values(stats).map((s: any) => ({ name: s.name, quantity: s.quantity, revenue: s.revenue, orderCount: s.orders.size })).sort((a: any, b: any) => b.revenue - a.revenue);
  }

  async getCustomerStats(storeId: string | undefined) {
    const where: any = { status: "ACTIVE" };
    if (storeId) where.storeId = storeId;
    const [total, byLevel, byGender, bySource] = await Promise.all([
      this.prisma.customer.count({ where }),
      this.prisma.customer.groupBy({ by: ["level"], where, _count: true }),
      this.prisma.customer.groupBy({ by: ["gender"], where, _count: true }),
      this.prisma.customer.groupBy({ by: ["source"], where, _count: true }),
    ]);
    return { total, byLevel, byGender, bySource };
  }

  async getDashboard(storeId?: string) {
    const where: any = {};
    if (storeId) where.storeId = storeId;
    const today = new Date(); today.setHours(0,0,0,0);
    const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0,0,0,0);
    const [
      customers, detections, orders, revenue,
      todayCustomers, todayDetections, todayRevenue,
      monthRevenue, onlineDevices,
      pendingTasks, todayAppointments,
    ] = await Promise.all([
      this.prisma.customer.count({ where: { ...where, status: "ACTIVE" } }),
      this.prisma.detection.count({ where }),
      this.prisma.order.count({ where: { ...where, status: 1 } }),
      this.prisma.order.aggregate({ where: { ...where, status: 1 }, _sum: { paidAmount: true } }),
      this.prisma.customer.count({ where: { ...where, createdAt: { gte: today } } }),
      this.prisma.detection.count({ where: { ...where, createdAt: { gte: today } } }),
      this.prisma.order.aggregate({ where: { ...where, status: 1, paidAt: { gte: today } }, _sum: { paidAmount: true } }),
      this.prisma.order.aggregate({ where: { ...where, status: 1, paidAt: { gte: monthStart } }, _sum: { paidAmount: true } }),
      this.prisma.device.count({ where: { status: 1 } }),
      this.prisma.task.count({ where: { ...where, status: "PENDING" } }),
      this.prisma.appointment.count({ where: { ...where, status: { in: ["PENDING", "CONFIRMED"] }, scheduledAt: { gte: today, lt: new Date(today.getTime() + 24*60*60*1000) } } }),
    ]);
    return {
      total: { customers, detections, orders, revenue: revenue._sum.paidAmount || 0 },
      today: { customers: todayCustomers, detections: todayDetections, revenue: todayRevenue._sum.paidAmount || 0 },
      month: { revenue: monthRevenue._sum.paidAmount || 0 },
      devices: { online: onlineDevices },
      tasks: { pending: pendingTasks },
      appointments: { today: todayAppointments },
    };
  }
}
