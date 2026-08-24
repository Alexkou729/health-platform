import { Inject, Injectable } from '@nestjs/common';

@Injectable()
export class DashboardService {
  constructor(@Inject('PRISMA_CLIENT') private readonly prisma) {}

  async overview(storeId) {
    const where: any = {};
    if (storeId) where.storeId = storeId;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);
    const [
      totalCustomers, totalDetections, totalOrders, totalRevenue,
      todayCustomers, todayDetections, todayOrders, todayRevenue,
      monthRevenue, onlineDevices,
    ] = await Promise.all([
      this.prisma.customer.count({ where: { ...where, status: 'ACTIVE' } }),
      this.prisma.detection.count({ where }),
      this.prisma.order.count({ where }),
      this.prisma.order.aggregate({ where: { ...where, status: 1 }, _sum: { paidAmount: true } }),
      this.prisma.customer.count({ where: { ...where, createdAt: { gte: today } } }),
      this.prisma.detection.count({ where: { ...where, createdAt: { gte: today } } }),
      this.prisma.order.count({ where: { ...where, createdAt: { gte: today } } }),
      this.prisma.order.aggregate({ where: { ...where, status: 1, createdAt: { gte: today } }, _sum: { paidAmount: true } }),
      this.prisma.order.aggregate({ where: { ...where, status: 1, createdAt: { gte: monthStart } }, _sum: { paidAmount: true } }),
      this.prisma.device.count({ where: { status: 1 } }),
    ]);
    return {
      total: { customers: totalCustomers, detections: totalDetections, orders: totalOrders, revenue: totalRevenue._sum.paidAmount || 0 },
      today: { customers: todayCustomers, detections: todayDetections, orders: todayOrders, revenue: todayRevenue._sum.paidAmount || 0 },
      month: { revenue: monthRevenue._sum.paidAmount || 0 },
      devices: { online: onlineDevices },
    };
  }

  async trend(days = 7, storeId) {
    const where: any = {};
    if (storeId) where.storeId = storeId;
    const startDate = new Date(); startDate.setDate(startDate.getDate() - days); startDate.setHours(0, 0, 0, 0);
    const [detections, orders] = await Promise.all([
      this.prisma.detection.findMany({ where: { ...where, createdAt: { gte: startDate } }, select: { createdAt: true } }),
      this.prisma.order.findMany({ where: { ...where, createdAt: { gte: startDate } }, select: { createdAt: true, paidAmount: true } }),
    ]);
    const dateMap = {};
    for (let i = 0; i < days; i++) {
      const d = new Date(startDate); d.setDate(d.getDate() + i);
      const key = d.toISOString().split('T')[0];
      dateMap[key] = { date: key, detections: 0, orders: 0, revenue: 0 };
    }
    detections.forEach((d) => { const key = new Date(d.createdAt).toISOString().split('T')[0]; if (dateMap[key]) dateMap[key].detections++; });
    orders.forEach((o) => { const key = new Date(o.createdAt).toISOString().split('T')[0]; if (dateMap[key]) { dateMap[key].orders++; dateMap[key].revenue += o.paidAmount || 0; } });
    return Object.values(dateMap);
  }

  async constitutionDistribution() {
    const customers = await this.prisma.customer.findMany({ select: { tags: true } });
    const dist = {};
    customers.forEach((c) => { try { const tags = JSON.parse(c.tags || '[]'); tags.forEach((t) => { dist[t] = (dist[t] || 0) + 1; }); } catch {} });
    return Object.entries(dist).map(([name, value]) => ({ name, value }));
  }

  async hotReports(limit = 10) {
    return this.prisma.report.groupBy({
      by: ['templateCode'], _count: true, orderBy: { _count: { templateCode: 'desc' } }, take: limit,
    });
  }
}
