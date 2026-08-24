import { Inject, Injectable, NotFoundException } from '@nestjs/common';

@Injectable()
export class StoreService {
  constructor(@Inject('PRISMA_CLIENT') private readonly prisma) {}

  async list() {
    return this.prisma.store.findMany({
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { customers: true, staff: true, devices: true, orders: true } } },
    });
  }

  async findOne(id) {
    const store = await this.prisma.store.findUnique({ where: { id }, include: { _count: { select: { customers: true, staff: true, devices: true } } } });
    if (!store) throw new NotFoundException('门店不存在');
    return store;
  }

  async create(data) { return this.prisma.store.create({ data }); }
  async update(id, data) { return this.prisma.store.update({ where: { id }, data }); }
  async remove(id) { return this.prisma.store.update({ where: { id }, data: { status: 'INACTIVE' } }); }
}
