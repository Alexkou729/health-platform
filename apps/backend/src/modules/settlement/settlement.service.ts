import { Inject, Injectable, ForbiddenException } from '@nestjs/common';
import { isHeadOffice } from '../../common/utils/scope';

@Injectable()
export class SettlementService {
  constructor(@Inject('PRISMA_CLIENT') private readonly prisma: any) {}

  async list(user: any) {
    if (!isHeadOffice(user)) throw new ForbiddenException('仅总部可查看结算配置');
    return this.prisma.storeSettlement.findMany({
      include: { store: { select: { id: true, name: true, code: true } } },
    });
  }

  async set(user: any, storeId: string, ratio: number, remark?: string) {
    if (!isHeadOffice(user)) throw new ForbiddenException('仅总部可设置结算比例');
    const r = Math.max(0, Math.min(1, Number(ratio) || 0));
    return this.prisma.storeSettlement.upsert({
      where: { storeId },
      update: { ratio: r, remark: remark || null },
      create: { storeId, ratio: r, remark: remark || null },
    });
  }

  async getRatio(storeId: string): Promise<number> {
    const s = await this.prisma.storeSettlement.findUnique({ where: { storeId } });
    return s?.ratio ?? 0.8;
  }
}
