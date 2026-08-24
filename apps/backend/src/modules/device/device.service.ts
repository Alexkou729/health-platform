import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { scopedWhere } from '../../common/utils/scope';
import { randomBytes } from 'crypto';

@Injectable()
export class DeviceService {
  constructor(@Inject('PRISMA_CLIENT') private readonly prisma) {}

  async list(params) {
    const { page = 1, pageSize = 20, storeId, status, keyword } = params;
    const where: any = {};
    if (storeId) where.storeId = storeId;
    if (status !== undefined) where.status = status;
    if (keyword) where.OR = [{ deviceNo: { contains: keyword } }, { model: { contains: keyword } }];
    const [items, total] = await Promise.all([
      this.prisma.device.findMany({ where, skip: (page - 1) * pageSize, take: pageSize, orderBy: { createdAt: 'desc' }, include: { store: { select: { id: true, name: true } } } }),
      this.prisma.device.count({ where }),
    ]);
    return { items, total, page, pageSize };
  }

  async findOne(id, user?: any) {
    const device = await this.prisma.device.findUnique({ where: scopedWhere(user, { id }), include: { store: true, detections: { take: 10, orderBy: { createdAt: 'desc' } } } });
    if (!device) throw new NotFoundException('设备不存在');
    return device;
  }

  async create(data, user?: any) {
    if (!data.storeId) data.storeId = user?.storeId;
    const secret = randomBytes(24).toString('hex');
    const expiresAt = data.expiresAt || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
    return this.prisma.device.create({ data: { ...data, secret, expiresAt } });
  }

  async update(id, data, user?: any) {
    const d = await this.prisma.device.findUnique({ where: scopedWhere(user, { id }), select: { id: true } });
    if (!d) throw new NotFoundException('设备不存在');
    return this.prisma.device.update({ where: scopedWhere(user, { id }), data });
  }

  async remove(id, user?: any) {
    const d = await this.prisma.device.findUnique({ where: scopedWhere(user, { id }), select: { id: true } });
    if (!d) throw new NotFoundException('设备不存在');
    return this.prisma.device.delete({ where: scopedWhere(user, { id }) });
  }

  async heartbeat(deviceNo) {
    const device = await this.prisma.device.findUnique({ where: { deviceNo } });
    if (!device) throw new NotFoundException('设备不存在');
    // 仅当设备离线(0)时置为在线(1)，不覆盖“检测中(2)”状态
    const nextStatus = device.status === 0 ? 1 : device.status;
    await this.prisma.device.update({ where: { id: device.id }, data: { lastHeartbeatAt: new Date(), status: nextStatus } });
    await this.prisma.deviceHeartbeat.create({ data: { deviceId: device.id, deviceNo, status: 1 } });
    return { success: true };
  }

  async getStatistics() {
    const [total, online, offline, detecting, byVendor] = await Promise.all([
      this.prisma.device.count(),
      this.prisma.device.count({ where: { status: 1 } }),
      this.prisma.device.count({ where: { status: 0 } }),
      this.prisma.device.count({ where: { status: 2 } }),
      this.prisma.device.groupBy({ by: ['vendor'], _count: true }),
    ]);
    return { total, online, offline, detecting, byVendor };
  }

  async bind(deviceNo, storeId, expiresAt) {
    await this.prisma.device.upsert({
      where: { deviceNo },
      update: { storeId, boundAt: new Date(), expiresAt: expiresAt ? new Date(expiresAt) : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), status: 1 },
      create: {
        deviceNo, storeId, expiresAt: expiresAt ? new Date(expiresAt) : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        vendor: 'Quantum', model: 'QA-13', status: 1,
        secret: randomBytes(24).toString('hex'),
      },
    });
    return this.prisma.device.findUnique({ where: { deviceNo } });
  }

  async uploadProgress(detectionId, data) {
    const detection = await this.prisma.detection.findUnique({ where: { id: detectionId } });
    if (!detection) throw new NotFoundException('检测记录不存在');
    const progress = Math.max(0, Math.min(100, Number(data?.progress) || 0));
    await this.prisma.detection.update({ where: { id: detectionId }, data: { progress, status: detection.status === 0 ? 1 : detection.status } });
    if (detection.deviceId) {
      await this.prisma.device.update({ where: { id: detection.deviceId }, data: { lastHeartbeatAt: new Date() } });
    }
    return { success: true, progress };
  }
}
