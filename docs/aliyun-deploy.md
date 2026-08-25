# 阿里云部署指南（v1.1 · 含 Chromium/AI/结构化部署）

> 📌 **最新部署变更详见 `00-更新日志-最新功能与状态.md`**
> 完整步骤：从零开始将健康管理系统部署到阿里云 ECS

---

## 〇、v1.1 部署变更（与之前版本差异）

| 变更 | 说明 |
|---|---|
| **新增 Chromium 部署** | PDF 导出需要 `/opt/chromium/chrome-linux64/chrome` + `CHROMIUM_PATH` |
| **AI 结构化解读 maxTokens 5000** | 后端 `ai.service.ts` 已设，无需额外配置 |
| **axios 超时 120s** | 桌面端自动生效 |
| **AI 7 家供应商** | MiniMax 走 `api.minimaxi.com/v1`（国内 Code Plan） |

---

## 1. 准备工作（同 v1.0）

- 阿里云账号、ICP 备案、SSL 证书
- ECS：4 核 8G、Ubuntu 22.04 / Alibaba Cloud Linux 3
- 域名、解析

## 2. ECS 初始化

```bash
apt update && apt upgrade -y
# Docker（推荐）或直接 PM2（我们生产用 PM2 + SQLite）
curl -fsSL https://get.docker.com -o get-docker.sh && sh get-docker.sh
```

## 3. 后端部署（PM2 模式 · 我们生产用）

```bash
mkdir -p /opt/health-platform && cd /opt/health-platform
# 上传项目代码（scp 或 git clone）
# ...

# 1) 安装依赖（包含 puppeteer-core，但 Chromium 单独装）
cd apps/backend
npm install --legacy-peer-deps

# 2) 安装 Chromium（v1.1 新增 · 必需）
# 国内服务器用 npmmirror，避免 dl.google.com 被墙
mkdir -p /opt/chromium && cd /opt/chromium
# 下载 Chrome for Testing 120（稳定版，~150MB）
curl -fsSL -o chrome.zip https://cdn.npmmirror.com/binaries/chrome-for-testing/120.0.6099.109/linux64/chrome-linux64.zip
unzip -o chrome.zip
ls -la /opt/chromium/chrome-linux64/chrome  # 确认存在

# 安装 Chrome 依赖库（Alibaba Cloud Linux 3 / CentOS 系）
dnf install -y atk at-spi2-atk cups-libs libdrm mesa-libgbm nss alsa-lib \
  libXcomposite libXdamage libXrandr libxshmfence libXfixes pango cairo gtk3 libXScrnSaver

# 验证 Chrome 可执行
/opt/chromium/chrome-linux64/chrome --version
# 期望：Google Chrome for Testing 120.0.6099.109

# 3) 配置环境变量
cat > /opt/health-platform/.env <<'EOF'
NODE_ENV=production
PORT=3015
# JWT 密钥
JWT_SECRET=$(openssl rand -hex 32)
# Chromium 路径（v1.1 新增）
CHROMIUM_PATH=/opt/chromium/chrome-linux64/chrome
EOF

# 4) 启动 PM2
cd /opt/health-platform
pm2 start apps/backend/dist/main.js --name health-backend
pm2 save
pm2 startup

# 5) 健康检查
curl http://127.0.0.1:3015/health
# 期望：{"status":"ok",...}
```

## 4. 反向代理（Nginx，可选）

```nginx
server {
  listen 80;
  server_name api.your-domain.com;
  location / {
    proxy_pass http://127.0.0.1:3015;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_read_timeout 120s;  # 覆盖 AI 结构化解读
  }
}
```

## 5. 桌面端配置（v1.1）

桌面端首次登录填：
- API 地址：`https://api.your-domain.com/api`（或 `http://your-server-ip:3015/api`）
- 设备网关：`ws://localhost:8888/ws`（门店本机，**别改成服务器**）
- H5 域名：`https://your-domain.com`

---

## 6. AI 接口配置（v1.1 · 总部专属）

桌面端「**系统设置 → AI 接口配置**」（仅 SUPER_ADMIN 可见）：
- 选择供应商
- 粘贴 API Key
- 点"测试连接"

