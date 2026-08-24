import { Inject, Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { scopedWhere } from '../../common/utils/scope';

@Injectable()
export class AppointmentService {
  constructor(@Inject('PRISMA_CLIENT') private readonly prisma: any) {}

  async list(params: any, user?: any) {
    const { page = 1, pageSize = 20, customerId, storeId, staffId, status, startDate, endDate, serviceType, keyword } = params;
    const pageNum = Math.max(1, parseInt(String(page), 10) || 1);
    const pageSizeNum = Math.min(100, parseInt(String(pageSize), 10) || 20);
    const where: any = scopedWhere(user, {});
    if (customerId) where.customerId = customerId;
    if (storeId) where.storeId = storeId;
    if (staffId) where.staffId = staffId;
    if (status) where.status = status;
    if (serviceType) where.serviceType = serviceType;
    if (startDate || endDate) {
      where.scheduledAt = {};
      if (startDate) where.scheduledAt.gte = new Date(startDate);
      if (endDate) where.scheduledAt.lte = new Date(endDate);
    }
    if (keyword) where.customer = { OR: [{ name: { contains: keyword } }, { phone: { contains: keyword } }] };
    const [items, total] = await Promise.all([
      this.prisma.appointment.findMany({ where, skip: (pageNum-1)*pageSizeNum, take: pageSizeNum, orderBy: { scheduledAt: 'asc' }, include: { customer: { select: { id: true, name: true, phone: true } }, staff: { select: { id: true, name: true } }, services: true } }),
      this.prisma.appointment.count({ where }),
    ]);
    return { items, total, page: pageNum, pageSize: pageSizeNum };
  }

  async findOne(id: string, user?: any) {
    const a = await this.prisma.appointment.findUnique({ where: scopedWhere(user, { id }), include: { customer: true, staff: true, services: true, plan: true } });
    if (!a) throw new NotFoundException('预约不存在');
    return a;
  }

  async create(data: any, user?: any) {
    // 门店归属：总部可指定门店，否则默认当前账号所属门店
    if (!data.storeId) data.storeId = user?.storeId;
    if (!data.storeId) {
      const store = await this.prisma.store.findFirst();
      if (store) data.storeId = store.id;
    }
    if (data.staffId === '' || data.staffId === null) delete data.staffId;
    if (data.planId === '' || data.planId === null) delete data.planId;
    if (data.staffId) {
      const start = new Date(data.scheduledAt);
      const conflict = await this.prisma.appointment.findFirst({ where: { staffId: data.staffId, status: { in: ['PENDING','CONFIRMED','IN_PROGRESS'] }, scheduledAt: { gte: new Date(start.getTime() - 24*60*60*1000), lt: new Date(start.getTime() + 24*60*60*1000) } } });
      if (conflict) throw new BadRequestException('该时段员工已被预约');
    }
    const { services = [], ...appt } = data;
    const cleanServices = services.map((s: any) => ({
      serviceName: s.serviceName || s.name || appt.serviceName,
      price: Number(s.price) || 0,
      durationMin: Number(s.durationMin) || appt.durationMin || 30,
      staffId: s.staffId || null,
      remark: s.remark || null,
    }));
    return this.prisma.appointment.create({ data: { ...appt, services: { create: cleanServices } }, include: { services: true, customer: true, staff: true } });
  }

  async update(id: string, data: any) { return this.prisma.appointment.update({ where: { id }, data }); }
  async confirm(id: string) { return this.prisma.appointment.update({ where: { id }, data: { status: 'CONFIRMED', confirmedAt: new Date() } }); }
  async start(id: string) { return this.prisma.appointment.update({ where: { id }, data: { status: 'IN_PROGRESS', startedAt: new Date() } }); }
  async complete(id: string, staffNotes?: string) { return this.prisma.appointment.update({ where: { id }, data: { status: 'COMPLETED', completedAt: new Date(), staffNotes } }); }
  async cancel(id: string, reason: string) { return this.prisma.appointment.update({ where: { id }, data: { status: 'CANCELLED', cancelReason: reason } }); }
  async assignStaff(id: string, staffId: string) { return this.prisma.appointment.update({ where: { id }, data: { staffId } }); }

  async today(storeId?: string) {
    const today = new Date(); today.setHours(0,0,0,0);
    const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);
    const where: any = { scheduledAt: { gte: today, lt: tomorrow } };
    if (storeId) where.storeId = storeId;
    return this.prisma.appointment.findMany({ where, orderBy: { scheduledAt: 'asc' }, include: { customer: { select: { name: true, phone: true } }, staff: { select: { name: true } } } });
  }

  async getCalendar(storeId: string, year: number, month: number) {
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 1);
    const where: any = { scheduledAt: { gte: start, lt: end } };
    if (storeId) where.storeId = storeId;
    return this.prisma.appointment.findMany({ where, orderBy: { scheduledAt: 'asc' }, include: { customer: { select: { name: true } }, staff: { select: { name: true } } } });
  }
}
