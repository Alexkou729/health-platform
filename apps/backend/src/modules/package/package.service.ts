import { Inject, Injectable, NotFoundException } from '@nestjs/common';

@Injectable()
export class PackageService {
  constructor(@Inject('PRISMA_CLIENT') private readonly prisma) {}

  async list(params) {
    const { page = 1, pageSize = 20, storeId, type, status, keyword } = params;
    const where: any = {};
    if (storeId) where.storeId = storeId;
    if (type) where.type = type;
    if (status) where.status = status;
    if (keyword) where.OR = [{ name: { contains: keyword } }, { code: { contains: keyword } }];
    const [items, total] = await Promise.all([
      this.prisma.package.findMany({ where, skip: (page - 1) * pageSize, take: pageSize, orderBy: { sortOrder: 'desc' } }),
      this.prisma.package.count({ where }),
    ]);
    return { items: items.map((i) => this.parsePackage(i)), total, page, pageSize };
  }

  async findOne(id) {
    const pkg = await this.prisma.package.findUnique({ where: { id } });
    if (!pkg) throw new NotFoundException('套餐不存在');
    return this.parsePackage(pkg);
  }

  async create(data) {
    return this.prisma.package.create({
      data: {
        ...data,
        applicableTemplates: JSON.stringify(data.applicableTemplates || []),
        giftServices: JSON.stringify(data.giftServices || []),
        tags: JSON.stringify(data.tags || []),
      },
    });
  }

  async update(id, data) {
    if (data.applicableTemplates !== undefined) data.applicableTemplates = JSON.stringify(data.applicableTemplates || []);
    if (data.giftServices !== undefined) data.giftServices = JSON.stringify(data.giftServices || []);
    if (data.tags !== undefined) data.tags = JSON.stringify(data.tags || []);
    const pkg = await this.prisma.package.update({ where: { id }, data });
    return this.parsePackage(pkg);
  }

  async remove(id) { return this.prisma.package.update({ where: { id }, data: { status: 'INACTIVE' } }); }

  private parsePackage(pkg) {
    if (!pkg) return pkg;
    for (const key of ['applicableTemplates', 'giftServices', 'tags']) {
      if (typeof pkg[key] === 'string') {
        try { pkg[key] = JSON.parse(pkg[key]); } catch { pkg[key] = []; }
      }
    }
    return pkg;
  }
}
