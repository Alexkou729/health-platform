import { Inject, Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class DetectionService {
  constructor(
    @Inject('PRISMA_CLIENT') private readonly prisma: any,
    private readonly events: EventEmitter2,
  ) {}

  async startDetection(data) {
    const { customerId, deviceId, staffId, storeId, duration = 60 } = data;
    const customer = await this.prisma.customer.findUnique({ where: { id: customerId } });
    if (!customer) throw new NotFoundException('客户不存在');
    const device = await this.prisma.device.findUnique({ where: { id: deviceId } });
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

  async completeDetection(detectionId, payload) {
    const detection = await this.prisma.detection.findUnique({ where: { id: detectionId } });
    if (!detection) throw new NotFoundException('检测记录不存在');
    const updateRes = await this.prisma.detection.update({
      where: { id: detectionId },
      data: { status: 2, finishedAt: new Date(), rawPayload: payload.rawPayload, overallScore: payload.overallScore, constitution: payload.constitution },
    });
    await this.prisma.device.update({ where: { id: detection.deviceId }, data: { status: 1 } });
    await this.prisma.customer.update({
      where: { id: detection.customerId },
      data: { totalDetections: { increment: 1 }, lastDetectionAt: new Date() },
    });
    this.events.emit('detection.completed', updateRes);
    return updateRes;
  }

  async cancelDetection(detectionId, reason) {
    const detection = await this.prisma.detection.findUnique({ where: { id: detectionId } });
    if (!detection) throw new NotFoundException('检测记录不存在');
    const res = await this.prisma.detection.update({ where: { id: detectionId }, data: { status: 4, finishedAt: new Date(), remark: reason } });
    await this.prisma.device.update({ where: { id: detection.deviceId }, data: { status: 1 } });
    return res;
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

  async findOne(id) {
    const detection = await this.prisma.detection.findUnique({
      where: { id },
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
}
