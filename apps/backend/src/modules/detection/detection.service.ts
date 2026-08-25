import { Inject, Injectable, NotFoundException, BadRequestException, OnModuleInit } from '@nestjs/common';
import { scopedWhere } from '../../common/utils/scope';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class DetectionService implements OnModuleInit {
  constructor(
    @Inject('PRISMA_CLIENT') private readonly prisma: any,
    private readonly events: EventEmitter2,
  ) {}

  onModuleInit() {
    // 每 60 秒自动恢复超时检测（运行超 3 分钟未完成 → 取消 + 设备恢复在线）
    const timer = setInterval(() => { this.recoverStaleDetections().catch(() => null); }, 60 * 1000);
    timer.unref?.();
  }

  /** 恢复卡住的检测：运行超时未完成，自动取消并释放设备 */
  async recoverStaleDetections() {
    const stale = await this.prisma.detection.findMany({
      where: { status: 1, startedAt: { lt: new Date(Date.now() - 3 * 60 * 1000) } },
      select: { id: true, deviceId: true },
    });
    for (const d of stale) {
      await this.prisma.$transaction([
        this.prisma.detection.update({ where: { id: d.id }, data: { status: 4, finishedAt: new Date(), remark: '超时自动恢复' } }),
        this.prisma.device.update({ where: { id: d.deviceId }, data: { status: 1 } }),
      ]).catch(() => null);
    }
    if (stale.length) console.log('[detection] 超时恢复 ' + stale.length + ' 条检测');
    return stale.length;
  }

  async startDetection(data, user?: any) {
    const { customerId, deviceId, staffId, duration = 60 } = data;
    const storeId = data.storeId || user?.storeId;
    const customer = await this.prisma.customer.findUnique({ where: scopedWhere(user, { id: customerId }) });
    if (!customer) throw new NotFoundException('客户不存在');
    const device = await this.prisma.device.findUnique({ where: scopedWhere(user, { id: deviceId }) });
    if (!device) throw new NotFoundException('设备不存在');
    if (device.status === 2) throw new BadRequestException('设备正在检测中');

    const detection = await this.prisma.detection.create({
      data: { customerId, deviceId, staffId, storeId, durationSec: duration, status: 1, startedAt: new Date() },
      include: {
        customer: { select: { id: true, name: true, phone: true, gender: true, age: true, heightCm: true, weightKg: true } },
        device: { select: { id: true, deviceNo: true } },
      },
    });
    await this.prisma.device.update({ where: { id: deviceId }, data: { status: 2, totalDetections: { increment: 1 } } });
    this.events.emit('detection.started', detection);
    return detection;
  }

  async completeDetection(detectionId, payload, user?: any) {
    const detection = await this.prisma.detection.findUnique({ where: scopedWhere(user, { id: detectionId }) });
    if (!detection) throw new NotFoundException('检测记录不存在');
    const updateRes = await this.prisma.$transaction(async (tx: any) => {
      const d = await tx.detection.update({
        where: { id: detectionId },
        data: { status: 2, finishedAt: new Date(), rawPayload: payload?.rawPayload ? JSON.stringify(payload.rawPayload) : null, overallScore: payload?.overallScore, constitution: payload?.constitution },
      });
      await tx.device.update({ where: { id: detection.deviceId }, data: { status: 1 } });
      await tx.customer.update({
        where: { id: detection.customerId },
        data: { totalDetections: { increment: 1 }, lastDetectionAt: new Date() },
      });
      return d;
    });
    this.events.emit('detection.completed', updateRes);
    return updateRes;
  }

  async cancelDetection(detectionId, reason, user?: any) {
    const detection = await this.prisma.detection.findUnique({ where: scopedWhere(user, { id: detectionId }) });
    if (!detection) throw new NotFoundException('检测记录不存在');
    return this.prisma.$transaction(async (tx: any) => {
      const res = await tx.detection.update({ where: { id: detectionId }, data: { status: 4, finishedAt: new Date(), remark: reason } });
      await tx.device.update({ where: { id: detection.deviceId }, data: { status: 1 } });
      return res;
    });
  }

  async list(params) {
    const { page = 1, pageSize = 20, customerId, deviceId, staffId, storeId, status, keyword, startDate, endDate } = params;
    const where: any = {};
    if (customerId) where.customerId = customerId;
    if (deviceId) where.deviceId = deviceId;
    if (staffId) where.staffId = staffId;
    if (storeId) where.storeId = storeId;
    if (status !== undefined) where.status = status;
    if (keyword) where.customer = { OR: [{ name: { contains: keyword } }, { phone: { contains: keyword } }] };
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }
    const [items, total] = await Promise.all([
      this.prisma.detection.findMany({
        where, skip: (page - 1) * pageSize, take: pageSize, orderBy: { createdAt: 'desc' },
        include: {
          customer: { select: { id: true, name: true, phone: true, gender: true, age: true } },
          device: { select: { id: true, deviceNo: true, model: true } },
          staff: { select: { id: true, name: true } },
          reports: { select: { id: true, templateCode: true, title: true, score: true } },
        },
      }),
      this.prisma.detection.count({ where }),
    ]);
    return { items, total, page, pageSize };
  }

  async findOne(id, user?: any) {
    const detection = await this.prisma.detection.findUnique({
      where: scopedWhere(user, { id }),
      include: { customer: true, device: true, staff: { select: { id: true, name: true, avatarUrl: true } }, reports: true, measurement: true },
    });
    if (!detection) throw new NotFoundException('检测记录不存在');
    return detection;
  }

  async getStatistics(storeId) {
    const where: any = {};
    if (storeId) where.storeId = storeId;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);
    const [total, todayCount, monthCount, byStatus, avgScore] = await Promise.all([
      this.prisma.detection.count({ where }),
      this.prisma.detection.count({ where: { ...where, createdAt: { gte: today } } }),
      this.prisma.detection.count({ where: { ...where, createdAt: { gte: monthStart } } }),
      this.prisma.detection.groupBy({ by: ['status'], where, _count: true }),
      this.prisma.detection.aggregate({ where: { ...where, overallScore: { not: null } }, _avg: { overallScore: true } }),
    ]);
    return { total, todayCount, monthCount, byStatus, avgScore: avgScore._avg.overallScore };
  }
  /** 导入原版软件检测报告（真实数据） */
  async importReports(user, data) {
    const customerId = data.customerId, reports = data.reports || [];
    const customer = await this.prisma.customer.findUnique({ where: { id: customerId } });
    if (!customer) throw new NotFoundException('客户不存在');
    const storeId = customer.storeId || user?.storeId;
    let device = await this.prisma.device.findFirst({ where: { deviceNo: 'PV66-IMPORT' } });
    if (!device) {
      device = await this.prisma.device.create({ data: { deviceNo: 'PV66-IMPORT', vendor: 'Quantum', model: 'PV-66', storeId, status: 1, secret: 'import', expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) } });
    }
    const detection = await this.prisma.detection.create({ data: { customerId, deviceId: device.id, storeId, status: 2, finishedAt: new Date(), durationSec: 60, rawPayload: JSON.stringify({ imported: true, source: 'pv66' }) } });
    const created = [];
    for (const r of reports) {
      const indicators = (r.indicators || []).map((ind, i) => {
        const value = Number(ind.value) || 0;
        const low = ind.lowLimit != null ? Number(ind.lowLimit) : null;
        const high = ind.highLimit != null ? Number(ind.highLimit) : null;
        const status = this.calcImportStatus(value, low, high, ind.level);
        return { code: 'IND_' + String(r.templateCode || 'imp').toUpperCase() + '_' + (i + 1), name: ind.name || ('指标' + (i + 1)), value: Math.round(value * 1000) / 1000, unit: ind.unit || '', lowLimit: low, highLimit: high, referenceRange: (low != null && high != null) ? low + '-' + high : '', status };
      });
      const score = indicators.length ? Math.round(indicators.reduce((a, x) => a + (x.status === 0 ? 90 : x.status <= 2 ? 70 : 50), 0) / indicators.length) : 70;
      const abnormal = indicators.filter(x => x.status >= 1).length;
      const rep = await this.prisma.report.create({ data: { detectionId: detection.id, customerId, templateCode: r.templateCode || 'comprehensive', title: r.title || '导入报告', isDemo: false, score, indicators: JSON.stringify(indicators), suggestions: JSON.stringify([]), warnings: JSON.stringify(indicators.filter(x => x.status >= 3).map(x => x.name + ' 异常')), highlights: JSON.stringify(indicators.filter(x => x.status === 0).slice(0, 5).map(x => x.name + ' 正常')), conclusion: abnormal === 0 ? '各项指标基本正常' : '存在 ' + abnormal + ' 项指标异常，建议关注并调理', status: 1 } });
      created.push(rep);
    }
    await this.prisma.customer.update({ where: { id: customerId }, data: { totalDetections: { increment: 1 }, lastDetectionAt: new Date() } });
    return { detectionId: detection.id, reportCount: created.length };
  }

  calcImportStatus(value, low, high, level) {
    if (low == null || high == null) return 0;
    if (value >= low && value <= high) return 0;
    const above = value > high;
    const heavy = /重度|\+\+\+/.test(level || '');
    return heavy ? (above ? 3 : 4) : (above ? 1 : 2);
  }
}
