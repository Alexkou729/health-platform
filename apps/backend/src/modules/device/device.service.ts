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
    if (!data.storeId) {
      const store = await this.prisma.store.findFirst();
      if (store) data.storeId = store.id;
    }
    const deviceNo = String(data.deviceNo).slice(0, 64);
    const expiresAt = data.expiresAt ? new Date(data.expiresAt) : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
    const fields = {
      deviceNo,
      vendor: data.vendor || 'Quantum',
      model: data.model || 'QA-13',
      hidVendorId: data.hidVendorId ? Number(data.hidVendorId) : null,
      hidProductId: data.hidProductId ? Number(data.hidProductId) : null,
      storeId: data.storeId,
      status: 1,
      expiresAt,
      firmwareVersion: data.firmwareVersion || '1.0.0',
      remark: data.remark || null,
    };
    // 幂等：同编号设备重复添加时改为更新（不重置密钥）
    const existing = await this.prisma.device.findUnique({ where: { deviceNo } });
    if (existing) {
      return this.prisma.device.update({ where: { deviceNo }, data: fields });
    }
    return this.prisma.device.create({ data: { ...fields, secret: randomBytes(24).toString('hex') } });
  }

  /** 批量自动识别入库：按 deviceNo 幂等 upsert，返回全部设备 */
  async syncDevices(user: any, devices: any[]) {
    const storeId = user?.storeId;
    const results = [];
    for (const d of devices || []) {
      if (!d?.deviceNo) continue;
      const deviceNo = String(d.deviceNo).slice(0, 64);
      const existed = await this.prisma.device.findUnique({ where: { deviceNo } });
      if (existed) {
        // 已存在：恢复在线状态（修复解绑/卡检测后重新识别不恢复的问题）
        if (existed.status !== 1) {
          await this.prisma.device.update({ where: { id: existed.id }, data: { status: 1 } }).catch(() => null);
          existed.status = 1;
        }
        results.push(existed);
        continue;
      }
      const created = await this.prisma.device.create({
        data: {
          deviceNo,
          vendor: d.vendor || 'Quantum',
          model: d.model || 'QA-13',
          hidVendorId: d.vendorId ? Number(d.vendorId) : null,
          hidProductId: d.productId ? Number(d.productId) : null,
          storeId: storeId || null,
          status: 1,
          secret: randomBytes(24).toString('hex'),
          expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
          boundAt: new Date(),
        },
      }).catch(() => null);
      if (created) results.push(created);
    }
    return { registered: results.length, devices: results };
  }

  async update(id, data, user?: any) {
    const d = await this.prisma.device.findUnique({ where: scopedWhere(user, { id }), select: { id: true } });
    if (!d) throw new NotFoundException('设备不存在');
    const upd: any = {};
    if (data.deviceNo !== undefined) upd.deviceNo = String(data.deviceNo);
    if (data.vendor !== undefined) upd.vendor = data.vendor;
    if (data.model !== undefined) upd.model = data.model;
    if (data.hidVendorId !== undefined) upd.hidVendorId = data.hidVendorId ? Number(data.hidVendorId) : null;
    if (data.hidProductId !== undefined) upd.hidProductId = data.hidProductId ? Number(data.hidProductId) : null;
    if (data.storeId !== undefined) upd.storeId = data.storeId;
    if (data.firmwareVersion !== undefined) upd.firmwareVersion = data.firmwareVersion;
    if (data.remark !== undefined) upd.remark = data.remark;
    if (data.expiresAt !== undefined) upd.expiresAt = data.expiresAt ? new Date(data.expiresAt) : null;
    return this.prisma.device.update({ where: scopedWhere(user, { id }), data: upd });
  }

  async remove(id, user?: any) {
    const d = await this.prisma.device.findUnique({ where: scopedWhere(user, { id }), select: { id: true } });
    if (!d) throw new NotFoundException('设备不存在');
    // 软解绑：置为离线，不硬删（保留历史检测数据，避免外键冲突）
    return this.prisma.device.update({ where: scopedWhere(user, { id }), data: { status: 0, lastHeartbeatAt: null } });
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
