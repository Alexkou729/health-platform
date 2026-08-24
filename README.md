# 🏥 健康管理系统 (Health Platform)

> 基于 Quantum Analyzer 反编译分析 + 网络版升级方案构建的养生馆健康管理系统

[![Vue](https://img.shields.io/badge/Vue-3.4-brightgreen)]() [![Electron](https://img.shields.io/badge/Electron-29-blueviolet)]() [![NestJS](https://img.shields.io/badge/NestJS-10-red)]() [![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-blue)]()

## ✨ 核心特性

- 🖥️ **PC 桌面应用** - Electron + Vue 3 + 科技感 UI
- 🌐 **联网 SaaS** - NestJS + PostgreSQL + Redis + MinIO
- 📱 **微信公众号** - OAuth + 模板消息 + 微信支付
- 🔬 **43 份报告** - 心脑血管/微量元素/中医体质/...
- 🩺 **设备兼容** - USB HID 设备 + 完整协议 + 模拟器
- 👥 **会员管理** - 客户档案 / 套餐 / 订单 / 复检提醒
- 📊 **数据看板** - 实时运营指标 + 趋势分析

## 🏗 技术架构

```
┌─────────────────────────────────────────────────────────┐
│  C 端 (客户端)                                            │
│  微信小程序 · 公众号 · H5                                 │
└────────────────────────┬────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────┐
│  阿里云 ECS (Nginx + SSL)                                │
└────────────────────────┬────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────┐
│  NestJS API (Docker)                                     │
│  客户 · 检测 · 报告 · 设备 · 营销 · 微信                 │
└────────────────────────┬────────────────────────────────┘
                         │
        ┌────────────────┼────────────────┐
        ▼                ▼                ▼
   PostgreSQL         Redis           MinIO
   (主数据库)        (缓存)        (报告PDF)
```

## 🚀 快速开始

### 方式 1：本地开发（推荐）

```bash
# 1. 安装依赖
pnpm install

# 2. 启动所有依赖服务（PostgreSQL + Redis + MinIO）
pnpm docker:up

# 3. 数据库迁移 + 种子数据
pnpm db:migrate
pnpm db:seed

# 4. 启动后端
pnpm --filter backend run dev
# API: http://localhost:3000
# Swagger: http://localhost:3000/api/docs

# 5. 启动桌面应用（新终端）
pnpm desktop:dev
```

### 方式 2：一键 Docker 部署

```bash
cd deploy/docker

# 配置环境变量
cp .env.example .env
# 修改 .env 中的密码和密钥

# 启动所有服务
docker-compose up -d

# 初始化数据库
docker exec -it health-backend npx prisma migrate deploy
docker exec -it health-backend npx prisma db seed
```

### 方式 3：阿里云 ECS 部署

参见 [docs/aliyun-deploy.md](docs/aliyun-deploy.md)

## 📦 项目结构

```
health-platform/
├── apps/
│   ├── backend/             # NestJS 后端 API
│   ├── desktop/             # Electron + Vue 3 PC 桌面应用
│   └── device-simulator/    # 设备模拟器（无硬件演示）
├── packages/
│   ├── shared/              # 共享类型 / 数据模型
│   ├── device-driver/       # USB HID 设备协议驱动
│   └── ui/                  # 共享 UI 组件
├── deploy/
│   └── docker/              # Docker 一键部署
└── docs/
    ├── device-protocol.md   # 设备协议规范
    └── aliyun-deploy.md     # 阿里云部署指南
```

## 🔌 设备兼容性

完全兼容原 **Quantum Analyzer v13.6** USB HID 设备：

| 协议特征 | 实现 |
|---------|------|
| 帧格式 (0xAA55...0D0A) | ✅ |
| CRC16-CCITT 校验 | ✅ |
| 7 通道生物电 (ECG/EEG/EMG/BVP/GSR/TEMP/RESP) | ✅ |
| 60Hz 实时采样 | ✅ |
| WMI / SetupAPI 设备枚举 | ✅ |
| VID 0x1234 / PID 0x5678 | ✅ |

无设备时自动启动模拟器，无需修改即可演示完整流程。

## 🎯 核心功能

### 客户管理
- 客户档案（姓名/手机/性别/年龄/身高体重）
- 会员等级（青铜/白银/黄金/钻石/黑金）
- 客户标签（中医 9 种体质）
- 检测历史 / 消费记录

### 检测中心
- 选择设备 + 客户 → 一键开始 60 秒检测
- 实时波形显示（ECG 心电图）
- 进度环 + 信号强度 + 心率监测
- 自动生成 43 份评估报告

### 报告中心
- 综合报告 / 心脑血管 / 微量元素 / ...
- 评分雷达图 + 关键指标
- 健康建议 + 重点关注
- H5 在线版 + PDF 下载

### 营销工具
- 套餐管理（单次/多次/年卡/调理）
- 订单支付（微信支付）
- 优惠券 / 拼团 / 老带新
- 复检提醒 / 生日营销

### 设备管理
- 设备列表 + 在线/离线状态
- USB 设备自动检测
- 设备绑定 / 续期 / 解绑
- 心跳监控

## 🛠 技术栈

| 层 | 技术 |
|---|------|
| 后端 | NestJS 10 · Prisma 5 · PostgreSQL 15 · Redis 7 · MinIO |
| 前端 | Vue 3 · TypeScript · Vite · Pinia · Element Plus · ECharts |
| 桌面 | Electron 29 · node-hid · Socket.IO |
| 设备 | USB HID · WebSocket · MQTT |
| 部署 | Docker · Docker Compose · Nginx · Let's Encrypt |
| 微信 | 公众号 OAuth · 模板消息 · 微信支付 · JSSDK |

## 📊 默认账号

| 账号 | 密码 | 角色 |
|------|------|------|
| admin | admin123 | 超级管理员 |
| manager | manager123 | 店长 |
| doctor | doctor123 | 健康顾问 |

⚠️ **首次登录后请立即修改默认密码！**

## 📱 设备协议

完整协议规范参见 [docs/device-protocol.md](docs/device-protocol.md)

```typescript
import { DeviceSimulator, PROTOCOL } from '@health/device-driver';

const sim = new DeviceSimulator({ serialNo: 'QA-SIM-001' });
sim.start((frame) => {
  console.log('实时帧:', frame);
  // frame.channels: ECG/EEG/EMG/BVP/GSR/TEMP/RESP
  // frame.heartRate, frame.signalStrength
});
```

## 📚 文档

- [架构方案](E:\work%20Codex\%E5%81%A5%E5%BA%B7%E7%AE%A1%E7%90%86\analysis\architecture.html) - 完整可视化架构
- [设备协议](docs/device-protocol.md) - USB HID 协议规范
- [阿里云部署](docs/aliyun-deploy.md) - ECS 部署步骤
- [API 文档](http://localhost:3000/api/docs) - Swagger 接口文档
- [报告清单](E:\work%20Codex\%E5%81%A5%E5%BA%B7%E7%AE%A1%E7%90%86\analysis\%E6%8A%A5%E5%91%8A%E6%B8%85%E5%8D%95.md) - 43 份报告

## 🔒 安全

- HTTPS 全站加密（Let's Encrypt）
- JWT 鉴权 + 设备 + 门店 + 操作员三元组绑定
- 数据加密存储（敏感字段 AES）
- 端到端加密（设备数据）
- 操作审计日志
- 等保 2.0 三级合规

## 📜 License

Proprietary - All rights reserved.

## 🤝 联系

- 项目主页：https://your-domain.com
- 技术支持：support@your-domain.com
