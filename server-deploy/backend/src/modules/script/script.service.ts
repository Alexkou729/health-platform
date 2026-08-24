import { Inject, Injectable, NotFoundException } from "@nestjs/common";

@Injectable()
export class ScriptService {
  constructor(@Inject("PRISMA_CLIENT") private readonly prisma: any) {}

  async listTemplates(params: any) {
    const { page = 1, pageSize = 50, category, status, keyword } = params;
    const where: any = {};
    if (category) where.category = category;
    if (status) where.status = status;
    if (keyword) where.OR = [{ title: { contains: keyword } }, { code: { contains: keyword } }];
    const [items, total] = await Promise.all([
      this.prisma.scriptTemplate.findMany({ where, skip: (page-1)*pageSize, take: pageSize, orderBy: { usageCount: "desc" } }),
      this.prisma.scriptTemplate.count({ where }),
    ]);
    return { items, total, page, pageSize };
  }

  async createTemplate(data: any) {
    return this.prisma.scriptTemplate.create({ data: { ...data, variables: JSON.stringify(data.variables || []) } });
  }

  async updateTemplate(id: string, data: any) {
    if (data.variables) data.variables = JSON.stringify(data.variables);
    return this.prisma.scriptTemplate.update({ where: { id }, data });
  }

  async deleteTemplate(id: string) { return this.prisma.scriptTemplate.delete({ where: { id } }); }

  async generate(params: any) {
    const templates = await this.prisma.scriptTemplate.findMany({
      where: { category: params.category, status: "ACTIVE" },
      orderBy: { usageCount: "desc" },
      take: 5,
    });
    if (templates.length === 0) {
      return { generated: this.fallbackScript(params), usedTemplate: null };
    }
    const template = templates[0];
    const vars = {
      "姓名": params.customerName || "客户",
      "称呼": params.gender === 1 ? "先生" : params.gender === 2 ? "女士" : "朋友",
      "年龄": params.age || "",
      "体质": this.getConstitutionName(params.constitution),
      "评分": params.score || "良好",
      "门店": "健康养生馆",
      "日期": new Date().toLocaleDateString("zh-CN"),
      ...params.customVars,
    };
    let content = template.content;
    for (const [k, v] of Object.entries(vars)) {
      content = content.replace(new RegExp("\\{" + k + "\\}", "g"), String(v));
    }
    await this.prisma.scriptTemplate.update({ where: { id: template.id }, data: { usageCount: { increment: 1 } } });
    return { templateId: template.id, title: template.title, generated: content, usedTemplate: template.title };
  }

  private fallbackScript(params: any): string {
    const name = params.customerName || "客户";
    const t = this.getConstitutionName(params.constitution || "");
    return "亲爱的 " + name + "，您的健康检测已完成。本次检测结果显示您属于" + t + "体质。建议您近期到店详读报告，祝您身体健康！";
  }

  private getConstitutionName(code: string): string {
    const names: Record<string, string> = {
      BALANCED: "平和", QI_DEFICIENCY: "气虚", YANG_DEFICIENCY: "阳虚",
      YIN_DEFICIENCY: "阴虚", PHLEGM_DAMPNESS: "痰湿", DAMPNESS_HEAT: "湿热",
      BLOOD_STASIS: "血瘀", QI_STAGNATION: "气郁", SPECIAL: "特禀",
    };
    return names[code] || "一般";
  }
}
