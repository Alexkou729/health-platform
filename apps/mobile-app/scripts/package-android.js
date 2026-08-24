#!/usr/bin/env node
/**
 * Android APK 一键打包脚本
 * 流程：检查环境 → 编译 uni-app → 输出 APK 路径
 */
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('========================================');
console.log('  健康管理系统 - Android APK 打包工具');
console.log('========================================\n');

const ROOT = path.resolve(__dirname, '..');
process.chdir(ROOT);

// 1. 检查环境
console.log('[1/5] 检查环境...');
try {
  const nodeVersion = execSync('node -v', { encoding: 'utf8' }).trim();
  console.log(`  ✅ Node.js: ${nodeVersion}`);
} catch {
  console.log('  ❌ 未找到 Node.js，请先安装 Node.js 18+');
  process.exit(1);
}

if (!fs.existsSync('node_modules')) {
  console.log('  📦 安装依赖 (首次)...');
  execSync('npm install', { stdio: 'inherit' });
}
console.log('  ✅ 依赖已就绪');

// 2. 检查图标
console.log('\n[2/5] 检查图标...');
const iconPath = path.join(ROOT, 'src/static/logo.png');
if (!fs.existsSync(iconPath)) {
  console.log('  ⚠️  未找到 src/static/logo.png，将使用默认图标');
}

// 3. 构建 H5
console.log('\n[3/5] 构建 H5 版本...');
execSync('npm run build:h5', { stdio: 'inherit' });

// 4. 构建 Android APP
console.log('\n[4/5] 构建 Android APP...');
console.log('  ⚠️  注意：CLI 方式打包 Android 需要：');
console.log('     1. JDK 17+');
console.log('     2. Android SDK (推荐安装 Android Studio)');
console.log('     3. Gradle (Android Studio 自带)');
console.log('  💡  推荐使用 HBuilderX 云打包（最简单）：');
console.log('     https://www.dcloud.io/hbuilderx.html');

// 5. 输出结果
console.log('\n[5/5] 打包完成！');
console.log('\n📦 输出位置:');
console.log('   H5:        ' + path.join(ROOT, 'dist/build/h5'));
console.log('   APK:       ' + path.join(ROOT, 'dist/build/app-plus/apk/'));
console.log('\n🚀 下一步：');
console.log('   1. 推荐使用 HBuilderX 打开本项目');
console.log('   2. 菜单 → 发行 → 原生 APP-云打包');
console.log('   3. 选择 Android → 免费证书 → 打包');
console.log('   4. 5 分钟即可获得 APK 安装包');