# 阿里云部署指南

> 完整步骤：从零开始将健康管理系统部署到阿里云 ECS，国内用户访问

## 1. 准备工作

### 1.1 阿里云账号 & 备案

1. 注册阿里云账号：https://www.aliyun.com
2. 完成实名认证（个人/企业）
3. **域名备案**：使用大陆境内 ECS 必须要 ICP 备案（7-20 个工作日）
4. 申请 SSL 证书：阿里云免费 DV SSL（1 年）

### 1.2 推荐 ECS 配置

| 项目 | 最低配置 | 推荐配置 |
|------|---------|----------|
| **CPU** | 2 核 | 4 核 |
| **内存** | 4 GB | 8 GB |
| **系统盘** | 40 GB SSD | 100 GB SSD |
| **带宽** | 5 Mbps | 10 Mbps 按流量 |
| **操作系统** | Ubuntu 22.04 LTS | Ubuntu 22.04 LTS |
| **地域** | 华东 1（杭州）/ 华北 2（北京） | 同左 |

预估费用：4 核 8G + 10Mbps ≈ ¥300-500/月

### 1.3 域名

- 注册域名（.cn / .com 均可）
- 在阿里云 DNS 解析到 ECS 公网 IP
- 备案后开启 SSL

## 2. ECS 初始化

### 2.1 登录 ECS

```bash
ssh root@your-server-ip
```

### 2.2 安装基础环境

```bash
# 更新系统
apt update && apt upgrade -y

# 安装 Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh
systemctl start docker
systemctl enable docker

# 安装 Docker Compose
apt install -y docker-compose

# 配置 Docker 镜像加速（阿里云）
mkdir -p /etc/docker
cat > /etc/docker/daemon.json <<EOF
{
  "registry-mirrors": [
    "https://mirror.ccs.tencentyun.com",
    "https://docker.mirrors.ustc.edu.cn"
  ]
}
EOF
systemctl restart docker

# 验证
docker --version
docker-compose --version
```

### 2.3 创建部署目录

```bash
mkdir -p /opt/health-platform
cd /opt/health-platform
```

## 3. 上传项目代码

### 方案 A：Git 克隆（推荐）

```bash
# 在 ECS 上
cd /opt/health-platform
git clone https://github.com/your-repo/health-platform.git .
git checkout v1.0.0
```

### 方案 B：SCP 上传

```bash
# 本地 Windows PowerShell
scp -r "E:\work Codex\健康管理\platform\*" root@your-server-ip:/opt/health-platform/
```

### 方案 C：宝塔面板 + 文件管理

通过宝塔面板上传 zip 包到服务器再解压。

## 4. 配置环境变量

```bash
cd /opt/health-platform/deploy/docker

cat > .env <<EOF
# JWT 密钥（务必修改）
JWT_SECRET=$(openssl rand -hex 32)

# 微信公众号（后期填）
WECHAT_APP_ID=wx0000000000000000
WECHAT_APP_SECRET=
WECHAT_TOKEN=healthclinic

# H5 域名
WEB_BASE_URL=https://your-domain.com

# 数据库密码（生产环境务必修改）
POSTGRES_PASSWORD=$(openssl rand -hex 16)
REDIS_PASSWORD=$(openssl rand -hex 16)
MINIO_ROOT_PASSWORD=$(openssl rand -hex 16)
EOF
```

## 5. 申请并上传 SSL 证书

### 5.1 阿里云申请免费证书

1. 访问 https://yundun.console.aliyun.com/
2. 选择 SSL 证书 → 免费证书 → 立即购买 → 创建证书
3. 域名验证（DNS 验证）
4. 签发后下载 Nginx 格式证书

### 5.2 上传证书到 ECS

```bash
mkdir -p /opt/health-platform/deploy/docker/ssl

# 上传 fullchain.pem 和 privkey.pem 到 ssl 目录
# 文件名必须是：
#   fullchain.pem  - 包含证书链
#   privkey.pem    - 私钥
```

或直接通过宝塔/ftp上传。

## 6. 启动服务

```bash
cd /opt/health-platform/deploy/docker

# 首次启动
docker-compose up -d

# 查看状态
docker-compose ps

# 查看日志
docker-compose logs -f backend
```

等待 1-2 分钟，数据库迁移会自动执行。

## 7. 初始化数据

```bash
# 进入后端容器
docker exec -it health-backend sh

# 执行数据库迁移
npx prisma migrate deploy

# 初始化种子数据
npx prisma db seed

# 退出
exit
```

## 8. 配置阿里云安全组

在阿里云 ECS 控制台：

1. 进入 ECS 实例 → 安全组 → 配置规则
2. 添加入站规则：

| 端口 | 协议 | 来源 | 用途 |
|------|------|------|------|
| 22 | TCP | 0.0.0.0/0 | SSH |
| 80 | TCP | 0.0.0.0/0 | HTTP (重定向到 HTTPS) |
| 443 | TCP | 0.0.0.0/0 | HTTPS |
| 5432 | TCP | 内网 | PostgreSQL（仅内网） |
| 6379 | TCP | 内网 | Redis（仅内网） |
| 9000 | TCP | 内网 | MinIO（仅内网） |

**重要**：数据库端口**不要**对公网开放！

