import { Inject, Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { scopedWhere, isHeadOffice } from '../../common/utils/scope';

@Injectable()
export class MallOrderService {
  constructor(@Inject('PRISMA_CLIENT') private readonly prisma: any) {}

  async list(user: any, params: any = {}) {
    const { page = 1, pageSize = 20, status, storeId } = params;
    const where: any = scopedWhere(user, {});
    if (status) where.status = status;
    if (storeId && isHeadOffice(user)) where.storeId = storeId;
    const [items, total] = await Promise.all([
      this.prisma.mallOrder.findMany({
        where, skip: (Number(page) - 1) * Number(pageSize), take: Number(pageSize), orderBy: { createdAt: 'desc' },
        include: { customer: { select: { id: true, name: true, phone: true } }, store: { select: { id: true, name: true } }, items: true },
      }),
      this.prisma.mallOrder.count({ where }),
    ]);
    return { items, total, page: Number(page), pageSize: Number(pageSize) };
  }

  async accept(user: any, id: string) {
    const o = await this.prisma.mallOrder.findUnique({ where: scopedWhere(user, { id }) });
    if (!o) throw new NotFoundException('订单不存在');
    if (o.status !== 'PENDING') throw new BadRequestException('当前状态不可接单');
    return this.prisma.mallOrder.update({ where: { id }, data: { status: 'ACCEPTED' } });
  }

  async ship(user: any, id: string) {
    const o = await this.prisma.mallOrder.findUnique({ where: scopedWhere(user, { id }) });
    if (!o) throw new NotFoundException('订单不存在');
    if (o.status !== 'ACCEPTED') throw new BadRequestException('当前状态不可发货');
    return this.prisma.mallOrder.update({ where: { id }, data: { status: 'SHIPPED' } });
  }

  async complete(user: any, id: string) {
    const o = await this.prisma.mallOrder.findUnique({ where: scopedWhere(user, { id }) });
    if (!o) throw new NotFoundException('订单不存在');
    if (!['SHIPPED', 'ACCEPTED'].includes(o.status)) throw new BadRequestException('当前状态不可完成');
    const updated = await this.prisma.mallOrder.update({ where: { id }, data: { status: 'COMPLETED' } });
    // 商品销量累计 + 门店提成结算
    const items = await this.prisma.mallOrderItem.findMany({ where: { orderId: id } });
    for (const it of items) {
      await this.prisma.product.update({ where: { id: it.productId }, data: { salesCount: { increment: it.quantity } } }).catch(() => {});
    }
    return updated;
  }

  async cancel(user: any, id: string, reason?: string) {
    const o = await this.prisma.mallOrder.findUnique({ where: scopedWhere(user, { id }) });
    if (!o) throw new NotFoundException('订单不存在');
    if (['COMPLETED', 'CANCELLED'].includes(o.status)) throw new BadRequestException('当前状态不可取消');
    return this.prisma.mallOrder.update({ where: { id }, data: { status: 'CANCELLED', remark: reason || '已取消' } });
  }

  async pay(user: any, id: string) {
    if (!isHeadOffice(user)) throw new BadRequestException('仅总部可登记收款');
    const o = await this.prisma.mallOrder.findUnique({ where: { id } });
    if (!o) throw new NotFoundException('订单不存在');
    return this.prisma.mallOrder.update({ where: { id }, data: { payStatus: 'PAID', paidAt: new Date() } });
  }
}
