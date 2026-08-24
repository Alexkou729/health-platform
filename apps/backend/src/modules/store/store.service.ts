import { Inject, Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';

@Injectable()
export class StoreService {
  constructor(@Inject('PRISMA_CLIENT') private readonly prisma) {}

  async list(user?: any) {
    const where: any = {};
    if (user?.role !== 'SUPER_ADMIN' && user?.storeId) where.id = user.storeId;
    return this.prisma.store.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { customers: true, staff: true, devices: true, orders: true } } },
    });
  }

  async findOne(id, user?: any) {
    if (user && user.role !== 'SUPER_ADMIN' && user.storeId && user.storeId !== id) {
      throw new ForbiddenException('无权访问该门店');
    }
    const store = await this.prisma.store.findUnique({ where: { id }, include: { _count: { select: { customers: true, staff: true, devices: true } } } });
    if (!store) throw new NotFoundException('门店不存在');
    return store;
  }

  async create(data) { return this.prisma.store.create({ data }); }
  async update(id, data) { return this.prisma.store.update({ where: { id }, data }); }
  async remove(id) { return this.prisma.store.update({ where: { id }, data: { status: 'INACTIVE' } }); }
}
