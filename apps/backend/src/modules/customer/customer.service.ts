import { Inject, Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { scopedWhere } from '../../common/utils/scope';

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
        { name: { contains: keyword } },
        { phone: { contains: keyword } },
        { wechatNickname: { contains: keyword } },
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

  async findOne(id: string, user?: any) {
    const customer = await this.prisma.customer.findUnique({
      where: scopedWhere(user, { id }),
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
      // 防御：数字字段转 Number，日期转 Date
      data = this.normalizeData(this.pickCustomerFields(data));
      // 自动找门店
      if (!data.storeId) {
        const store = await this.prisma.store.findFirst();
        if (store) data.storeId = store.id;
      }
      // 生日转换
      if (data.birthday) {
        data.birthday = new Date(data.birthday);
        data.age = this.calcAge(new Date(data.birthday));
      }
      const existing = await this.prisma.customer.findUnique({ where: { phone: data.phone } });
      if (existing) throw new ConflictException('该手机号已存在');
      return this.prisma.customer.create({
        data: { ...data, tags: data.tags ? JSON.stringify(data.tags) : '[]' },
      });
    }

    async update(id: string, data: any, user?: any) {
      await this.ensureOwned(id, user);
      // 防御：数字字段转 Number，日期转 Date
      data = this.normalizeData(this.pickCustomerFields(data));
      if (data.birthday) {
        data.birthday = new Date(data.birthday);
        data.age = this.calcAge(new Date(data.birthday));
      }
      if (data.tags !== undefined && data.tags !== null) data.tags = JSON.stringify(data.tags);
      return this.prisma.customer.update({ where: scopedWhere(user, { id }), data });
    }

    /**
     * 客户字段白名单：剔除前端误传的 id / store / consultant / 关联对象等非法字段
     */
    private pickCustomerFields(data: any): any {
      const keys = [
        'name', 'phone', 'gender', 'birthday', 'age', 'heightCm', 'weightKg',
        'wechatNickname', 'avatarUrl', 'storeId', 'consultantId', 'level',
        'tags', 'remark', 'source', 'status',
      ];
      const out: any = {};
      for (const k of keys) {
        if (data && data[k] !== undefined) out[k] = data[k];
      }
      return out;
    }

    /**
     * 数据规范化：数字字段统一转 Number，容错前端各种类型
     */
    private normalizeData(data: any): any {
      const numFields = ['gender', 'age', 'heightCm', 'weightKg', 'totalSpent', 'totalDetections'];
      for (const key of numFields) {
        if (data[key] !== undefined && data[key] !== null && data[key] !== '') {
          const n = Number(data[key]);
          if (!isNaN(n)) data[key] = n;
        }
      }
      // 空生日删除（避免 Prisma 报错）
      if (data.birthday === '' || data.birthday === undefined || data.birthday === null) {
        delete data.birthday;
      }
      return data;
    }

  async remove(id: string, user?: any) {
    await this.ensureOwned(id, user);
    return this.prisma.customer.update({ where: scopedWhere(user, { id }), data: { status: 'INACTIVE' } });
  }

  async getDetectionHistory(id: string, user?: any) {
    await this.ensureOwned(id, user);
    return this.prisma.detection.findMany({
      where: scopedWhere(user, { customerId: id }),
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

  /** 校验资源归属：非总部用户只能访问本店资源，越权返回 404（不暴露存在性） */
  private async ensureOwned(id: string, user?: any) {
    if (!user || user.role === 'SUPER_ADMIN') return;
    const c = await this.prisma.customer.findUnique({ where: scopedWhere(user, { id }), select: { id: true } });
    if (!c) throw new NotFoundException('客户不存在');
  }

  private parseCustomer(c: any) {
    if (!c) return c;
    if (typeof c.tags === 'string') {
      try { c.tags = JSON.parse(c.tags); } catch { c.tags = []; }
    }
    return c;
  }
}
