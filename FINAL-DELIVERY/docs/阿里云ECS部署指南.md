# 🚀 健康管理系统 - 阿里云 ECS 国内服务器部署指南

## 完整步骤：从购买到上线

### 第 1 步：购买 ECS 服务器（10 分钟）

1. 登录阿里云：https://www.aliyun.com
2. 进入 ECS 控制台：https://ecs.console.aliyun.com
3. 点击 **创建实例**：
   - **地域**：华东 1（杭州）或 华北 2（北京）
   - **实例规格**：ecs.c6.large (2核4G) 或 c6.xlarge (4核8G)
   - **镜像**：Ubuntu 22.04 64位
   - **系统盘**：ESSD PL1 100GB
   - **带宽**：按固定带宽 5Mbps 或按使用流量 10Mbps
   - **安全组**：新建 → 放通 22 (SSH) / 80 (HTTP) / 443 (HTTPS)
4. 设置 root 密码（务必记住！）
5. 支付订单
6. 记录 **公网 IP**（部署后连接用）

### 第 2 步：注册并备案域名（7-20 天，仅一次）

1. **注册域名**：阿里云万网 https://wanwang.aliyun.com
   - 推荐 `.com` / `.cn` 后缀
2. **ICP 备案**（必须！否则 80/443 端口被封禁）：
   - 进入：https://beian.aliyun.com
   - 填写主办者信息 + 网站信息
   - 上传身份证 + 人脸识别
   - 阿里云初审（1-2 天）
   - 管局审核（7-20 天）
3. **DNS 解析**（备案通过后）：
   - 进入 https://dns.console.aliyun.com
   - 添加 A 记录 → ECS 公网 IP

### 第 3 步：申请 SSL 证书（10 分钟，免费）

1. 阿里云 SSL 证书：https://yundun.console.aliyun.com
2. **免费证书** → **立即购买** → 创建证书
3. 选择 **DNS 验证**（最简单）
4. 添加 CNAME 记录 → 等待签发（10-30 分钟）
5. 下载 **Nginx 格式** 证书：
   - `xxx.pem` → 重命名为 `fullchain.pem`
   - `xxx.key` → 重命名为 `privkey.pem`

### 第 4 步：一键部署后端服务（5 分钟）

在本地 Windows PowerShell 中：

```powershell
# 1. 上传部署包到服务器（替换为您的 IP）
scp -r "E:\work Codex\健康管理\platform\server-deploy\*" root@47.96.123.45:/opt/health-platform/
```

SSH 登录服务器：
```bash
ssh root@47.96.123.45
```

执行一键部署：
```bash
cd /opt/health-platform
chmod +x scripts/deploy.sh
sudo bash scripts/deploy.sh
```

**自动完成**：
- ✅ 安装 Docker + Docker Compose
- ✅ 配置国内镜像加速
- ✅ 启动 PostgreSQL + Redis + MinIO + 后端 API
- ✅ 生成安全密码
- ✅ 数据库迁移 + 种子数据
- ✅ 配置防火墙

### 第 5 步：配置 SSL + Nginx（3 分钟）

1. 上传 SSL 证书：
```bash
mkdir -p /opt/health-platform/nginx/ssl
# 在本地执行：
scp fullchain.pem root@47.96.123.45:/opt/health-platform/nginx/ssl/
scp privkey.pem root@47.96.123.45:/opt/health-platform/nginx/ssl/
```

2. 启动 Nginx（含 HTTPS）：
```bash
cd /opt/health-platform
docker-compose --profile with-nginx up -d
```

### 第 6 步：验证部署成功

```bash
# 健康检查
curl https://health.yourdomain.com/health
# 返回: {"status":"ok","timestamp":"..."}

# API 文档
浏览器访问：https://health.yourdomain.com/api/docs
```

### 第 7 步：桌面应用连接服务器

1. 启动桌面应用 `健康管理系统-Setup-1.0.0.exe`
2. **系统设置** → API 地址：
   ```
   https://health.yourdomain.com/api
   ```
3. 登录 `admin / admin123`
4. ✅ 整个门店/公司员工都能用！

### 第 8 步：H5 报告查看（客户扫码）

1. 上传 H5 构建产物：
```powershell
scp -r "E:\work Codex\健康管理\platform\apps\customer-h5\dist\*" root@47.96.123.45:/opt/health-platform/customer-h5/
```

2. 客户扫码：`https://health.yourdomain.com/h5/?id=报告ID`

---

## 💰 费用预算

| 项目 | 月费 |
|------|------|
| ECS 4核8G + 5Mbps | ¥300-400 |
| 域名 (.com) | ¥6/月（年付） |
| SSL 证书 (DV) | 免费 |
| 阿里云 OSS (备份) | ¥5/月 |
| **合计** | **约 ¥400/月** |

## 🔧 日常运维命令

```bash
# 查看服务状态
docker-compose ps

# 查看日志
docker-compose logs -f backend

# 重启服务
docker-compose restart backend

# 备份数据库
docker exec health-postgres pg_dump -U health health_platform | gzip > backup.sql.gz

# 升级系统
cd /opt/health-platform
docker-compose pull
docker-compose up -d
docker exec health-backend npx prisma migrate deploy

# 查看资源占用
docker stats
```

## 🛡️ 安全建议

1. **立即修改默认密码**（admin/admin123）
2. **定期备份数据库**（每天）
3. **数据库端口不要对公网开放**
4. **启用阿里云 WAF 防火墙**（抗 CC 攻击）
5. **安装 SSL 证书**（启用 HTTPS）