| Provider | baseUrl | 备注 |
|---|---|---|
| 通义千问 | dashscope.aliyuncs.com | 阿里云百炼 |
| 豆包 | ark.cn-beijing.volces.com | 火山方舟 |
| Kimi | api.moonshot.cn | 月之暗面 |
| **MiniMax** | **api.minimaxi.com/v1** | **国内 Code Plan 走这个** |
| DeepSeek | api.deepseek.com | |
| 智谱 | open.bigmodel.cn | |
| 蚂蚁百灵 | api.ant-ling.com | |

---

## 7. PDF 导出验证

```bash
# 登录获取 token
TOKEN=$(curl -s -X POST http://127.0.0.1:3015/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}' | \
  node -e 'let d="";process.stdin.on("data",c=>d+=c);process.stdin.on("end",()=>{console.log(JSON.parse(d).data.accessToken)})')

# 取一份报告 ID
RID=$(curl -s "http://127.0.0.1:3015/api/reports?page=1&pageSize=1" \
  -H "Authorization: Bearer $TOKEN" | \
  node -e 'let d="";process.stdin.on("data",c=>d+=c);process.stdin.on("end",()=>{console.log(JSON.parse(d).data.items[0].id)})')

# 下载 PDF（应 200 + application/pdf）
curl -s -o test.pdf -w "HTTP %{http_code} %{content_type} %{size_download}B\n" \
  "http://127.0.0.1:3015/api/reports/$RID/pdf" \
  -H "Authorization: Bearer $TOKEN"
head -c 8 test.pdf | cat -v   # 期望：%PDF-1.4
```

如果返回 503，排查：
1. `CHROMIUM_PATH` 是否正确写入 .env 并被 PM2 加载（`pm2 restart --update-env`）
2. Chrome 依赖库是否装全（`/opt/chromium/chrome-linux64/chrome --version` 能否跑通）
3. 后端日志：`pm2 logs health-backend | grep -iE "puppeteer|chromium"`

---

## 8. AI 结构化解读验证

```bash
curl -s -X POST "http://127.0.0.1:3015/api/ai/interpret/$RID/structured" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{}' | node -e '...解析 structured 字段...'
```

期望返回 10 字段：`overallAssessment, constitutionAnalysis, keyFindings, risks, diet, exercise, lifestyle, meridians, therapies, followUp`

如果只返回 3 字段（`indicator/level/advice`）或 `{raw:"..."}`，说明：
1. maxTokens 不够（已在 v1.1 改 5000）
2. MiniMax 走国际版端点（国内 Code Plan 必须是 `api.minimaxi.com/v1`）

---

## 9. 数据备份（v1.1 维持）

每日凌晨 4 点自动备份 SQLite，保留 7 份：
```bash
ls -la /opt/health-platform/backups/
```

手动恢复：
```bash
pm2 stop health-backend
cp /opt/health-platform/backups/db-YYYYMMDD_HHMMSS.sqlite.gz /tmp/
cd /opt/health-platform && gunzip -c /tmp/db-*.sqlite.gz > prisma/dev.db
pm2 start health-backend --update-env
```

---

## 10. 常见问题

### Q1：AI 解读 500 / `invalid api key`
- A：MiniMax 国内 Key 必须配 `https://api.minimaxi.com/v1`（不是 `.io`）
- 切到 Code Plan 订阅的 Key 跑 `POST /api/ai-config` 重置

### Q2：PDF 503
- A：见 §7 三步排查

### Q3：结构化解读返回 `{raw}`
- A：v1.1 已修。若仍出现 → `pm2 logs` 看 `parseJSON` 是否抛错；点桌面端"重新生成"

### Q4：门店连不上
- A：检查安全组 3015 端口、检查域名备案与 SSL

---

## 11. 升级流程（v1.0 → v1.1）

```bash
# 1. 备份
/opt/backup.sh

# 2. 拉新代码
cd /opt/health-platform
git pull  # 或重新上传

# 3. 重装后端依赖
cd apps/backend && npm install --legacy-peer-deps

# 4. 装 Chromium（首次部署才需要）
# （见 §3 步骤 2）

# 5. 重启
pm2 restart health-backend --update-env

# 6. 桌面端让用户下载 v1.1 新安装包
```

---

> 📌 最新功能与状态见 `00-更新日志-最新功能与状态.md`
