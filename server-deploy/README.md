# 阿里云 ECS 一键部署包

> 健康管理系统 v1.0.0 完整部署包，适用于阿里云国内 ECS / 任意 Ubuntu 22.04 服务器

## 📦 包含内容

```
server-deploy/
├── backend/                  NestJS 后端源码 + Dockerfile (17 个业务模块)
├── nginx/                    Nginx 配置 + SSL 配置模板
├── scripts/
│   └── deploy.sh             ⭐ 一键部署脚本（自动安装 Docker + 启动所有服务）
├── docs/
│   └── 阿里云ECS部署指南.md    ⭐ 完整部署文档（购买 ECS → 备案 → 上线）
├── docker-compose.yml         Docker Compose 主配置
├── .env.example              环境变量模板
└── README.md                 本文件
```

## 🚀 5 步完成部署

### 第 1 步：购买阿里云 ECS
- 地域：华东 1（杭州）或华北 2（北京）
- 规格：4 核 8G + 100GB SSD
- 带宽：5Mbps
- 系统：Ubuntu 22.04 LTS
- 记录 **公网 IP**

### 第 2 步：上传部署包到服务器
```bash
scp -r server-deploy/* root@YOUR_IP:/opt/health-platform/
```

### 第 3 步：执行一键部署
```bash
ssh root@YOUR_IP
cd /opt/health-platform
chmod +x scripts/deploy.sh
sudo bash scripts/deploy.sh
```

等待 3-5 分钟，自动完成：
- 安装 Docker + Docker Compose
- 配置国内镜像加速
- 启动 PostgreSQL + Redis + MinIO + Backend
- 数据库迁移 + 种子数据
- 配置防火墙

### 第 4 步：上传 SSL 证书（启用 HTTPS）
```bash
# 在本地
scp fullchain.pem root@YOUR_IP:/opt/health-platform/nginx/ssl/
scp privkey.pem root@YOUR_IP:/opt/health-platform/nginx/ssl/

# 在服务器
cd /opt/health-platform
docker-compose --profile with-nginx up -d
```

### 第 5 步：连接桌面应用
- 桌面应用 → 系统设置 → API 地址：`https://yourdomain.com/api`
- 登录 `admin / admin123`

## 🌐 完整联网能力

部署后，您的团队成员可以在任何地方：
- ✅ 电脑访问：`https://yourdomain.com/admin` 或桌面应用
- ✅ 手机访问：`https://yourdomain.com/h5/?id=xxx`（客户报告）
- ✅ 多员工协同：所有数据云端同步
- ✅ 多门店管理：每个门店独立账号
- ✅ 微信对接：服务号通知 + 客户预约

## 💰 阿里云费用

| 项目 | 月费 |
|------|------|
| ECS 4核8G 5Mbps | ¥300-400 |
| 域名 (.com) | ¥70/年 |
| SSL 证书 | 免费 |
| OSS 备份 | ¥5/月 |
| **合计** | **约 ¥400/月** |

## 📞 技术支持

完整文档：`docs/阿里云ECS部署指南.md`