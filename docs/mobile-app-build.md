# 📱 移动端 APP 打包指南 (Android + iOS)

> 本项目使用 uni-app 框架开发，可一次编写、编译为 Android APK / iOS IPA / H5 / 微信小程序

## 📋 项目结构

```
apps/mobile-app/
├── src/
│   ├── pages/              # 页面
│   │   ├── index/         # 工作台
│   │   ├── detect/        # 检测中心 (含 60 秒动画)
│   │   ├── customer/      # 客户管理
│   │   ├── appointment/   # 预约管理
│   │   ├── plan/          # 调理方案
│   │   ├── report/        # 报告查看
│   │   └── my/            # 我的
│   ├── api/               # API 客户端
│   ├── store/             # Pinia 状态
│   └── utils/             # 工具
├── manifest.json          # uni-app 应用配置
├── pages.json             # 页面路由
└── package.json
```

## 🚀 方案 A: HBuilderX 云打包（推荐，最简单）

### 步骤 1: 下载 HBuilderX
- 官网：https://www.dcloud.io/hbuilderx.html
- 下载"App 开发版"（免费）

### 步骤 2: 导入项目
1. 打开 HBuilderX
2. 菜单 → 文件 → 导入 → 从本地目录导入
3. 选择 `apps/mobile-app/` 文件夹
4. 项目类型选 **uni-app**

### 步骤 3: 配置应用信息
1. 菜单 → 发行 → 原生 APP-云打包
2. 第一次需要配置：
   - **应用名称**: 健康管理系统
   - **应用图标**: 256x256 PNG (用 build/icon.png)
   - **启动图**: 可选
   - **包名**: `com.health.platform`
   - **版本号**: 1.0.0
   - **版本代码**: 100

### 步骤 4: Android 打包
1. 选择 **Android**
2. 勾选 **使用广告/不使用广告** → 选"不使用"
3. 选择 **Android 证书** → 选"自有证书"或"公共测试证书"
4. 点击 **打包**
5. 等待 2-5 分钟（云端编译）
6. 下载 APK 文件

### 步骤 5: iOS 打包（需 Mac）
1. 必须有 **Apple 开发者账号**（$99/年）
2. 在 Mac 上操作：
   - 安装 HBuilderX
   - 导入项目
   - 选择 **iOS** → **打包**
   - 上传 .p12 证书和 .mobileprovision 描述文件
3. 云端编译后下载 IPA

## 🚀 方案 B: CLI 本地打包（高级用户）

### 安装 uni-app CLI

```bash
cd apps/mobile-app
pnpm install
```

### Android 本地打包

#### 1. 准备 Android 签名证书

```bash
# 生成 keystore（首次）
keytool -genkey -v -keystore android.keystore -alias health \
  -keyalg RSA -keysize 2048 -validity 10000

# 转换格式（uni-app 需要）
keytool -importkeystore -srckeystore android.keystore \
  -destkeystore android.keystore -deststoretype pkcs12
```

#### 2. 配置打包

```bash
# 编辑 src/manifest.json
{
  "app-plus": {
    "distribute": {
      "android": {
        "keystore": "android.keystore",
        "password": "your-password",
        "alias": "health"
      }
    }
  }
}
```

#### 3. 编译

```bash
# H5
pnpm build:h5

# Android App
pnpm build:app-android

# 输出在 dist/build/app-plus/
```

### iOS 本地打包（必须 Mac + Xcode）

#### 1. 准备证书
- 在 Apple Developer 后台创建：
  - App ID
  - 证书 (.cer)
  - 描述文件 (.mobileprovision)
  - 推送证书（可选）

#### 2. 配置 Xcode

```bash
# 安装 Xcode 命令行工具
xcode-select --install

# 安装 CocoaPods
sudo gem install cocoapods

# 安装依赖
cd apps/mobile-app
pnpm install
```

#### 3. 编译

```bash
# 生成原生工程
pnpm build:app-ios

# 打开 Xcode 工程
open dist/build/app-plus/uniapp.xcworkspace

# 在 Xcode 中：
# 1. 选择开发团队
# 2. Archive → Distribute App → Ad Hoc / App Store
```

## 📦 离线安装包

### Android APK

```bash
# 通过 ADB 安装（USB 调试）
adb install 健康管理系统-1.0.0.apk

# 无线安装
# 1. 把 APK 传到手机
# 2. 手机打开文件管理器，点击 APK 安装
# 3. 允许"未知来源"
```

### iOS IPA

```bash
# 通过 Xcode 安装（开发者证书）
xcrun ios-deploy -i 健康管理系统.ipa

# TestFlight（推荐）
# 1. Xcode → Archive → Distribute → App Store Connect
# 2. 在 App Store Connect 中添加测试员
# 3. 测试员通过 TestFlight APP 安装
```

## 🔧 常见问题

### Q1: 编译报错 "证书未找到"
A: 检查 manifest.json 中的证书路径和密码

### Q2: 安装后白屏
A: 检查 API 地址配置 → 进入 APP"我的"页 → 登录页 → 修改 API URL

### Q3: iOS 上传 App Store 被拒
A: 需要：
- 隐私政策 URL
- 完整的应用描述
- 测试账号
- 截图 (各尺寸)

### Q4: Android 7 以下不兼容
A: minSdkVersion 设为 21 (Android 5.0+)

## 💡 推荐上架应用商店

| 平台 | 时间 | 费用 | 备注 |
|------|------|------|------|
| 华为应用市场 | 1-3 天 | 免费 | 国内推荐 |
| 小米应用商店 | 1-2 天 | 免费 | 国内推荐 |
| OPPO / VIVO | 2-5 天 | 免费 | |
| Apple App Store | 1-7 天 | $99/年 | 海外 |
| Google Play | 1-3 天 | $25 一次性 | 海外 |

## 📞 联系

- 技术问题：提交 GitHub Issue
- 打包问题：参考 uni-app 官方文档 https://uniapp.dcloud.net.cn/tutorial/mobile-app/package.html

