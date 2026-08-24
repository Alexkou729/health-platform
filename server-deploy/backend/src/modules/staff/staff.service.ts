import { Inject, Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class StaffService {
  constructor(@Inject('PRISMA_CLIENT') private readonly prisma) {}

  async list(params) {
    const { page = 1, pageSize = 20, storeId, role, status, keyword } = params;
    const where: any = {};
    if (storeId) where.storeId = storeId;
    if (role) where.role = role;
    if (status) where.status = status;
    if (keyword) where.OR = [{ username: { contains: keyword } }, { name: { contains: keyword } }, { phone: { contains: keyword } }];
    const [items, total] = await Promise.all([
      this.prisma.staff.findMany({ where, skip: (page - 1) * pageSize, take: pageSize, orderBy: { createdAt: 'desc' }, include: { store: { select: { id: true, name: true } } } }),
      this.prisma.staff.count({ where }),
    ]);
    items.forEach((i) => delete i.password);
    return { items, total, page, pageSize };
  }

  async findOne(id) {
    const staff = await this.prisma.staff.findUnique({ where: { id }, include: { store: true } });
    if (!staff) throw new NotFoundException('员工不存在');
    delete staff.password;
    return staff;
  }

  async create(data) {
    const existing = await this.prisma.staff.findUnique({ where: { username: data.username } });
    if (existing) throw new ConflictException('用户名已存在');
    const hashed = await bcrypt.hash(data.password || '123456', 10);
    const staff = await this.prisma.staff.create({ data: { ...data, password: hashed }, include: { store: { select: { id: true, name: true } } } });
    delete staff.password;
    return staff;
  }

  async update(id, data) {
    if (data.password) data.password = await bcrypt.hash(data.password, 10);
    const staff = await this.prisma.staff.update({ where: { id }, data, include: { store: { select: { id: true, name: true } } } });
    delete staff.password;
    return staff;
  }

  async remove(id) { return this.prisma.staff.update({ where: { id }, data: { status: 'INACTIVE' } }); }

  async resetPassword(id, newPassword) {
    const hashed = await bcrypt.hash(newPassword || '123456', 10);
    return this.prisma.staff.update({ where: { id }, data: { password: hashed } });
  }
}
