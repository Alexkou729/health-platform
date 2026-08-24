/**
 * 数据库种子数据 (简化版)
 */
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 初始化种子数据...');

  // 默认门店
  const store = await prisma.store.upsert({
    where: { code: 'DEFAULT' },
    update: {},
    create: {
      code: 'DEFAULT',
      name: '总店',
      address: '北京市朝阳区',
      phone: '010-12345678',
      manager: '王经理',
      openHours: '09:00-21:00',
      status: 'ACTIVE',
    },
  });

  // 默认账号
  const hashedPassword = await bcrypt.hash('admin123', 10);
  await prisma.staff.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin', password: hashedPassword,
      name: '系统管理员', phone: '13800000000',
      role: 'SUPER_ADMIN', storeId: store.id,
      commissionRate: 0, status: 'ACTIVE',
    },
  });
  await prisma.staff.upsert({
    where: { username: 'manager' },
    update: {},
    create: {
      username: 'manager', password: await bcrypt.hash('manager123', 10),
      name: '店长', phone: '13800000001',
      role: 'STORE_ADMIN', storeId: store.id,
      commissionRate: 0.1, status: 'ACTIVE',
    },
  });
  await prisma.staff.upsert({
    where: { username: 'doctor' },
    update: {},
    create: {
      username: 'doctor', password: await bcrypt.hash('doctor123', 10),
      name: '李医生', phone: '13800000002',
      role: 'DOCTOR', storeId: store.id,
      commissionRate: 0.15, status: 'ACTIVE',
    },
  });

  // 演示数据
  await prisma.customer.upsert({
    where: { phone: '13800000001' },
    update: {},
    create: {
      name: '张三', phone: '13800000001', gender: 1, age: 45,
      heightCm: 175, weightKg: 72, storeId: store.id,
      level: 'GOLD', totalSpent: 3680, totalDetections: 8,
      source: 'WECHAT', status: 'ACTIVE',
      tags: '["QI_DEFICIENCY"]',
    },
  });
  await prisma.customer.upsert({
    where: { phone: '13800000002' },
    update: {},
    create: {
      name: '李四', phone: '13800000002', gender: 2, age: 38,
      heightCm: 162, weightKg: 55, storeId: store.id,
      level: 'DIAMOND', totalSpent: 8990, totalDetections: 12,
      source: 'REFERRAL', status: 'ACTIVE',
      tags: '["YANG_DEFICIENCY"]',
    },
  });

  // 示例套餐
  await prisma.package.upsert({
    where: { code: 'PKG-SINGLE' },
    update: {},
    create: {
      code: 'PKG-SINGLE', name: '单次检测体验', type: 'SINGLE',
      totalTimes: 1, price: 99, originalPrice: 299,
      validityDays: 365, storeId: store.id, status: 'ACTIVE',
      description: '60秒全身健康检测 + 43份评估报告',
      tags: '["新客体验"]',
      applicableTemplates: '[]', giftServices: '[]',
    },
  });
  await prisma.package.upsert({
    where: { code: 'PKG-ANNUAL' },
    update: {},
    create: {
      code: 'PKG-ANNUAL', name: '年度健康管家', type: 'ANNUAL',
      totalTimes: 12, price: 3999, originalPrice: 6980,
      validityDays: 365, storeId: store.id, status: 'ACTIVE',
      description: '12次月度检测 + 专属健康顾问',
      tags: '["VIP", "推荐"]',
      applicableTemplates: '["comprehensive"]', giftServices: '["1v1健康解读", "调理方案定制"]',
    },
  });

  // 示例设备
  await prisma.device.upsert({
    where: { deviceNo: 'QA-DEMO-001' },
    update: {},
    create: {
      deviceNo: 'QA-DEMO-001', vendor: 'Quantum', model: 'QA-13',
      status: 1, storeId: store.id,
      totalDetections: 0,
      boundAt: new Date(),
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      secret: 'demo-secret',
    },
  });

  // 系统配置
  const configs = [
    { key: 'site.name', value: '健康管理系统' },
    { key: 'site.contact', value: '010-12345678' },
    { key: 'detection.defaultDuration', value: '60' },
    { key: 'detection.autoGenerateReport', value: 'true' },
    { key: 'report.brandName', value: '健康管理系统' },
    { key: 'report.disclaimer', value: '本检测结果仅供参考，不作为诊断结论。' },
    { key: 'ai.provider', value: 'tongyi' },
    { key: 'ai.enabled', value: 'true' },
  ];
  for (const c of configs) {
    await prisma.systemConfig.upsert({
      where: { key: c.key },
      update: { value: c.value },
      create: c,
    });
  }

  console.log('🎉 种子数据初始化完成！');
  console.log('默认账号: admin / admin123 (超级管理员)');
}

main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());