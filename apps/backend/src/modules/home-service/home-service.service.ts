import { Inject, Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { scopedWhere, isHeadOffice, genNo } from '../../common/utils/scope';

@Injectable()
export class HomeServiceService {
  constructor(@Inject('PRISMA_CLIENT') private readonly prisma: any) {}

  // ============ 上门服务项目 ============
  async listServices(params: any = {}) {
    const { category, status } = params;
    const where: any = {};
    if (category) where.category = category;
    if (status) where.status = status;
    return this.prisma.homeService.findMany({ where, orderBy: { createdAt: 'desc' } });
  }

  async createService(user: any, data: any) {
    if (!isHeadOffice(user)) throw new ForbiddenException('仅总部可新增服务项目');
    return this.prisma.homeService.create({
      data: {
        name: data.name,
        category: data.category || 'THERAPY',
        price: Number(data.price) || 0,
        durationMin: Number(data.durationMin) || 60,
        description: data.description || null,
        coverUrl: data.coverUrl || null,
      },
    });
  }

  // ============ 上门服务订单 ============
  async listOrders(user: any, params: any = {}) {
    const { page = 1, pageSize = 20, status, storeId } = params;
    const where: any = scopedWhere(user, {});
    if (status) where.status = status;
    if (storeId && isHeadOffice(user)) where.storeId = storeId;
    const [items, total] = await Promise.all([
      this.prisma.homeServiceOrder.findMany({
        where, skip: (Number(page) - 1) * Number(pageSize), take: Number(pageSize), orderBy: { createdAt: 'desc' },
        include: {
          customer: { select: { id: true, name: true, phone: true } },
          store: { select: { id: true, name: true } },
          service: { select: { id: true, name: true, category: true } },
        },
      }),
      this.prisma.homeServiceOrder.count({ where }),
    ]);
    return { items, total, page: Number(page), pageSize: Number(pageSize) };
  }

  /** 总台排单：把订单派给指定门店 */
  async assign(user: any, id: string, storeId: string) {
    if (!isHeadOffice(user)) throw new ForbiddenException('仅总部可排单');
    const o = await this.prisma.homeServiceOrder.findUnique({ where: { id } });
    if (!o) throw new NotFoundException('订单不存在');
    if (o.status !== 'PENDING') throw new BadRequestException('当前状态不可排单');
    return this.prisma.homeServiceOrder.update({ where: { id }, data: { storeId, status: 'ASSIGNED' } });
  }

  /** 门店接单 */
  async accept(user: any, id: string) {
    const o = await this.prisma.homeServiceOrder.findUnique({ where: scopedWhere(user, { id }) });
    if (!o) throw new NotFoundException('订单不存在');
    if (o.status !== 'ASSIGNED') throw new BadRequestException('当前状态不可接单');
    return this.prisma.homeServiceOrder.update({ where: { id }, data: { status: 'ACCEPTED' } });
  }

  /** 门店开始服务 */
  async start(user: any, id: string) {
    const o = await this.prisma.homeServiceOrder.findUnique({ where: scopedWhere(user, { id }) });
    if (!o) throw new NotFoundException('订单不存在');
    if (o.status !== 'ACCEPTED') throw new BadRequestException('当前状态不可开始服务');
    return this.prisma.homeServiceOrder.update({ where: { id }, data: { status: 'SERVING' } });
  }

  /** 门店完成服务（触发结算记录） */
  async complete(user: any, id: string) {
    const o = await this.prisma.homeServiceOrder.findUnique({ where: scopedWhere(user, { id }) });
    if (!o) throw new NotFoundException('订单不存在');
    if (o.status !== 'SERVING') throw new BadRequestException('当前状态不可完成');
    const updated = await this.prisma.homeServiceOrder.update({
      where: { id }, data: { status: 'COMPLETED', completedAt: new Date() },
    });
    await this.createSettlement(o);
    return updated;
  }

  async cancel(user: any, id: string, reason?: string) {
    const o = await this.prisma.homeServiceOrder.findUnique({ where: scopedWhere(user, { id }) });
    if (!o) throw new NotFoundException('订单不存在');
    if (['COMPLETED', 'CANCELLED'].includes(o.status)) throw new BadRequestException('当前状态不可取消');
    return this.prisma.homeServiceOrder.update({ where: { id }, data: { status: 'CANCELLED', remark: reason || '已取消' } });
  }

  async pay(user: any, id: string, method: string) {
    if (!isHeadOffice(user)) throw new ForbiddenException('仅总部可登记收款');
    const o = await this.prisma.homeServiceOrder.findUnique({ where: { id } });
    if (!o) throw new NotFoundException('订单不存在');
    return this.prisma.homeServiceOrder.update({ where: { id }, data: { payStatus: 'PAID' } });
  }

  /** 服务完成生成门店结算记录 */
  private async createSettlement(order: any) {
    const ratio = await this.getStoreRatio(order.storeId);
    const amount = Math.round(order.totalAmount * ratio * 100) / 100;
    return this.prisma.invoice.create({
      data: {
        invoiceNo: genNo('ST'),
        storeId: order.storeId,
        type: 'HOME_SERVICE',
        amount,
        status: 'PENDING',
      },
    }).catch(() => null);
  }

  async getStoreRatio(storeId: string): Promise<number> {
    const s = await this.prisma.storeSettlement.findUnique({ where: { storeId } });
    return s?.ratio ?? 0.8;
  }
}
