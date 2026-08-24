import { Inject, Injectable, NotFoundException } from '@nestjs/common';

@Injectable()
export class TaskService {
  constructor(@Inject('PRISMA_CLIENT') private readonly prisma: any) {}

  async list(params: any) {
    const { page = 1, pageSize = 20, assigneeId, assignerId, storeId, status, type, priority, customerId } = params;
    const where: any = {};
    if (assigneeId) where.assigneeId = assigneeId;
    if (assignerId) where.assignerId = assignerId;
    if (storeId) where.storeId = storeId;
    if (status) where.status = status;
    if (type) where.type = type;
    if (priority) where.priority = priority;
    if (customerId) where.customerId = customerId;
    const [items, total] = await Promise.all([
      this.prisma.task.findMany({ where, skip: (page-1)*pageSize, take: pageSize, orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }], include: { customer: { select: { id: true, name: true, phone: true } }, assignee: { select: { id: true, name: true } }, assigner: { select: { id: true, name: true } } } }),
      this.prisma.task.count({ where }),
    ]);
    return { items, total, page, pageSize };
  }

  async findOne(id: string) {
    const t = await this.prisma.task.findUnique({ where: { id }, include: { customer: true, assignee: true, assigner: true, plan: true } });
    if (!t) throw new NotFoundException('任务不存在');
    return t;
  }
  async create(data: any) { return this.prisma.task.create({ data }); }
  async update(id: string, data: any) { return this.prisma.task.update({ where: { id }, data }); }
  async start(id: string) { return this.prisma.task.update({ where: { id }, data: { status: 'IN_PROGRESS' } }); }
  async complete(id: string, result?: string) { return this.prisma.task.update({ where: { id }, data: { status: 'COMPLETED', completedAt: new Date(), result } }); }
  async cancel(id: string) { return this.prisma.task.update({ where: { id }, data: { status: 'CANCELLED' } }); }

  async myTodos(staffId: string, status = 'PENDING') {
    return this.prisma.task.findMany({ where: { assigneeId: staffId, status }, orderBy: [{ priority: 'desc' }, { dueDate: 'asc' }], include: { customer: { select: { name: true, phone: true } } } });
  }

  async getMyStats(staffId: string) {
    const today = new Date(); today.setHours(0,0,0,0);
    const [pending, inProgress, completedToday, total] = await Promise.all([
      this.prisma.task.count({ where: { assigneeId: staffId, status: 'PENDING' } }),
      this.prisma.task.count({ where: { assigneeId: staffId, status: 'IN_PROGRESS' } }),
      this.prisma.task.count({ where: { assigneeId: staffId, status: 'COMPLETED', completedAt: { gte: today } } }),
      this.prisma.task.count({ where: { assigneeId: staffId } }),
    ]);
    return { pending, inProgress, completedToday, total };
  }
}