## 9. 配置防火墙（可选）

```bash
# Ubuntu 自带 ufw
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw enable
```

## 10. 验证部署

### 10.1 检查服务

```bash
# 检查所有容器
docker-compose ps

# 健康检查
curl https://your-domain.com/health
# 应返回: ok
```

### 10.2 访问 API 文档

打开浏览器：https://your-domain.com/api/docs

### 10.3 测试默认账号

- 超级管理员：`admin` / `admin123`
- 店长：`manager` / `manager123`
- 健康顾问：`doctor` / `doctor123`

⚠️ **首次登录后请立即修改默认密码！**

## 11. 桌面应用配置

### 11.1 客户端下载

桌面应用启动后，在"系统设置 → API 地址"中填入：

```
https://your-domain.com/api
```

### 11.2 自动启动设备模拟器（可选）

如果没有真实 USB 设备，可以打包设备模拟器到桌面应用中。模拟器会作为子进程随桌面应用启动，提供 ws://localhost:8888/ws 服务。

## 12. 微信公众号对接

### 12.1 配置公众号

1. 登录微信公众平台：https://mp.weixin.qq.com
2. 开发 → 基本配置：
   - URL: `https://your-domain.com/api/wx/callback`
   - Token: `healthclinic`
   - EncodingAESKey: 随机生成
   - 消息加解密: 安全模式
3. 开发 → 消息模板：添加模板获取 ID
4. 配置到桌面端"微信配置"页面

### 12.2 申请自定义菜单

在公众号后台添加菜单：
- 检测预约
- 我的报告
- 调理套餐
- 我的

每个菜单链接到 H5 页面（H5 需要单独开发，可联系开发者）。

## 13. 数据备份

### 13.1 自动备份脚本

```bash
cat > /opt/backup.sh <<EOF
#!/bin/bash
BACKUP_DIR=/opt/backups
DATE=\$(date +%Y%m%d_%H%M%S)

mkdir -p \$BACKUP_DIR

# 备份数据库
docker exec health-postgres pg_dump -U health health_platform | gzip > \$BACKUP_DIR/db_\$DATE.sql.gz

# 备份 MinIO（报告 PDF）
docker run --rm -v health-platform_minio_data:/data -v \$BACKUP_DIR:/backup alpine tar czf /backup/minio_\$DATE.tar.gz /data

# 清理 30 天前的备份
find \$BACKUP_DIR -mtime +30 -delete

echo "Backup completed: \$DATE"
EOF

chmod +x /opt/backup.sh

# 每天凌晨 3 点执行
echo "0 3 * * * root /opt/backup.sh" >> /etc/crontab
```

### 13.2 备份到阿里云 OSS

```bash
# 安装 ossutil
wget http://gosspublic.alicdn.com/ossutil/1.7.13/ossutil64
chmod +x ossutil64
mv ossutil64 /usr/local/bin/ossutil

# 配置
ossutil config

# 同步到 OSS
ossutil cp -r /opt/backups/ oss://your-bucket/backups/
```

## 14. 监控与告警

### 14.1 配置阿里云监控

ECS 控制台 → 云监控 → 添加监控项：
- CPU 使用率 > 80% 告警
- 内存使用率 > 85% 告警
- 磁盘使用率 > 90% 告警
- 公网带宽 > 80% 告警

### 14.2 日志收集

```bash
# 安装 Filebeat
wget https://artifacts.elastic.co/downloads/beats/filebeat/filebeat-8.10.0-amd64.deb
dpkg -i filebeat-8.10.0-amd64.deb

# 配置日志收集（可选，对接阿里云日志服务 SLS）
```

## 15. 性能调优

### 15.1 PostgreSQL 优化

```bash
# 编辑 postgresql.conf
docker exec -it health-postgres bash
echo "shared_buffers = 256MB" >> /var/lib/postgresql/data/postgresql.conf
echo "effective_cache_size = 1GB" >> /var/lib/postgresql/data/postgresql.conf
echo "max_connections = 200" >> /var/lib/postgresql/data/postgresql.conf
```

### 15.2 后端多实例

```bash
docker-compose up -d --scale backend=3
```

## 16. 常见问题

### Q1: 微信回调失败
A: 检查防火墙 443 端口、域名备案、SSL 证书有效性

### Q2: 设备连接不上
A: 确认 USB 设备 VID/PID 是否在兼容列表，参考 `docs/device-protocol.md`

### Q3: 报告生成失败
A: 检查后端日志 `docker-compose logs backend`，可能 Puppeteer 缺少 Chromium

### Q4: 数据库连接超时
A: 检查安全组是否放行 5432 内网端口

## 17. 升级流程

```bash
# 1. 备份
/opt/backup.sh

# 2. 拉取新代码
cd /opt/health-platform
git pull

# 3. 重新构建并启动
cd deploy/docker
docker-compose down
docker-compose build --no-cache
docker-compose up -d

# 4. 数据库迁移
docker exec -it health-backend npx prisma migrate deploy
```

## 18. 联系支持

- 技术文档：`docs/` 目录
- 设备协议：`docs/device-protocol.md`
- API 文档：https://your-domain.com/api/docs
- 问题反馈：support@your-domain.com
