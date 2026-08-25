import { Inject, Injectable, NotFoundException } from '@nestjs/common';

@Injectable()
export class BodyCompositionService {
  constructor(@Inject('PRISMA_CLIENT') private readonly prisma: any) {}

  /** 接收体脂秤数据（BIA 真测）并保存到客户档案 */
  async create(data: any) {
    const { customerId, measuredAt, rawPayload, ...rest } = data;
    if (!customerId) throw new NotFoundException('客户ID必填');
    // 接受所有 DTO 字段
    const bcData: any = { customerId, source: rest.source || 'BLE_SCALE' };
    const fields = ['weightKg','bmi','bmiType','bodyFatPercent','bodyFatKg','visceralFat',
      'muscleMassKg','musclePercent','bodyWaterKg','bodyWaterPercent',
      'proteinKg','proteinPercent','inorganicSaltKg','inorganicSaltPercent','boneMassKg',
      'bmrKcal','metabolicAge','bodyScore','recommendedIntakeKcal',
      'headKg','trunkKg','leftArmKg','rightArmKg','leftLegKg','rightLegKg',
      'headFatKg','trunkFatKg','leftArmFatKg','rightArmFatKg','leftLegFatKg','rightLegFatKg',
      'headMuscleKg','trunkMuscleKg','leftArmMuscleKg','rightArmMuscleKg','leftLegMuscleKg','rightLegMuscleKg',
      'weightControlKg','muscleControlKg','fatControlKg'];
    for (const f of fields) if (rest[f] !== undefined) bcData[f] = rest[f];
    bcData.deviceModel = rest.deviceModel;
    bcData.deviceMac = rest.deviceMac;
    bcData.rawPayload = typeof rawPayload === 'object' ? JSON.stringify(rawPayload) : rawPayload;
    bcData.measuredAt = measuredAt ? new Date(measuredAt) : new Date();
    const m = await this.prisma.bodyComposition.create({ data: bcData });
    // 同步体重到客户档案（取最近一次）
    try {
      await this.prisma.customer.update({
        where: { id: customerId },
        data: {
          weightKg: rest.weightKg,
          lastDetectionAt: new Date(),
        },
      });
    } catch (e) { /* 客户档案同步失败不影响体成分保存 */ }
    return m;
  }

  async list(params: { customerId?: string; startDate?: string; endDate?: string; page?: number; pageSize?: number }) {
    const { customerId, startDate, endDate, page = 1, pageSize = 50 } = params;
    const where: any = {};
    if (customerId) where.customerId = customerId;
    if (startDate || endDate) {
      where.measuredAt = {};
      if (startDate) where.measuredAt.gte = new Date(startDate);
      if (endDate) where.measuredAt.lte = new Date(endDate);
    }
    const [items, total] = await Promise.all([
      this.prisma.bodyComposition.findMany({
        where, orderBy: { measuredAt: 'desc' },
        skip: (page - 1) * pageSize, take: pageSize,
        include: { customer: { select: { id: true, name: true, phone: true } } },
      }),
      this.prisma.bodyComposition.count({ where }),
    ]);
    return { items, total, page, pageSize };
  }

  async getLatest(customerId: string) {
    return this.prisma.bodyComposition.findFirst({
      where: { customerId }, orderBy: { measuredAt: 'desc' },
    });
  }

  async getTrends(customerId: string, days = 30) {
    const since = new Date();
    since.setDate(since.getDate() - days);
    return this.prisma.bodyComposition.findMany({
      where: { customerId, measuredAt: { gte: since } },
      orderBy: { measuredAt: 'asc' },
    });
  }

  async remove(id: string) {
    return this.prisma.bodyComposition.delete({ where: { id } });
  }
}

