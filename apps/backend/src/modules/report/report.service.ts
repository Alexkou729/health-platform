import { Inject, Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { scopedWhere } from '../../common/utils/scope';

@Injectable()
export class ReportService {
  constructor(@Inject('PRISMA_CLIENT') private readonly prisma) {}

  async list(params) {
    const { page = 1, pageSize = 20, customerId, templateCode, startDate, endDate, status, storeId } = params;
    const where: any = {};
    if (customerId) where.customerId = customerId;
    if (templateCode) where.templateCode = templateCode;
    if (storeId) where.detection = { storeId };
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
          detection: {
            select: {
              id: true, startedAt: true, finishedAt: true,
              customer: { select: { id: true, name: true, phone: true, gender: true, age: true } },
            },
          },
        },
      }),
      this.prisma.report.count({ where }),
    ]);
    // Report 模型只有 customerId 标量字段，客户信息从 detection.customer 冗余出来，兼容前端展示
    return {
      items: items.map((r) => this.parseReport({ ...r, customer: r.detection?.customer || null })),
      total, page, pageSize,
    };
  }

  async findOne(id, user?: any) {
    const where: any = { id };
    if (user && user.role !== 'SUPER_ADMIN' && user.storeId) {
      where.detection = { storeId: user.storeId };
    }
    const report = await this.prisma.report.findUnique({
      where,
      include: {
        detection: { include: { device: true, customer: true } },
        aiInterpretations: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
    });
    if (!report) throw new NotFoundException('报告不存在');
    await this.prisma.report.update({ where: { id }, data: { viewedAt: new Date(), status: 3 } });
    return this.parseReport({ ...report, customer: report.detection?.customer || null });
  }

  async getComparison(customerId, templateCode, user?: any) {
    if (user && user.role !== 'SUPER_ADMIN' && user.storeId) {
      const customer = await this.prisma.customer.findUnique({ where: { id: customerId }, select: { storeId: true } });
      if (!customer || customer.storeId !== user.storeId) throw new ForbiddenException('无权访问该客户的报告');
    }
    const reports = await this.prisma.report.findMany({
      where: { customerId, templateCode },
      orderBy: { createdAt: 'asc' },
      take: 10,
      select: { id: true, templateCode: true, title: true, score: true, indicators: true, createdAt: true, conclusion: true },
    });
    return reports.map((r) => this.parseReport(r));
  }

  async getStatistics() {
    const [total, byTemplate, avgScore] = await Promise.all([
      this.prisma.report.count(),
      this.prisma.report.groupBy({ by: ['templateCode'], _count: true, _avg: { score: true } }),
      this.prisma.report.aggregate({ _avg: { score: true } }),
    ]);
    return { total, avgScore: avgScore._avg.score, byTemplate };
  }

  async getShareUrl(id: string) {
    const report = await this.prisma.report.findUnique({ where: { id }, select: { id: true, shareToken: true } });
    if (!report) throw new NotFoundException('报告不存在');
    let shareToken = report.shareToken;
    if (!shareToken) {
      shareToken = require('crypto').randomBytes(16).toString('hex');
      await this.prisma.report.update({ where: { id }, data: { shareToken } });
    }
    const base = (process.env.PUBLIC_BASE_URL || 'http://47.99.147.106:3015').replace(/\/+$/, '');
    return { shareUrl: `${base}/api/public/reports/${id}/${shareToken}` };
  }

  async findPublic(id: string, shareToken: string) {
    const report = await this.prisma.report.findFirst({
      where: { id, shareToken },
      include: { detection: { include: { customer: true } } },
    });
    if (!report) throw new NotFoundException('报告不存在或分享链接无效');
    await this.prisma.report.update({ where: { id }, data: { viewedAt: new Date(), status: 3 } }).catch(() => {});
    return this.parseReport({ ...report, customer: report.detection?.customer || null });
  }

  async remove(id: string, user?: any) {
    // 仅店铺超级管理员(STORE_ADMIN)与总部超级管理员(SUPER_ADMIN)可删除，避免误删
    if (user && user.role !== 'SUPER_ADMIN' && user.role !== 'STORE_ADMIN') {
      throw new ForbiddenException('仅店铺管理员或总部可删除报告');
    }
    const where: any = { id };
    if (user && user.role !== 'SUPER_ADMIN' && user.storeId) {
      where.detection = { storeId: user.storeId };
    }
    const report = await this.prisma.report.findUnique({ where });
    if (!report) throw new NotFoundException('报告不存在');
    await this.prisma.report.delete({ where: { id } });
    return { ok: true };
  }

  private parseReport(r: any) {
    if (!r) return r;
    for (const key of ['indicators', 'suggestions', 'warnings', 'highlights']) {
      if (typeof r[key] === 'string') {
        try { r[key] = JSON.parse(r[key]); } catch { r[key] = []; }
      }
    }
    return r;
  }
}
