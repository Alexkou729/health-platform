import { Inject, Injectable } from '@nestjs/common';

@Injectable()
export class AdviceService {
  constructor(@Inject('PRISMA_CLIENT') private readonly prisma: any) {}

  async generateAdviceByConstitution(constitution: string, indicators: any[] = [], customerInfo: any = {}) {
    const templates = await this.prisma.adviceTemplate.findMany({
      where: { constitution, status: 'ACTIVE' },
      orderBy: { priority: 'desc' },
    });
    const byCategory: Record<string, any[]> = { LIFESTYLE: [], DIET: [], EXERCISE: [], SLEEP: [], MOOD: [], PREVENTION: [] };
    for (const t of templates) {
      if (byCategory[t.category]) byCategory[t.category].push(t);
    }
    const advice = {
      lifestyle: this.combineContent(byCategory.LIFESTYLE),
      diet: this.combineContent(byCategory.DIET),
      exercise: this.combineContent(byCategory.EXERCISE),
      sleep: this.combineContent(byCategory.SLEEP),
      mood: this.combineContent(byCategory.MOOD),
      prevention: this.combineContent(byCategory.PREVENTION),
    };
    const abnormalIndicators = indicators.filter((i: any) => i.status >= 3);
    const personalizedWarnings: string[] = [];
    for (const ind of abnormalIndicators.slice(0, 5)) {
      personalizedWarnings.push('⚠ ' + ind.name + ' 异常 (' + ind.value + ind.unit + ')，建议关注');
    }
    return {
      constitution,
      summary: this.getConstitutionSummary(constitution),
      advice,
      warnings: personalizedWarnings,
      generatedAt: new Date().toISOString(),
    };
  }

  private combineContent(items: any[]) {
    if (!items || items.length === 0) return '';
    return items.map((t, i) => (i + 1) + '. ' + t.content).join('\n');
  }

  private getConstitutionSummary(constitution: string): string {
    const summaries: Record<string, string> = {
      BALANCED: '您属于平和体质，身体状态良好。',
      QI_DEFICIENCY: '您属于气虚体质，容易疲劳、易感冒。',
      YANG_DEFICIENCY: '您属于阳虚体质，怕冷、手脚冰凉。',
      YIN_DEFICIENCY: '您属于阴虚体质，口燥咽干、失眠。',
      PHLEGM_DAMPNESS: '您属于痰湿体质，身体困重、油光满面。',
      DAMPNESS_HEAT: '您属于湿热体质，口苦、痤疮。',
      BLOOD_STASIS: '您属于血瘀体质，面色晦暗、月经不调。',
      QI_STAGNATION: '您属于气郁体质，情绪低落、胸闷。',
      SPECIAL: '您属于特禀体质（过敏体质）。',
    };
    return summaries[constitution] || '请咨询专业医师。';
  }

  async recommendRecipes(constitution: string, issues: string[] = []) {
    const recipes = await this.prisma.recipeItem.findMany({ where: { status: 'ACTIVE' } });
    const recommendations: any[] = [];
    for (const r of recipes) {
      let indications: string[] = [];
      try { indications = JSON.parse(r.indications || '[]'); } catch {}
      const score = indications.filter((i: string) => i === constitution || issues.some((issue: string) => i.includes(issue))).length;
      if (score > 0) recommendations.push({ ...r, _score: score });
    }
    return recommendations.sort((a, b) => b._score - a._score).slice(0, 8);
  }
}
