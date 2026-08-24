import { Inject, Injectable, NotFoundException } from '@nestjs/common';

@Injectable()
export class RecipeService {
  constructor(@Inject('PRISMA_CLIENT') private readonly prisma: any) {}

  async listRecipes(params: any) {
    const { page = 1, pageSize = 20, category, keyword, status } = params;
    const where: any = {};
    if (category) where.category = category;
    if (status) where.status = status;
    if (keyword) where.OR = [{ name: { contains: keyword } }, { code: { contains: keyword } }];
    const [items, total] = await Promise.all([
      this.prisma.recipeItem.findMany({ where, skip: (page-1)*pageSize, take: pageSize, orderBy: [{ sortOrder: 'desc' }, { createdAt: 'desc' }] }),
      this.prisma.recipeItem.count({ where }),
    ]);
    return { items, total, page, pageSize };
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

  async listPlans(params: any) {
    const { page = 1, pageSize = 20, customerId, storeId, staffId, status, constitution } = params;
    const where: any = {};
    if (customerId) where.customerId = customerId;
    if (storeId) where.storeId = storeId;
    if (staffId) where.staffId = staffId;
    if (status) where.status = status;
    if (constitution) where.constitution = constitution;
    const [items, total] = await Promise.all([
      this.prisma.carePlan.findMany({ where, skip: (page-1)*pageSize, take: pageSize, orderBy: { createdAt: 'desc' }, include: { customer: { select: { name: true, phone: true } }, staff: { select: { name: true } }, items: { include: { recipe: true } } } }),
      this.prisma.carePlan.count({ where }),
    ]);
    return { items, total, page, pageSize };
  }

  async findPlan(id: string) {
    const plan = await this.prisma.carePlan.findUnique({
      where: { id },
      include: { customer: true, staff: true, detection: true, items: { include: { recipe: true } }, tasks: true, appointments: true },
    });
    if (!plan) throw new NotFoundException('方案不存在');
    return plan;
  }

  async createPlan(data: any) {
    const { items = [], ...planData } = data;
    const totalPrice = items.reduce((sum: number, item: any) => sum + (item.price || 0) * (item.quantity || 1), 0);
    return this.prisma.carePlan.create({
      data: { ...planData, advice: JSON.stringify(planData.advice || {}), totalPrice, items: { create: items } },
      include: { items: true },
    });
  }

  async updatePlan(id: string, data: any) {
    if (data.advice) data.advice = JSON.stringify(data.advice);
    return this.prisma.carePlan.update({ where: { id }, data });
  }

  async deletePlan(id: string) { return this.prisma.carePlan.delete({ where: { id } }); }
}
