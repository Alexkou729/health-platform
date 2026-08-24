import { Inject, Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { scopedWhere, isHeadOffice, genNo } from '../../common/utils/scope';
import { AIService } from '../ai/ai.service';
import { AiSettingsService } from '../ai/ai-settings.service';
import * as bcrypt from 'bcryptjs';

const PRICING: Record<string, number> = {
  AI_REPORT: 9.9,
  CARE_PLAN: 99,
  CONSULTATION: 99,
  DEVICE_SALE: 0,
};

@Injectable()
export class FranchiseService {
  constructor(
    @Inject('PRISMA_CLIENT') private readonly prisma: any,
    private readonly aiService: AIService,
    private readonly aiSettings: AiSettingsService,
  ) {}

  // ============================================================
  // AI 接口配置（总台专属）
  // ============================================================
  async getAiConfig(user: any) {
    if (!isHeadOffice(user)) throw new ForbiddenException('仅总部可配置 AI 接口');
    const cfg = await this.aiSettings.get();
    return {
      provider: cfg.provider,
      baseUrl: cfg.baseUrl,
      model: cfg.model,
      apiKeyMasked: cfg.apiKey ? (cfg.apiKey.slice(0, 4) + '****' + cfg.apiKey.slice(-4)) : '',
      configured: !!cfg.apiKey,
      providers: this.aiSettings.listProviders(),
    };
  }

  async setAiConfig(user: any, data: any) {
    if (!isHeadOffice(user)) throw new ForbiddenException('仅总部可配置 AI 接口');
    const current = await this.aiSettings.get();
    // 切换供应商且未填新 Key 时，清除旧 Key，避免旧 Key 打到新供应商
    if (data?.provider && data.provider !== current.provider && !data.apiKey) {
      await this.prisma.systemConfig.deleteMany({ where: { key: 'ai.apiKey' } });
    }
    // 切换供应商且未显式指定 baseUrl/model 时，自动套用该供应商默认值
    if (data?.provider && (data.baseUrl === undefined || data.baseUrl === null || data.baseUrl === '') &&
        (data.model === undefined || data.model === null || data.model === '')) {
      const d = this.aiSettings.listProviders().find((p) => p.code === data.provider);
      if (d) { data.baseUrl = d.baseUrl; data.model = d.model; }
    }
    const saved = await this.aiSettings.set(data);
    return {
      provider: saved.provider,
      baseUrl: saved.baseUrl,
      model: saved.model,
      configured: !!saved.apiKey,
    };
  }

  // ============================================================
  // 服务工单（商家 -> 总部）
  // ============================================================
  async listRequests(user: any, params: any) {
    const page = Math.max(1, parseInt(String(params?.page), 10) || 1);
    const pageSize = Math.min(100, parseInt(String(params?.pageSize), 10) || 20);
    const where: any = scopedWhere(user, {});
    if (params?.type) where.type = params.type;
    if (params?.status) where.status = params.status;
    if (params?.storeId && isHeadOffice(user)) where.storeId = params.storeId;
    if (params?.keyword) {
      where.OR = [
        { requestNo: { contains: params.keyword } },
        { title: { contains: params.keyword } },
      ];
    }
    const [items, total] = await Promise.all([
      this.prisma.serviceRequest.findMany({
        where, skip: (page - 1) * pageSize, take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          store: { select: { id: true, name: true, code: true } },
          customer: { select: { id: true, name: true, phone: true, gender: true, age: true } },
        },
      }),
      this.prisma.serviceRequest.count({ where }),
    ]);
    return { items, total, page, pageSize };
  }

  async findRequest(user: any, id: string) {
    const req = await this.prisma.serviceRequest.findUnique({
      where: { id },
      include: {
        store: true,
        customer: true,
      },
    });
    if (!req) throw new NotFoundException('工单不存在');
    if (!isHeadOffice(user) && req.storeId !== user?.storeId) throw new ForbiddenException('无权访问该工单');
    return req;
  }

  async createRequest(user: any, data: any) {
    const type = data?.type || 'AI_REPORT';
    const price = data?.price != null ? Number(data.price) : (PRICING[type] || 0);
    const quantity = Math.max(1, Number(data?.quantity) || 1);
    const storeId = isHeadOffice(user) ? data?.storeId || user?.storeId : user?.storeId;
    if (!storeId) throw new BadRequestException('门店信息缺失，请重新登录');
    const payload = data?.payload ? JSON.stringify(data.payload) : null;
    return this.prisma.serviceRequest.create({
      data: {
        requestNo: genNo('SR'),
        storeId,
        customerId: data?.customerId || null,
        type,
        title: data?.title || this.typeLabel(type),
        description: data?.description || null,
        price,
        quantity,
        totalAmount: price * quantity,
        payload,
        status: 'PENDING',
      },
    });
  }

  async acceptRequest(user: any, id: string) {
    if (!isHeadOffice(user)) throw new ForbiddenException('仅总部可受理工单');
    const req = await this.ensureRequest(id);
    if (req.status !== 'PENDING') throw new BadRequestException('该工单当前状态不可受理');
    return this.prisma.serviceRequest.update({
      where: { id },
      data: { status: 'PROCESSING', handledBy: user.sub, handledAt: new Date() },
    });
  }

  async rejectRequest(user: any, id: string, reason?: string) {
    if (!isHeadOffice(user)) throw new ForbiddenException('仅总部可驳回工单');
    const req = await this.ensureRequest(id);
    if (!['PENDING', 'PROCESSING'].includes(req.status)) throw new BadRequestException('该工单当前状态不可驳回');
    return this.prisma.serviceRequest.update({
      where: { id },
      data: { status: 'REJECTED', remark: reason || '总部已驳回', handledBy: user.sub, handledAt: new Date() },
    });
  }

  async completeRequest(user: any, id: string, result: any) {
    if (!isHeadOffice(user)) throw new ForbiddenException('仅总部可完成工单');
    const req = await this.ensureRequest(id);
    if (!['PENDING', 'PROCESSING'].includes(req.status)) throw new BadRequestException('该工单当前状态不可完成');

    // AI 报告：尝试自动调用 AI 生成解读
    let resultPayload = result || null;
    if (req.type === 'AI_REPORT') {
      const reportId = this.payloadField(req.payload, 'reportId') || (req.customerId ? await this.findLatestReportId(req.customerId) : null);
      if (reportId) {
        try {
          const ai = await this.aiService.interpretReport(reportId);
          resultPayload = { summary: ai.interpretation, reportId, provider: ai.provider, interpretationId: ai.interpretationId };
        } catch (e) {
          // AI 未配置密钥或调用失败时，回退为人工结果
          resultPayload = resultPayload || { summary: 'AI 服务暂不可用，请人工解读后填写', error: e.message };
        }
      }
      await this.prisma.aIUsage.create({
        data: { storeId: req.storeId, customerId: req.customerId, type: 'AI', provider: 'tongyi', cost: req.totalAmount },
      });
    }
    if (req.type === 'CARE_PLAN') {
      if (req.customerId) {
        try {
          const plan = await this.aiService.generateCarePlan(req.customerId);
          resultPayload = resultPayload || { summary: plan.plan, provider: plan.provider };
          await this.prisma.aIUsage.create({
            data: { storeId: req.storeId, customerId: req.customerId, type: 'AI', provider: plan.provider, cost: req.totalAmount },
          });
        } catch (e) {
          resultPayload = resultPayload || { summary: 'AI 暂不可用，请人工制定调理方案', error: e.message };
        }
      }
    }
    const resultJson = resultPayload ? JSON.stringify(resultPayload) : null;
    const invoice = await this.createInvoice(req.storeId, this.invoiceTypeOf(req.type), req.totalAmount, [
      { name: req.title, price: req.totalAmount, quantity: 1 },
    ]);
    // 总部“接待并下单”：同步在门店生成一笔服务订单，门店可在“订单管理”看到
    if (req.customerId) {
      await this.prisma.order.create({
        data: {
          orderNo: genNo('ORD'),
          customerId: req.customerId,
          storeId: req.storeId,
          totalAmount: req.totalAmount,
          paidAmount: 0,
          discountAmount: 0,
          status: 0, // UNPAID，收款后由总部在账单处登记
          remark: '总部服务下单：' + req.title + '（工单 ' + req.requestNo + '）',
        },
      }).catch(() => null);
    }
    return this.prisma.serviceRequest.update({
      where: { id },
      data: {
        status: 'COMPLETED',
        result: resultJson,
        referenceId: invoice.id,
        handledBy: user.sub,
        completedAt: new Date(),
      },
    });
  }

  // ============================================================
  // 订阅 / AI 配额
  // ============================================================
  async listSubscriptions(user: any) {
    if (!isHeadOffice(user)) {
      return this.prisma.subscription.findMany({ where: { storeId: user?.storeId }, orderBy: { createdAt: 'desc' } });
    }
    return this.prisma.subscription.findMany({
      orderBy: { createdAt: 'desc' },
      include: { store: { select: { id: true, name: true, code: true } } },
    });
  }

  async createSubscription(user: any, data: any) {
    if (!isHeadOffice(user)) throw new ForbiddenException('仅总部可开通门店订阅');
    const storeId = data?.storeId;
    if (!storeId) throw new BadRequestException('请选择门店');
    const plan = data?.plan || 'BASIC';
    const aiQuota = Number(data?.aiQuota) || 0;
    const days = Number(data?.days) || 365;
    const startDate = data?.startDate ? new Date(data.startDate) : new Date();
    const endDate = new Date(startDate.getTime() + days * 24 * 60 * 60 * 1000);
    const price = Number(data?.price) || 0;
    const sub = await this.prisma.subscription.create({
      data: { storeId, plan, aiQuota, aiUsed: 0, price, startDate, endDate, status: 'ACTIVE' },
    });
    await this.prisma.store.update({ where: { id: storeId }, data: { subscriptionPlan: plan, subscriptionStart: startDate, subscriptionEnd: endDate } });
    if (price > 0) await this.createInvoice(storeId, 'SUBSCRIPTION', price, [{ name: '订阅套餐-' + plan, price, quantity: 1 }]);
    return sub;
  }

  async listUsage(user: any) {
    const where = scopedWhere(user, {});
    return this.prisma.aIUsage.findMany({
      where, orderBy: { createdAt: 'desc' }, take: 500,
      include: { store: { select: { id: true, name: true } } },
    });
  }

  async listInvoices(user: any) {
    const where = scopedWhere(user, {});
    return this.prisma.invoice.findMany({
      where, orderBy: { createdAt: 'desc' }, take: 500,
      include: { store: { select: { id: true, name: true, code: true } } },
    });
  }

  async payInvoice(user: any, id: string, method: string) {
    if (!isHeadOffice(user)) throw new ForbiddenException('仅总部可登记收款');
    const invoice = await this.prisma.invoice.findUnique({ where: { id } });
    if (!invoice) throw new NotFoundException('账单不存在');
    return this.prisma.invoice.update({
      where: { id },
      data: { status: 'PAID', paidAmount: invoice.amount, paymentMethod: method || 'BANK', paidAt: new Date() },
    });
  }

  // ============================================================
  // 加盟看板（总部）
  // ============================================================
  async dashboard(user: any) {
    if (!isHeadOffice(user)) throw new ForbiddenException('仅总部可查看加盟看板');
    const [storeCount, activeStoreCount, pendingRequests, processingRequests, aiRevenue, invoiceRevenue, aiUsageCount, recentRequests, stores] = await Promise.all([
      this.prisma.store.count(),
      this.prisma.store.count({ where: { status: 'ACTIVE' } }),
      this.prisma.serviceRequest.count({ where: { status: 'PENDING' } }),
      this.prisma.serviceRequest.count({ where: { status: 'PROCESSING' } }),
      this.prisma.aIUsage.aggregate({ _sum: { cost: true } }),
      this.prisma.invoice.aggregate({ _sum: { amount: true } }),
      this.prisma.aIUsage.count(),
      this.prisma.serviceRequest.findMany({ orderBy: { createdAt: 'desc' }, take: 20, include: { store: { select: { name: true } }, customer: { select: { name: true, phone: true } } } }),
      this.prisma.store.findMany({
        orderBy: { createdAt: 'asc' },
        include: {
          _count: { select: { customers: true, staff: true, devices: true, orders: true, detections: true } },
          subscriptions: { orderBy: { createdAt: 'desc' }, take: 1 },
        },
      }),
    ]);
    return {
      summary: {
        storeCount, activeStoreCount, pendingRequests, processingRequests,
        aiUsageCount,
        aiRevenue: aiRevenue._sum.cost || 0,
        invoiceRevenue: invoiceRevenue._sum.amount || 0,
      },
      recentRequests,
      stores: stores.map((s: any) => ({
        id: s.id, code: s.code, name: s.name, status: s.status, level: s.level,
        subscriptionPlan: s.subscriptionPlan, city: s.city, contactName: s.contactName,
        customers: s._count.customers, staff: s._count.staff, devices: s._count.devices,
        orders: s._count.orders, detections: s._count.detections,
        subscription: s.subscriptions[0] || null,
      })),
    };
  }

  // ============================================================
  // 加盟申请（商家自助提交 -> 总部审批开通）
  // ============================================================
  async applyFranchise(data: any) {
    if (!data?.storeName || !data?.contactName || !data?.contactPhone) {
      throw new BadRequestException('请填写门店名称、联系人、联系电话');
    }
    const existing = await this.prisma.franchiseApplication.findFirst({
      where: { contactPhone: data.contactPhone, status: 'PENDING' },
    });
    if (existing) throw new BadRequestException('该手机号已有待审批的加盟申请');
    return this.prisma.franchiseApplication.create({
      data: {
        storeName: data.storeName,
        contactName: data.contactName,
        contactPhone: data.contactPhone,
        city: data.city || null,
        province: data.province || null,
        remark: data.remark || null,
        status: 'PENDING',
      },
    });
  }

  async listApplications(user: any) {
    if (!isHeadOffice(user)) throw new ForbiddenException('仅总部可查看加盟申请');
    return this.prisma.franchiseApplication.findMany({ orderBy: { createdAt: 'desc' }, take: 200 });
  }

  async approveApplication(user: any, id: string, data: any) {
    if (!isHeadOffice(user)) throw new ForbiddenException('仅总部可审批加盟申请');
    const app = await this.prisma.franchiseApplication.findUnique({ where: { id } });
    if (!app) throw new NotFoundException('申请不存在');
    if (app.status !== 'PENDING') throw new BadRequestException('该申请已处理');
    // 生成门店编码 + 默认商家账号
    const code = 'STORE-' + genNo('').slice(-6);
    const username = data?.username || ('store' + app.contactPhone.slice(-4));
    const password = data?.password || '123456';
    const store = await this.prisma.store.create({
      data: {
        code, name: app.storeName, status: 'ACTIVE',
        contactName: app.contactName, contactPhone: app.contactPhone,
        city: app.city, province: app.province,
        subscriptionPlan: 'FREE', level: 'BASIC', isHeadOffice: false,
      },
    });
    await this.prisma.staff.create({
      data: {
        username, password: await bcrypt.hash(password, 10),
        name: app.contactName || app.storeName, phone: app.contactPhone,
        role: 'STORE_ADMIN', storeId: store.id, status: 'ACTIVE',
      },
    });
    const updated = await this.prisma.franchiseApplication.update({
      where: { id },
      data: { status: 'APPROVED', storeId: store.id, reviewedBy: user.sub, reviewedAt: new Date() },
    });
    return { application: updated, store, merchantAccount: { username, password } };
  }

  async rejectApplication(user: any, id: string, reason?: string) {
    if (!isHeadOffice(user)) throw new ForbiddenException('仅总部可审批加盟申请');
    const app = await this.prisma.franchiseApplication.findUnique({ where: { id } });
    if (!app) throw new NotFoundException('申请不存在');
    if (app.status !== 'PENDING') throw new BadRequestException('该申请已处理');
    return this.prisma.franchiseApplication.update({
      where: { id },
      data: { status: 'REJECTED', remark: reason || '已驳回', reviewedBy: user.sub, reviewedAt: new Date() },
    });
  }

  // ============================================================
  // 私有
  // ============================================================
  private async ensureRequest(id: string) {
    const req = await this.prisma.serviceRequest.findUnique({ where: { id } });
    if (!req) throw new NotFoundException('工单不存在');
    return req;
  }

  private typeLabel(type: string) {
    return { AI_REPORT: 'AI 体质报告解读', CARE_PLAN: '个性化调理方案', CONSULTATION: '远程医师会诊', DEVICE_SALE: '设备采购' }[type] || type;
  }

  private invoiceTypeOf(type: string) {
    return { AI_REPORT: 'AI_SERVICE', CARE_PLAN: 'AI_SERVICE', CONSULTATION: 'CONSULTATION', DEVICE_SALE: 'DEVICE_SALE' }[type] || 'AI_SERVICE';
  }

  private payloadField(payload: string | null, key: string): any {
    if (!payload) return null;
    try { const o = JSON.parse(payload); return o?.[key] ?? null; } catch { return null; }
  }

  private async findLatestReportId(customerId: string): Promise<string | null> {
    const r = await this.prisma.report.findFirst({ where: { customerId }, orderBy: { createdAt: 'desc' }, select: { id: true } });
    return r?.id || null;
  }

  private async createInvoice(storeId: string, type: string, amount: number, items: any[]) {
    return this.prisma.invoice.create({
      data: {
        storeId, type, amount, status: 'PENDING',
        invoiceNo: genNo('INV'),
        items: JSON.stringify(items),
      },
    });
  }
}
