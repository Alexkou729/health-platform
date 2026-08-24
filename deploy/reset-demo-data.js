/**
 * 清空演示/测试数据（正式上线前使用）
 * 运行：node reset-demo-data.js
 *
 * 保留：
 *   - 总店（总部门店，admin 所属门店）
 *   - admin 账号
 *   - 理调项目库、标准套餐库
 *   - 系统配置（含已配置的 AI 接口）
 *
 * 删除：
 *   - 所有演示门店（如“加盟店A”）及其员工账号
 *   - 所有测试客户、检测、报告、订单、账单、服务工单、AI 消费/解读
 *   - 所有测试预约、调理方案、任务、设备
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // SQLite 关闭外键约束，避免删除顺序报错
  await prisma.$executeRawUnsafe('PRAGMA foreign_keys = OFF');

  const headOffice = await prisma.store.findFirst({ where: { isHeadOffice: true } })
    || await prisma.store.findFirst({ orderBy: { createdAt: 'asc' } });
  if (!headOffice) { console.log('未找到总部门店，已中止'); await prisma.$executeRawUnsafe('PRAGMA foreign_keys = ON'); return; }
  console.log('保留总部门店:', headOffice.name, headOffice.id);

  const admin = await prisma.staff.findFirst({ where: { role: 'SUPER_ADMIN' } });

  // 1. 删除关联到“非总部门店”的演示数据 + 演示门店本身
  const demoStores = await prisma.store.findMany({ where: { id: { not: headOffice.id } } });
  const demoStoreIds = demoStores.map(s => s.id);
  console.log('待删除演示门店数:', demoStoreIds.length);

  // 按依赖顺序清理（所有业务表先于 store/staff）
  await prisma.report.deleteMany({});
  await prisma.measurement.deleteMany({});
  await prisma.aIInterpretation.deleteMany({});
  await prisma.orderItem.deleteMany({});
  await prisma.order.deleteMany({});
  await prisma.invoice.deleteMany({});
  await prisma.serviceRequest.deleteMany({});
  await prisma.aIUsage.deleteMany({});
  await prisma.subscription.deleteMany({});
  await prisma.appointment.deleteMany({});
  await prisma.planItem.deleteMany({});
  await prisma.carePlan.deleteMany({});
  await prisma.task.deleteMany({});
  await prisma.detection.deleteMany({});
  await prisma.customerCoupon.deleteMany({});
  await prisma.coupon.deleteMany({});
  await prisma.device.deleteMany({});
  await prisma.customer.deleteMany({});
  await prisma.consultation.deleteMany({});

  // 2. 删除演示门店的员工与其门店
  if (demoStoreIds.length) {
    await prisma.staff.deleteMany({ where: { storeId: { in: demoStoreIds } } });
    await prisma.store.deleteMany({ where: { id: { in: demoStoreIds } } });
  }

  // 3. 删除除 admin 外的其他演示员工（如 manager/doctor）
  if (admin) {
    await prisma.staff.deleteMany({ where: { id: { not: admin.id } } });
  }

  // 清理登录日志等残余
  await prisma.loginLog.deleteMany({});
  await prisma.staffPerformance.deleteMany({});

  // 4. 汇总
  const left = {
    store: await prisma.store.count(),
    staff: await prisma.staff.count(),
    customer: await prisma.customer.count(),
    device: await prisma.device.count(),
    report: await prisma.report.count(),
    recipe: await prisma.recipeItem.count(),
    pkg: await prisma.package.count(),
  };
  console.log('清理后剩余:', JSON.stringify(left));
  console.log('✅ 演示数据已清空，保留总店 + admin + 理调库 + 套餐库');
  await prisma.$executeRawUnsafe('PRAGMA foreign_keys = ON');
}

main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
