# 📱 移动端 APP 打包完整指南

> 健康管理系统 - 移动端 uni-app 项目，支持 5 种发布方式

## 📦 移动端交付内容

```
apps/mobile-app/
├── src/
│   ├── pages/                12 个页面
│   │   ├── index/            工作台（实时数据 + 今日预约）
│   │   ├── detect/           检测中心（含 60 秒动画）
│   │   ├── customer/         客户管理
│   │   ├── appointment/      预约管理
│   │   ├── plan/             调理方案
│   │   ├── report/           报告查看
│   │   └── my/               我的（登录 + 设置）
│   ├── api/                  API 客户端
│   ├── store/                Pinia 状态
│   └── utils/                工具
├── manifest.json             应用配置（iOS + Android + 小程序）
├── pages.json                路由配置
├── package.json              依赖与脚本
└── scripts/
    └── package-android.js    CLI 打包脚本
```

## 🚀 5 种发布方式

### 方式 A: 微信小程序（推荐国内）

#### 步骤 1：注册小程序
1. 访问 https://mp.weixin.qq.com
2. 注册小程序账号（个人 / 企业均可）
3. 获取 **AppID**（wx 开头）

#### 步骤 2：编译
```bash
cd apps/mobile-app
# 修改 manifest.json 的 mp-weixin.appid
# "mp-weixin": { "appid": "wx你的AppID" }

pnpm build:mp-weixin
# 输出: dist/build/mp-weixin/
```

#### 步骤 3：上传
1. 下载微信开发者工具：https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html
2. 导入 `dist/build/mp-weixin/` 项目
3. 填写 AppID
4. 点击"上传" → 填写版本号
5. 登录小程序后台 https://mp.weixin.qq.com 提交审核
6. 1-3 天审核通过后即可发布

---

### 方式 B: Android APK（无需 Mac）

#### 方法 1: HBuilderX 云打包（最简单）
1. 下载 HBuilderX：https://www.dcloud.io/hbuilderx.html
2. 文件 → 导入 → 从本地目录导入 → 选择 `apps/mobile-app/`
3. 项目类型选 **uni-app**
4. 菜单 → 发行 → 原生 APP-云打包
5. 选择：
   - **Android** 平台
   - **公共测试证书**（无需自己签名）
   - **包名**：`com.health.yourname`
6. 点击"打包" → 等待 3-5 分钟
7. 下载 APK 文件，发送给用户安装

#### 方法 2: 本地 CLI 打包
```bash
cd apps/mobile-app
pnpm install
node scripts/package-android.js
```

需要的本地环境（推荐使用 Android Studio 安装）：
- JDK 17+
- Android SDK
- Gradle

---

### 方式 C: iOS IPA（需要 Mac + Apple 开发者账号）

#### 步骤 1：准备 Apple 开发者账号
1. 注册 Apple Developer Program：https://developer.apple.com/programs/
2. 费用：**$99/年**
3. 创建 App ID、Provisioning Profile、p12 证书

#### 步骤 2：在 Mac 上打包
```bash
# 复制项目到 Mac
cd apps/mobile-app
pnpm install
pnpm build:app-ios
# 输出: dist/build/app-plus/

# 用 Xcode 打开
open dist/build/app-plus/uniapp.xcworkspace
# Product → Archive → Distribute App → Ad Hoc
```

---

### 方式 D: H5 移动 Web（最简）

```bash
cd apps/mobile-app
pnpm build:h5
# 输出: dist/build/h5/
```

部署到任意 Web 服务器（Nginx / OSS / Vercel 等）：
```nginx
server {
  listen 80;
  server_name m.health.com;
  root /var/www/h5;
  index index.html;
}
```

用户访问：`https://m.health.com/`

---

### 方式 E: 微信公众号 H5 页面

把 H5 包嵌入公众号菜单：
1. 微信公众平台 → 自定义菜单
2. 菜单链接：`https://m.health.com/`
3. 用户点击菜单 → 打开 H5（自带微信授权）

---

## 🌐 移动端如何连接本店桌面应用？

### 步骤 1：桌面应用启动内置后端
桌面应用已自动启动后端，监听 `http://0.0.0.0:3000`

### 步骤 2：查询本店 IP
```bash
# Windows 命令行
ipconfig

# Linux/Mac
ifconfig
```

例如本店 IP 是 `192.168.1.100`

### 步骤 3：移动端配置
1. 打开移动端 APP
2. 我的 → 服务器设置 → API 地址：`http://192.168.1.100:3000/api`
3. 登录账号 → 数据实时同步

### 步骤 4：配置路由器端口转发（外网访问）
1. 登录路由器管理后台（192.168.1.1）
2. 虚拟服务器 / NAT → 添加规则：
   - 外部端口 3000 → 内部 IP 192.168.1.100 → 端口 3000
3. 员工出差在外：访问 `http://公网IP:3000`

---

## 🛠️ 各方式难度对比

| 方式 | 难度 | 费用 | 推荐场景 |
|------|------|------|---------|
| 微信小程序 | ⭐⭐ | ¥300/年认证 | 国内主流，最佳选择 |
| Android APK | ⭐⭐ | 免费 | 安卓用户 |
| H5 | ⭐ | 免费 | 快速试水，微信菜单 |
| iOS IPA | ⭐⭐⭐ | $99/年 | 高端用户 |
| 公众号 H5 | ⭐ | 免费 | 微信生态 |

## 📋 一键打包命令速查

```bash
cd apps/mobile-app

# 微信小程序
pnpm build:mp-weixin

# Android APK
pnpm build:app-android

# iOS IPA (需 Mac)
pnpm build:app-ios

# H5
pnpm build:h5

# 全部
pnpm build:all
```

## 🎯 推荐路线

**最简方案（投入产出比最高）**：
1. **H5 + 微信公众号**（0 费用，10 分钟上线）
2. **微信小程序**（¥300/年认证，1-3 天审核）
3. **Android APK**（免费下载，即时可用）
4. **iOS**（有 Apple 开发者账号再做）

## 💡 我的建议

**先做这 2 件事**（满足 90% 用户）：
1. ✅ **H5 + 公众号菜单** - 立即可用，扫码访问
2. ✅ **Android APK** - 安卓员工必备

**HBuilderX 云打包**：最简单，30 分钟出 APK。

## 📞 技术支持

如需协助：
- 我可以帮您准备 iOS 打包文档
- 我可以帮您编写小程序上传审核材料
- 我可以帮您配置公众号菜单

请告诉我您接下来想做什么！