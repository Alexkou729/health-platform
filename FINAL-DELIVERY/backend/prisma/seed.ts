/**
 * 数据库种子数据
 * 创建默认门店、管理员账号、测试数据
 */
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 开始初始化种子数据...');

  // 1. 创建默认门店
  const store = await prisma.store.upsert({
    where: { code: 'DEFAULT' },
    update: {},
    create: {
      code: 'DEFAULT',
      name: '总店',
      address: '北京市朝阳区某某路 88 号',
      phone: '010-12345678',
      manager: '王经理',
      openHours: '09:00-21:00',
      status: 'ACTIVE',
    },
  });
  console.log(`✅ 门店创建: ${store.name}`);

  // 2. 创建超级管理员
  const hashedPassword = await bcrypt.hash('admin123', 10);
  const admin = await prisma.staff.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      password: hashedPassword,
      name: '系统管理员',
      phone: '13800000000',
      role: 'SUPER_ADMIN',
      storeId: store.id,
      commissionRate: 0,
      status: 'ACTIVE',
    },
  });
  console.log(`✅ 管理员账号: ${admin.username} / admin123`);

  // 3. 创建店长
  const managerPwd = await bcrypt.hash('manager123', 10);
  await prisma.staff.upsert({
    where: { username: 'manager' },
    update: {},
    create: {
      username: 'manager',
      password: managerPwd,
      name: '店长',
      phone: '13800000001',
      role: 'STORE_ADMIN',
      storeId: store.id,
      commissionRate: 0.1,
      status: 'ACTIVE',
    },
  });
  console.log(`✅ 店长账号: manager / manager123`);

  // 4. 创建健康顾问
  const doctorPwd = await bcrypt.hash('doctor123', 10);
  await prisma.staff.upsert({
    where: { username: 'doctor' },
    update: {},
    create: {
      username: 'doctor',
      password: doctorPwd,
      name: '李医生',
      phone: '13800000002',
      role: 'DOCTOR',
      storeId: store.id,
      commissionRate: 0.15,
      status: 'ACTIVE',
    },
  });
  console.log(`✅ 健康顾问: doctor / doctor123`);

  // 5. 创建演示设备
  const expiresAt = new Date();
  expiresAt.setFullYear(expiresAt.getFullYear() + 1);
  await prisma.device.upsert({
    where: { deviceNo: 'QA-DEMO-001' },
    update: {},
    create: {
      deviceNo: 'QA-DEMO-001',
      vendor: 'Quantum',
      model: 'QA-13',
      hidVendorId: 0x1234,
      hidProductId: 0x5678,
      status: 1, // ONLINE
      storeId: store.id,
      boundAt: new Date(),
      expiresAt,
      totalDetections: 0,
      firmwareVersion: '1.0.0',
      secret: 'demo-secret-' + Math.random().toString(36).substring(2, 15),
    },
  });
  console.log(`✅ 演示设备: QA-DEMO-001`);

  // 6. 创建套餐
  const packages = [
    {
      name: '单次检测体验',
      code: 'PKG-SINGLE',
      type: 'SINGLE',
      totalTimes: 1,
      price: 99,
      originalPrice: 299,
      description: '60 秒全身健康检测 + 43 份报告',
      tags: JSON.stringify(['新客体验']),
    },
    {
      name: '季度体检套餐',
      code: 'PKG-QUARTERLY',
      type: 'TIMES',
      totalTimes: 3,
      price: 599,
      originalPrice: 999,
      description: '3 次检测 + 调理建议，3 个月内有效',
      tags: JSON.stringify(['复检跟踪']),
    },
    {
      name: '年度健康管家',
      code: 'PKG-ANNUAL',
      type: 'ANNUAL',
      totalTimes: 12,
      price: 3999,
      originalPrice: 6980,
      description: '12 次月度检测 + 专属健康顾问 + 全年调理跟踪',
      tags: JSON.stringify(['VIP', '推荐']),
    },
    {
      name: '亚健康调理套餐',
      code: 'PKG-TREATMENT',
      type: 'TREATMENT',
      totalTimes: 8,
      price: 1999,
      originalPrice: 3580,
      description: '8 次检测 + 调理方案跟踪',
      tags: JSON.stringify(['调理']),
    },
  ];
  for (const p of packages) {
    await prisma.package.upsert({
      where: { code: p.code },
      update: {},
      create: {
        ...p,
        validityDays: 365,
        storeId: store.id,
        status: 'ACTIVE',
        applicableTemplates: [
          'comprehensive', 'cardiovascular', 'immune_system',
          'trace_elements', 'vitamins', 'expert_analysis',
        ],
        giftServices: ['1v1 健康解读', '调理方案定制'],
      },
    });
  }
  console.log(`✅ 套餐创建: ${packages.length} 个`);

  // 7. 创建优惠券模板
  await prisma.coupon.upsert({
    where: { code: 'WELCOME100' },
    update: {},
    create: {
      code: 'WELCOME100',
      name: '新客体验券 ¥100',
      type: 'AMOUNT',
      value: 100,
      minSpend: 99,
      validFrom: new Date(),
      validTo: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
      totalQuantity: 9999,
      usedQuantity: 0,
      description: '首次到店检测抵扣 ¥100',
      storeId: store.id,
      status: 'ACTIVE',
    },
  });
  console.log(`✅ 体验券: WELCOME100`);

  // 8. 创建演示客户
  await prisma.customer.upsert({
    where: { phone: '13900000001' },
    update: {},
    create: {
      name: '张三',
      phone: '13900000001',
      gender: 1,
      age: 35,
      heightCm: 175,
      weightKg: 72,
      storeId: store.id,
      consultantId: (await prisma.staff.findUnique({ where: { username: 'doctor' } }))?.id,
      level: 'GOLD',
      tags: JSON.stringify(['BALANCED']),
      totalSpent: 2999,
      totalDetections: 5,
      source: 'WECHAT',
      status: 'ACTIVE',
    },
  });
  await prisma.customer.upsert({
    where: { phone: '13900000002' },
    update: {},
    create: {
      name: '李四',
      phone: '13900000002',
      gender: 2,
      age: 42,
      heightCm: 162,
      weightKg: 58,
      storeId: store.id,
      consultantId: (await prisma.staff.findUnique({ where: { username: 'doctor' } }))?.id,
      level: 'DIAMOND',
      tags: JSON.stringify(['QI_DEFICIENCY']),
      totalSpent: 8999,
      totalDetections: 12,
      source: 'REFERRAL',
      status: 'ACTIVE',
    },
  });
  console.log(`✅ 演示客户: 2 个`);

  // 9. 系统配置
  const configs = [
    { key: 'site.name', value: '健康管理系统' },
    { key: 'site.logo', value: '' },
    { key: 'site.contact', value: '010-12345678' },
    { key: 'detection.defaultDuration', value: 60 },
    { key: 'detection.autoGenerateReport', value: true },
    { key: 'wechat.appId', value: '' },
    { key: 'wechat.appSecret', value: '' },
    { key: 'report.brandName', value: '健康管理系统' },
    { key: 'report.disclaimer', value: '本检测结果仅供参考，不作为诊断结论。' },
  ];
  for (const c of configs) {
    await prisma.systemConfig.upsert({
      where: { key: c.key },
      update: {},
      create: c,
    });
  }
  console.log(`✅ 系统配置: ${configs.length} 项`);

  console.log('\n🎉 种子数据初始化完成！');
  console.log('\n默认账号:');
  console.log('  超级管理员: admin / admin123');
  console.log('  店长:       manager / manager123');
  console.log('  健康顾问:   doctor / doctor123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
