# 🖥️ 桌面端 Mac 打包指南

> 本文档说明如何在 Mac 系统上打包 macOS 版本

## 系统要求

- **macOS** 10.13+
- **Xcode** Command Line Tools
- **Node.js** 18+
- **pnpm** 8+

## 步骤 1: 准备 Mac 环境

```bash
# 安装 Homebrew (如果没有)
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# 安装 Node.js
brew install node@20

# 安装 pnpm
npm install -g pnpm

# 安装 Xcode CLI
xcode-select --install
```

## 步骤 2: 复制项目到 Mac

```bash
# 通过 Git 克隆（推荐）
git clone https://github.com/your-repo/health-platform.git

# 或者通过 scp 传输
scp -r user@windows-pc:/path/to/platform ./health-platform

cd health-platform
```

## 步骤 3: 安装依赖

```bash
pnpm install
```

## 步骤 4: 启动后端（如未启动）

```bash
pnpm docker:up
pnpm db:migrate
pnpm db:seed
pnpm --filter backend run dev
```

## 步骤 5: 打包桌面端

```bash
cd apps/desktop
pnpm desktop:build
```

## 步骤 6: 输出位置

打包成功后，安装包在：

```
apps/desktop/release/
├── 健康管理系统-1.0.0.dmg       # macOS 安装包
├── 健康管理系统-1.0.0-x64.dmg   # Intel 芯片 (Intel Mac)
├── 健康管理系统-1.0.0-arm64.dmg # Apple Silicon (M1/M2/M3)
└── mac/
    ├── 健康管理系统.app/        # App Bundle (可直接拖入 Applications)
    └── ...
```

## 步骤 7: 签名（可选，推荐）

### 申请 Apple 开发者证书

1. 注册 Apple Developer Program ($99/年)
   https://developer.apple.com/programs/
2. 在 Xcode 中：
   - 打开 `apps/desktop/release/mac/健康管理系统.app`
   - 选择项目 → Signing & Capabilities
   - 勾选 "Automatically manage signing"
   - 选择开发团队
3. 菜单 → Product → Archive
4. Distribute App → Developer ID → Export

### 公证 (Notarization)

```bash
# 创建公证专用密码 (App-Specific Password)
# https://appleid.apple.com/account/manage  生成

xcrun notarytool submit "健康管理系统.dmg" \
  --apple-id "your@email.com" \
  --password "xxxx-xxxx-xxxx-xxxx" \
  --team-id "XXXXXXXXXX" \
  --wait
```

## 步骤 8: 分发

### 方式 1: DMG 直接分发
- 将 .dmg 上传到网站或网盘
- 用户双击挂载后拖入 Applications

### 方式 2: 上架 Mac App Store
1. 在 App Store Connect 创建应用
2. Xcode → Archive → Distribute → App Store Connect
3. 等待审核（通常 1-3 天）

### 方式 3: 内部 TestFlight
1. Xcode → Archive → Distribute → TestFlight
2. 添加内部测试员

## 常见问题

### Q1: 打包报错 "code signing"
A: 需要 Apple 开发者证书

### Q2: 启动时报错"无法打开,因为它来自身份不明的开发者"
A: 系统设置 → 隐私与安全 → 仍要打开

### Q3: Intel / Apple Silicon 兼容性
electron-builder 会自动生成两个版本:
- x64: Intel Mac
- arm64: Apple Silicon Mac (M1/M2/M3)

### Q4: 图标问题
- macOS 需要 512x512 PNG 图标
- 替换 `apps/desktop/build/icon.icns`

## 自动化跨平台打包

### 在 Windows 上交叉打包 Mac（不推荐）

理论上可以，但需要：
- macOS SDK（License 限制）
- 签名证书（必须有 Apple Developer 账号）

### 推荐: GitHub Actions 自动化

```yaml
# .github/workflows/build-mac.yml
name: Build macOS
on: [push]
jobs:
  build:
    runs-on: macos-latest
    steps:
      - uses: actions/checkout@v3
      - uses: pnpm/action-setup@v2
      - run: pnpm install
      - run: cd apps/desktop && pnpm desktop:build
      - uses: actions/upload-artifact@v3
        with:
          name: mac-build
          path: apps/desktop/release/*.dmg
```

