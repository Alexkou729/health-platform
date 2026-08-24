import { Inject, Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { scopedWhere, isHeadOffice, genNo } from '../../common/utils/scope';

@Injectable()
export class ProductService {
  constructor(@Inject('PRISMA_CLIENT') private readonly prisma: any) {}

  /** 商品列表：总台看全部；门店看总台已上架 + 自己门店商品 */
  async list(user: any, params: any = {}) {
    const { category, status, keyword } = params;
    const where: any = {};
    if (category) where.category = category;
    if (status) where.status = status;
    if (keyword) where.OR = [{ name: { contains: keyword } }, { description: { contains: keyword } }];
    if (isHeadOffice(user)) {
      // 总台看全部
    } else if (user?.storeId) {
      // 门店：看总台已上架 + 自己门店商品
      where.OR = [
        { storeId: { not: user.storeId }, status: 'ACTIVE' },
        { storeId: user.storeId },
      ];
    }
    return this.prisma.product.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { store: { select: { id: true, name: true } } },
    });
  }

  /** 创建商品：总台可直接上架；门店提交为待审核 */
  async create(user: any, data: any) {
    const storeId = isHeadOffice(user) ? (data.storeId || user.storeId) : user.storeId;
    if (!storeId) throw new ForbiddenException('门店信息缺失');
    return this.prisma.product.create({
      data: {
        storeId,
        name: data.name,
        category: data.category || 'HEALTH',
        price: Number(data.price) || 0,
        originalPrice: data.originalPrice ? Number(data.originalPrice) : null,
        stock: Number(data.stock) || 0,
        coverUrl: data.coverUrl || null,
        images: JSON.stringify(data.images || []),
        description: data.description || null,
        status: isHeadOffice(user) ? 'ACTIVE' : 'PENDING',
        commissionRate: Number(data.commissionRate) || 0,
      },
    });
  }

  async update(user: any, id: string, data: any) {
    const p = await this.prisma.product.findUnique({ where: { id } });
    if (!p) throw new NotFoundException('商品不存在');
    if (!isHeadOffice(user) && p.storeId !== user.storeId) throw new ForbiddenException('无权修改该商品');
    const upd: any = {};
    if (data.name !== undefined) upd.name = data.name;
    if (data.category !== undefined) upd.category = data.category;
    if (data.price !== undefined) upd.price = Number(data.price);
    if (data.originalPrice !== undefined) upd.originalPrice = data.originalPrice ? Number(data.originalPrice) : null;
    if (data.stock !== undefined) upd.stock = Number(data.stock);
    if (data.coverUrl !== undefined) upd.coverUrl = data.coverUrl;
    if (data.images !== undefined) upd.images = JSON.stringify(data.images);
    if (data.description !== undefined) upd.description = data.description;
    if (isHeadOffice(user)) {
      if (data.commissionRate !== undefined) upd.commissionRate = Number(data.commissionRate);
      if (data.status !== undefined) upd.status = data.status;
    }
    return this.prisma.product.update({ where: { id }, data: upd });
  }

  /** 总台审核门店商品（上架/驳回） */
  async audit(user: any, id: string, approve: boolean, remark?: string) {
    if (!isHeadOffice(user)) throw new ForbiddenException('仅总部可审核商品');
    const p = await this.prisma.product.findUnique({ where: { id } });
    if (!p) throw new NotFoundException('商品不存在');
    return this.prisma.product.update({
      where: { id },
      data: {
        status: approve ? 'ACTIVE' : 'REJECTED',
        auditRemark: remark || null,
        auditedBy: user.sub,
        auditedAt: new Date(),
      },
    });
  }

  async remove(user: any, id: string) {
    const p = await this.prisma.product.findUnique({ where: { id } });
    if (!p) throw new NotFoundException('商品不存在');
    if (!isHeadOffice(user) && p.storeId !== user.storeId) throw new ForbiddenException('无权删除该商品');
    return this.prisma.product.delete({ where: { id } });
  }
}
