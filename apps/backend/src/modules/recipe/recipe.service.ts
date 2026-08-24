import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { scopedWhere, genNo } from '../../common/utils/scope';

@Injectable()
export class RecipeService {
  constructor(@Inject('PRISMA_CLIENT') private readonly prisma: any) {}

  async listRecipes(params: any) {
    const { page = 1, pageSize = 20, category, keyword, status } = params;
    const pageNum = Math.max(1, parseInt(String(page), 10) || 1);
    const pageSizeNum = Math.min(100, parseInt(String(pageSize), 10) || 20);
    const where: any = {};
    if (category) where.category = category;
    if (status) where.status = status;
    if (keyword) where.OR = [{ name: { contains: keyword } }, { code: { contains: keyword } }];
    const [items, total] = await Promise.all([
      this.prisma.recipeItem.findMany({ where, skip: (pageNum-1)*pageSizeNum, take: pageSizeNum, orderBy: [{ sortOrder: 'desc' }, { createdAt: 'desc' }] }),
      this.prisma.recipeItem.count({ where }),
    ]);
    return { items: items.map((i) => this.parseRecipe(i)), total, page: pageNum, pageSize: pageSizeNum };
  }

  async createRecipe(data: any) {
    return this.prisma.recipeItem.create({
      data: {
        ...data,
        indications: JSON.stringify(data.indications || []),
        contraindications: JSON.stringify(data.contraindications || []),
        tags: JSON.stringify(data.tags || []),
      },
    });
  }

  async updateRecipe(id: string, data: any) {
    if (data.indications) data.indications = JSON.stringify(data.indications);
    if (data.contraindications) data.contraindications = JSON.stringify(data.contraindications);
    if (data.tags) data.tags = JSON.stringify(data.tags);
    return this.prisma.recipeItem.update({ where: { id }, data });
  }

  async deleteRecipe(id: string) { return this.prisma.recipeItem.delete({ where: { id } }); }

  async listPlans(params: any, user?: any) {
    const { page = 1, pageSize = 20, customerId, storeId, staffId, status, constitution } = params;
    const pageNum = Math.max(1, parseInt(String(page), 10) || 1);
    const pageSizeNum = Math.min(100, parseInt(String(pageSize), 10) || 20);
    const where: any = scopedWhere(user, {});
    if (customerId) where.customerId = customerId;
    if (storeId) where.storeId = storeId;
    if (staffId) where.staffId = staffId;
    if (status) where.status = status;
    if (constitution) where.constitution = constitution;
    const [items, total] = await Promise.all([
      this.prisma.carePlan.findMany({ where, skip: (pageNum-1)*pageSizeNum, take: pageSizeNum, orderBy: { createdAt: 'desc' }, include: { customer: { select: { name: true, phone: true } }, staff: { select: { name: true } }, items: { include: { recipe: true } } } }),
      this.prisma.carePlan.count({ where }),
    ]);
    return { items: items.map((p) => this.parsePlan(p)), total, page: pageNum, pageSize: pageSizeNum };
  }

  async findPlan(id: string, user?: any) {
    const plan = await this.prisma.carePlan.findUnique({
      where: scopedWhere(user, { id }),
      include: { customer: true, staff: true, detection: true, items: { include: { recipe: true } }, tasks: true, appointments: true },
    });
    if (!plan) throw new NotFoundException('方案不存在');
    return this.parsePlan(plan);
  }

  async createPlan(data: any, user?: any) {
    const { items = [], ...planData } = data;
    // 门店归属：总部可指定门店，否则默认当前账号所属门店
    if (!planData.storeId) planData.storeId = user?.storeId;
    if (!planData.storeId) {
      const store = await this.prisma.store.findFirst();
      if (store) planData.storeId = store.id;
    }
    // 清理无效外键
    if (planData.staffId === '' || planData.staffId === null) delete planData.staffId;
    if (planData.detectionId === '' || planData.detectionId === null) delete planData.detectionId;
    // 自动挂接/创建理调项目库（PlanItem 必填 recipe 关联）
    const resolvedItems = [];
    for (const item of items) {
      const r = await this.resolveRecipe(item);
      resolvedItems.push(this.toPlanItem(r));
    }
    const totalPrice = resolvedItems.reduce((sum: number, item: any) => sum + (item.price || 0) * (item.quantity || 1), 0);
    return this.prisma.carePlan.create({
      data: { ...planData, advice: JSON.stringify(planData.advice || {}), totalPrice, items: { create: resolvedItems } },
      include: { items: true },
    });
  }

  async updatePlan(id: string, data: any, user?: any) {
    if (data.advice) data.advice = JSON.stringify(data.advice);
    if (data.staffId === '' || data.staffId === null) delete data.staffId;
    if (data.detectionId === '' || data.detectionId === null) delete data.detectionId;
    if (Array.isArray(data.items)) {
      const resolvedItems = [];
      for (const item of data.items) {
        const r = await this.resolveRecipe(item);
        resolvedItems.push(this.toPlanItem(r));
      }
      const totalPrice = resolvedItems.reduce((sum: number, item: any) => sum + (item.price || 0) * (item.quantity || 1), 0);
      data = {
        ...data,
        totalPrice,
        items: { deleteMany: {}, create: resolvedItems },
      };
    }
    return this.prisma.carePlan.update({ where: scopedWhere(user, { id }), data });
  }

  async deletePlan(id: string, user?: any) { return this.prisma.carePlan.delete({ where: scopedWhere(user, { id }) }); }

  /** 将方案项目挂接到理调项目库：已有则复用，没有则自动创建 */
  private async resolveRecipe(item: any) {
    const name = item?.name || '自定义项目';
    if (item?.recipeId) return item;
    let recipe = await this.prisma.recipeItem.findFirst({ where: { name } });
    if (!recipe) {
      recipe = await this.prisma.recipeItem.create({
        data: {
          code: genNo('RC'),
          name,
          category: item?.category || '自定义',
          price: Number(item?.price) || 0,
          durationMin: Number(item?.duration) || Number(item?.durationMin) || 30,
        },
      });
    }
    return { ...item, recipeId: recipe.id };
  }

  /** 仅保留 PlanItem 允许的字段，避免透传多余字段 */
  private toPlanItem(item: any) {
    return {
      recipeId: item.recipeId,
      name: item.name || '自定义项目',
      frequency: item.frequency || '1次/周',
      duration: Number(item.duration) || 30,
      price: Number(item.price) || 0,
      quantity: Number(item.quantity) || 1,
      sortOrder: Number(item.sortOrder) || 0,
      remark: item.remark || null,
    };
  }

  private parseRecipe(r: any) {
    if (!r) return r;
    for (const key of ['indications', 'contraindications', 'tags']) {
      if (typeof r[key] === 'string') {
        try { r[key] = JSON.parse(r[key]); } catch { r[key] = []; }
      }
    }
    return r;
  }

  private parsePlan(p: any) {
    if (!p) return p;
    if (typeof p.advice === 'string') {
      try { p.advice = JSON.parse(p.advice); } catch { p.advice = {}; }
    }
    return p;
  }
}
