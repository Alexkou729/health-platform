/**
 * 门店开箱即用种子数据（幂等，可重复执行）
 * 运行：node seed-live.js
 * 作用：
 *  1. 补齐理调项目库（艾灸/拔罐/推拿/足浴/食疗/运动/心理等）
 *  2. 补齐标准套餐（单次/季度/年度/亚健康调理）
 *  3. 补齐系统默认配置（不覆盖已有 AI 配置）
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const RECIPES = [
  { code: 'RC-MOXA', name: '艾灸调理', category: '中医理疗', price: 128, cost: 40, durationMin: 45, indications: '["阳虚","气虚","寒湿"]', contraindications: '["实热","阴虚火旺"]', tags: '["温补","驱寒"]' },
  { code: 'RC-CUPPING', name: '拔罐', category: '中医理疗', price: 98, cost: 25, durationMin: 30, indications: '["寒湿","气滞","酸痛"]', contraindications: '["皮肤破损","出血倾向"]', tags: '["祛湿","通络"]' },
  { code: 'RC-MASSAGE', name: '推拿按摩', category: '中医理疗', price: 198, cost: 60, durationMin: 60, indications: '["颈肩腰腿痛","疲劳"]', contraindications: '["骨折","急性损伤"]', tags: '["放松","疏通"]' },
  { code: 'RC-FOOTBATH', name: '足浴熏蒸', category: '中医理疗', price: 68, cost: 20, durationMin: 30, indications: '["阳虚","寒湿","失眠"]', contraindications: '["足部感染"]', tags: '["安神","暖身"]' },
  { code: 'RC-HERBAL', name: '中药熏蒸', category: '中医理疗', price: 158, cost: 50, durationMin: 40, indications: '["风湿","寒湿","皮肤"]', contraindications: '["高血压","孕妇"]', tags: '["祛风","散寒"]' },
  { code: 'RC-MERIDIAN', name: '经络疏通', category: '中医理疗', price: 238, cost: 70, durationMin: 60, indications: '["气滞","血瘀","疲劳"]', contraindications: '["出血倾向"]', tags: '["通络","活血"]' },
  { code: 'RC-ACUPUNCTURE', name: '针灸', category: '中医理疗', price: 168, cost: 45, durationMin: 40, indications: '["疼痛","失眠","脾胃"]', contraindications: '["晕针","凝血障碍"]', tags: '["调理","镇痛"]' },
  { code: 'RC-SCRAPING', name: '刮痧', category: '中医理疗', price: 88, cost: 22, durationMin: 30, indications: '["暑湿","感冒","酸痛"]', contraindications: '["皮肤破损","出血倾向"]', tags: '["清热","排毒"]' },
  { code: 'RC-DUMAI', name: '督脉灸', category: '中医理疗', price: 268, cost: 80, durationMin: 60, indications: '["阳虚","寒性体质"]', contraindications: '["实热","阴虚"]', tags: '["温阳","扶正"]' },
  { code: 'RC-DIET', name: '食疗调理方案', category: '食疗', price: 88, cost: 0, durationMin: 0, indications: '["各体质"]', contraindications: '["过敏"]', tags: '["食养","方案"]' },
  { code: 'RC-EXERCISE', name: '运动指导', category: '运动', price: 0, cost: 0, durationMin: 30, indications: '["亚健康","肥胖"]', contraindications: '["急性损伤"]', tags: '["锻炼","体质"]' },
  { code: 'RC-PSY', name: '心理疏导', category: '心理', price: 200, cost: 60, durationMin: 50, indications: '["气郁","焦虑","失眠"]', contraindications: '[]', tags: '["情绪","减压"]' },
];

const PACKAGES = [
  { code: 'PKG-SINGLE', name: '单次检测体验', type: 'SINGLE', totalTimes: 1, price: 99, originalPrice: 299, validityDays: 365, description: '60秒全身健康检测 + 43份评估报告' },
  { code: 'PKG-QUARTERLY', name: '季度体检套餐', type: 'TIMES', totalTimes: 3, price: 599, originalPrice: 999, validityDays: 90, description: '3次检测 + 调理建议' },
  { code: 'PKG-ANNUAL', name: '年度健康管家', type: 'ANNUAL', totalTimes: 12, price: 3999, originalPrice: 6980, validityDays: 365, description: '12次月度检测 + 专属健康顾问' },
  { code: 'PKG-TREATMENT', name: '亚健康调理套餐', type: 'TREATMENT', totalTimes: 8, price: 1999, originalPrice: 3580, validityDays: 180, description: '8次检测 + 调理方案' },
];

const CONFIGS = [
  { key: 'site.name', value: '健康管理系统' },
  { key: 'detection.defaultDuration', value: '60' },
  { key: 'detection.autoGenerateReport', value: 'true' },
  { key: 'report.brandName', value: '健康管理系统' },
  { key: 'report.disclaimer', value: '本检测结果仅供参考，不作为诊断结论。' },
];

async function main() {
  console.log('开始补齐门店开箱即用数据...');

  const store = await prisma.store.findFirst();
  if (!store) { console.log('未找到门店，请先运行基础种子'); return; }

  // 1. 理调项目库（幂等）
  for (const r of RECIPES) {
    await prisma.recipeItem.upsert({
      where: { code: r.code },
      update: { name: r.name, category: r.category, price: r.price, cost: r.cost, durationMin: r.durationMin },
      create: { ...r, sortOrder: 0, status: 'ACTIVE' },
    });
  }
  console.log('理调项目库：' + RECIPES.length + ' 项');

  // 2. 标准套餐（幂等）
  for (const p of PACKAGES) {
    await prisma.package.upsert({
      where: { code: p.code },
      update: { name: p.name, type: p.type, totalTimes: p.totalTimes, price: p.price, originalPrice: p.originalPrice, validityDays: p.validityDays, description: p.description },
      create: { ...p, storeId: store.id, status: 'ACTIVE', salesCount: 0, tags: '[]', applicableTemplates: '[]', giftServices: '[]' },
    });
  }
  console.log('标准套餐：' + PACKAGES.length + ' 个');

  // 3. 系统默认配置（仅在不存在时插入，不覆盖已有 AI 配置）
  for (const c of CONFIGS) {
    await prisma.systemConfig.upsert({
      where: { key: c.key },
      update: {},
      create: c,
    });
  }
  console.log('系统默认配置已就绪（未覆盖现有配置）');

  console.log('✅ 门店开箱即用数据补齐完成');
}

main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
