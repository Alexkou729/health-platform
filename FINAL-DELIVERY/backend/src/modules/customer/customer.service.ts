import { Inject, Injectable, NotFoundException, ConflictException } from '@nestjs/common';

@Injectable()
export class CustomerService {
  constructor(@Inject('PRISMA_CLIENT') private readonly prisma: any) {}

  async list(params: {
    page?: number; pageSize?: number; keyword?: string;
    storeId?: string; consultantId?: string; level?: string;
    tag?: string; source?: string;
  }) {
    const { page = 1, pageSize = 20, keyword, storeId, consultantId, level, tag, source } = params;
    const where: any = { status: { not: 'BLACKLIST' } };
    if (keyword) {
      where.OR = [
        { name: { contains: keyword, mode: 'insensitive' } },
        { phone: { contains: keyword } },
        { wechatNickname: { contains: keyword, mode: 'insensitive' } },
      ];
    }
    if (storeId) where.storeId = storeId;
    if (consultantId) where.consultantId = consultantId;
    if (level) where.level = level;
    if (source) where.source = source;
    if (tag) where.tags = { contains: tag };

    const [items, total] = await Promise.all([
      this.prisma.customer.findMany({
        where, skip: (page - 1) * pageSize, take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          store: { select: { id: true, name: true } },
          consultant: { select: { id: true, name: true, avatarUrl: true } },
        },
      }),
      this.prisma.customer.count({ where }),
    ]);

    return { items: items.map(this.parseCustomer), total, page, pageSize };
  }

  async findOne(id: string) {
    const customer = await this.prisma.customer.findUnique({
      where: { id },
      include: {
        store: true,
        consultant: { select: { id: true, name: true, phone: true, avatarUrl: true } },
        detections: {
          orderBy: { createdAt: 'desc' }, take: 10,
          include: { device: { select: { deviceNo: true } } },
        },
        orders: { orderBy: { createdAt: 'desc' }, take: 10 },
      },
    });
    if (!customer) throw new NotFoundException('客户不存在');
    return this.parseCustomer(customer);
  }

  async create(data: any) {
    const existing = await this.prisma.customer.findUnique({ where: { phone: data.phone } });
    if (existing) throw new ConflictException('该手机号已存在');
    if (data.birthday) data.age = this.calcAge(new Date(data.birthday));
    return this.prisma.customer.create({
      data: { ...data, tags: data.tags ? JSON.stringify(data.tags) : '[]' },
    });
  }

  async update(id: string, data: any) {
    if (data.birthday) data.age = this.calcAge(new Date(data.birthday));
    if (data.tags) data.tags = JSON.stringify(data.tags);
    return this.prisma.customer.update({ where: { id }, data });
  }

  async remove(id: string) {
    return this.prisma.customer.update({ where: { id }, data: { status: 'INACTIVE' } });
  }

  async getDetectionHistory(id: string) {
    return this.prisma.detection.findMany({
      where: { customerId: id },
      orderBy: { createdAt: 'desc' },
      include: {
        reports: { select: { id: true, templateCode: true, title: true, score: true, createdAt: true, thumbnailUrl: true } },
      },
    });
  }

  async getStatistics(storeId?: string) {
    const where: any = { status: 'ACTIVE' };
    if (storeId) where.storeId = storeId;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const [total, todayNew, byLevel, bySource, byGender] = await Promise.all([
      this.prisma.customer.count({ where }),
      this.prisma.customer.count({ where: { ...where, createdAt: { gte: today } } }),
      this.prisma.customer.groupBy({ by: ['level'], where, _count: true }),
      this.prisma.customer.groupBy({ by: ['source'], where, _count: true }),
      this.prisma.customer.groupBy({ by: ['gender'], where, _count: true }),
    ]);
    return { total, todayNew, byLevel, bySource, byGender };
  }

  private calcAge(birthday: Date): number {
    const today = new Date();
    let age = today.getFullYear() - birthday.getFullYear();
    const m = today.getMonth() - birthday.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthday.getDate())) age--;
    return age;
  }

  private parseCustomer(c: any) {
    if (!c) return c;
    if (typeof c.tags === 'string') {
      try { c.tags = JSON.parse(c.tags); } catch { c.tags = []; }
    }
    return c;
  }
}
