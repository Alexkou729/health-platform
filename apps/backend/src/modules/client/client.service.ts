import { Inject, Injectable, UnauthorizedException, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { genNo } from '../../common/utils/scope';

@Injectable()
export class ClientService {
  constructor(
    @Inject('PRISMA_CLIENT') private readonly prisma: any,
    private readonly jwt: JwtService,
  ) {}

  /** 发送验证码（当前开发模式直接返回，后续接短信服务商） */
  async sendCode(phone: string) {
    const code = String(Math.floor(100000 + Math.random() * 900000));
    await this.prisma.phoneVerifyCode.create({
      data: { phone, code, expiresAt: new Date(Date.now() + 5 * 60 * 1000) },
    });
    return { phone, code, devMode: true, message: '验证码已生成（生产环境将改为短信下发）' };
  }

  /** 手机号验证码登录：绑定/创建后台客户，返回客户令牌 */
  async login(phone: string, code: string, storeId?: string) {
    const vc = await this.prisma.phoneVerifyCode.findFirst({
      where: { phone, code, used: false, expiresAt: { gte: new Date() } },
      orderBy: { createdAt: 'desc' },
    });
    if (!vc) throw new UnauthorizedException('验证码错误或已过期');
    await this.prisma.phoneVerifyCode.update({ where: { id: vc.id }, data: { used: true } });

    let customer = await this.prisma.customer.findUnique({ where: { phone } });
    if (!customer) {
      let sid = storeId;
      if (!sid) {
        const store = await this.prisma.store.findFirst({ where: { isHeadOffice: true } });
        sid = store?.id;
      }
      customer = await this.prisma.customer.create({
        data: { name: '微信用户' + phone.slice(-4), phone, storeId: sid, source: 'WECHAT_MINI' },
      });
    }
    const token = this.jwt.sign({ sub: customer.id, type: 'customer', phone: customer.phone }, { expiresIn: '30d' });
    return { token, customer: { id: customer.id, name: customer.name, phone: customer.phone, level: customer.level } };
  }

  /** 商城商品（已上架） */
  async listProducts(category?: string) {
    const where: any = { status: 'ACTIVE' };
    if (category) where.category = category;
    return this.prisma.product.findMany({ where, orderBy: { createdAt: 'desc' }, include: { store: { select: { id: true, name: true } } } });
  }

  /** 上门服务项目（启用） */
  async listHomeServices() {
    return this.prisma.homeService.findMany({ where: { status: 'ACTIVE' }, orderBy: { createdAt: 'desc' } });
  }

  /** 商城下单 */
  async createMallOrder(customer: any, data: any) {
    const items = data.items || [];
    if (items.length === 0) throw new UnauthorizedException('请选择商品');
    let total = 0;
    const orderItems = [];
    for (const it of items) {
      const p = await this.prisma.product.findUnique({ where: { id: it.productId } });
      if (!p || p.status !== 'ACTIVE') throw new UnauthorizedException('商品不存在或已下架');
      const qty = Number(it.quantity) || 1;
      const subtotal = Math.round(p.price * qty * 100) / 100;
      total += subtotal;
      orderItems.push({ productId: p.id, name: p.name, price: p.price, quantity: qty, subtotal });
    }
    // 优先按商品归属门店下单；否则总部默认店
    const firstProduct = await this.prisma.product.findUnique({ where: { id: orderItems[0].productId } });
    const storeId = firstProduct.storeId;
    return this.prisma.mallOrder.create({
      data: {
        orderNo: genNo('MO'),
        customerId: customer.sub,
        storeId,
        status: 'PENDING',
        totalAmount: Math.round(total * 100) / 100,
        contactName: data.contactName || null,
        contactPhone: data.contactPhone || customer.phone,
        address: data.address || null,
        remark: data.remark || null,
        items: { create: orderItems },
      },
      include: { items: true },
    });
  }

  /** 上门服务下单 */
  async createHomeServiceOrder(customer: any, data: any) {
    const svc = await this.prisma.homeService.findUnique({ where: { id: data.serviceId } });
    if (!svc || svc.status !== 'ACTIVE') throw new UnauthorizedException('服务不存在或已下线');
    const store = await this.prisma.store.findFirst({ where: { isHeadOffice: true } });
    return this.prisma.homeServiceOrder.create({
      data: {
        orderNo: genNo('HO'),
        customerId: customer.sub,
        storeId: data.storeId || store?.id,
        serviceId: svc.id,
        serviceName: svc.name,
        scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : new Date(),
        address: data.address,
        contactName: data.contactName || null,
        contactPhone: data.contactPhone || customer.phone,
        totalAmount: svc.price,
        remark: data.remark || null,
      },
    });
  }

  /** 我的商城订单 */
  async myMallOrders(customer: any) {
    return this.prisma.mallOrder.findMany({
      where: { customerId: customer.sub },
      orderBy: { createdAt: 'desc' },
      include: { items: true },
    });
  }

  /** 我的上门服务订单 */
  async myHomeServiceOrders(customer: any) {
    return this.prisma.homeServiceOrder.findMany({
      where: { customerId: customer.sub },
      orderBy: { createdAt: 'desc' },
      include: { service: { select: { id: true, name: true, category: true } } },
    });
  }

  /** 我的报告 */
  async myReports(customer: any) {
    return this.prisma.report.findMany({
      where: { customerId: customer.sub },
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: { id: true, title: true, score: true, conclusion: true, isDemo: true, createdAt: true },
    });
  }

  /** 我的调理方案 */
  async myCarePlans(customer: any) {
    return this.prisma.carePlan.findMany({
      where: { customerId: customer.sub },
      orderBy: { createdAt: 'desc' },
      include: { items: true },
    });
  }

  /** 我的优惠券 */
  async myCoupons(customer: any) {
    return this.prisma.customerCoupon.findMany({
      where: { customerId: customer.sub, status: 'UNUSED', expiresAt: { gte: new Date() } },
      include: { coupon: true },
    });
  }
}
