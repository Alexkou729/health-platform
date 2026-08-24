import { Inject, Injectable, NotFoundException } from '@nestjs/common';

@Injectable()
export class ReportService {
  constructor(@Inject('PRISMA_CLIENT') private readonly prisma) {}

  async list(params) {
    const { page = 1, pageSize = 20, customerId, templateCode, startDate, endDate, status } = params;
    const where: any = {};
    if (customerId) where.customerId = customerId;
    if (templateCode) where.templateCode = templateCode;
    if (status !== undefined) where.status = status;
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }
    const [items, total] = await Promise.all([
      this.prisma.report.findMany({
        where, skip: (page - 1) * pageSize, take: pageSize, orderBy: { createdAt: 'desc' },
        include: {
          customer: { select: { id: true, name: true, phone: true, gender: true, age: true } },
          detection: { select: { id: true, startedAt: true, finishedAt: true } },
        },
      }),
      this.prisma.report.count({ where }),
    ]);
    return { items, total, page, pageSize };
  }

  async findOne(id) {
    const report = await this.prisma.report.findUnique({
      where: { id },
      include: { customer: true, detection: { include: { device: true } } },
    });
    if (!report) throw new NotFoundException('报告不存在');
    await this.prisma.report.update({ where: { id }, data: { viewedAt: new Date(), status: 3 } });
    return report;
  }

  async getComparison(customerId, templateCode) {
    return this.prisma.report.findMany({
      where: { customerId, templateCode },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: { id: true, templateCode: true, title: true, score: true, indicators: true, createdAt: true, conclusion: true },
    });
  }

  async getStatistics() {
    const [total, byTemplate, avgScore] = await Promise.all([
      this.prisma.report.count(),
      this.prisma.report.groupBy({ by: ['templateCode'], _count: true, _avg: { score: true } }),
      this.prisma.report.aggregate({ _avg: { score: true } }),
    ]);
    return { total, avgScore: avgScore._avg.score, byTemplate };
  }
}
