# 阿里云 ECS 国内服务器 - 一键部署脚本
# 使用方法：上传此包到 ECS，执行 bash deploy.sh
set -e

echo "=========================================="
echo "  健康管理系统 - 阿里云 ECS 一键部署"
echo "=========================================="
echo ""

# 检查 root
if [ "$EUID" -ne 0 ]; then
  echo "请使用 root 用户执行: sudo bash deploy.sh"
  exit 1
fi

# 1. 检测系统
echo "[1/8] 检测系统..."
if [ -f /etc/os-release ]; then
  . /etc/os-release
  echo "  系统: $PRETTY_NAME"
fi

# 2. 安装 Docker
echo "[2/8] 安装 Docker..."
if ! command -v docker &> /dev/null; then
  echo "  正在安装 Docker..."
  curl -fsSL https://get.docker.com -o get-docker.sh
  sh get-docker.sh
  systemctl start docker
  systemctl enable docker
  echo "  ✅ Docker 安装完成"
else
  echo "  ✅ Docker 已安装: $(docker --version)"
fi

# 3. 配置 Docker 镜像加速 (阿里云)
echo "[3/8] 配置 Docker 镜像加速..."
mkdir -p /etc/docker
cat > /etc/docker/daemon.json <<EOF
{
  "registry-mirrors": [
    "https://mirror.ccs.tencentyun.com",
    "https://docker.mirrors.ustc.edu.cn",
    "https://registry.cn-hangzhou.aliyuncs.com"
  ],
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "100m",
    "max-file": "3"
  }
}
EOF
systemctl restart docker
echo "  ✅ 镜像加速配置完成"

# 4. 安装 Docker Compose
echo "[4/8] 安装 Docker Compose..."
if ! command -v docker-compose &> /dev/null; then
  curl -L "https://github.com/docker/compose/releases/download/v2.24.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
  chmod +x /usr/local/bin/docker-compose
  echo "  ✅ Docker Compose 安装完成"
else
  echo "  ✅ Docker Compose 已安装"
fi

# 5. 配置防火墙
echo "[5/8] 配置防火墙..."
if command -v ufw &> /dev/null; then
  ufw --version
  ufw allow 22/tcp   # SSH
  ufw allow 80/tcp   # HTTP
  ufw allow 443/tcp  # HTTPS
  ufw allow 3000/tcp # Backend API
  echo "y" | ufw enable
  echo "  ✅ UFW 防火墙配置完成"
elif command -v firewall-cmd &> /dev/null; then
  systemctl start firewalld
  firewall-cmd --permanent --add-port=22/tcp
  firewall-cmd --permanent --add-port=80/tcp
  firewall-cmd --permanent --add-port=443/tcp
  firewall-cmd --permanent --add-port=3000/tcp
  firewall-cmd --reload
  echo "  ✅ Firewalld 防火墙配置完成"
else
  echo "  ⚠️  未检测到防火墙，请手动放行端口 22/80/443/3000"
fi

# 6. 创建工作目录
echo "[6/8] 创建工作目录..."
APP_DIR=/opt/health-platform
mkdir -p $APP_DIR
cd $APP_DIR

# 复制部署文件
cp -r ../docker-compose.yml .
cp -r ../nginx ./nginx
cp -r ../backend ./backend
cp ../backend/.env.example ./.env

echo "  ✅ 工作目录: $APP_DIR"

# 7. 生成随机密码
echo "[7/8] 生成安全密码..."
DB_PASS=$(openssl rand -hex 16)
REDIS_PASS=$(openssl rand -hex 16)
MINIO_PASS=$(openssl rand -hex 16)
JWT_SECRET=$(openssl rand -hex 32)

cat > .env <<EOF
# ============== 数据库 ==============
POSTGRES_USER=health
POSTGRES_PASSWORD=$DB_PASS
POSTGRES_DB=health_platform

# ============== Redis ==============
REDIS_PASSWORD=$REDIS_PASS

# ============== MinIO ==============
MINIO_ROOT_USER=minioadmin
MINIO_ROOT_PASSWORD=$MINIO_PASS

# ============== JWT ==============
JWT_SECRET=$JWT_SECRET
JWT_EXPIRES_IN=7d

# ============== 应用 ==============
NODE_ENV=production
PORT=3000
PUBLIC_URL=https://your-domain.com
EOF

echo "  ✅ 密码已生成并保存到 .env"

# 8. 启动服务
echo "[8/8] 启动 Docker 服务..."
docker-compose pull
docker-compose up -d

echo ""
echo "  ⏳ 等待服务启动 (30 秒)..."
sleep 30

# 数据库迁移
echo ""
echo "  📊 初始化数据库..."
docker exec health-backend npx prisma migrate deploy 2>&1 | head -5
docker exec health-backend npx prisma db seed 2>&1 | head -5

echo ""
echo "=========================================="
echo "  ✅ 部署成功！"
echo "=========================================="
echo ""
echo "服务地址："
echo "  API:       http://$(curl -s ifconfig.me):3000"
echo "  健康检查:   http://$(curl -s ifconfig.me):3000/health"
echo "  Swagger:   http://$(curl -s ifconfig.me):3000/api/docs"
echo ""
echo "默认账号："
echo "  管理员: admin / admin123"
echo ""
echo "下一步："
echo "  1. 配置域名解析到本机公网 IP"
echo "  2. 申请 SSL 证书 (阿里云免费 DV SSL)"
echo "  3. 启动 Nginx: cd $APP_DIR && docker-compose --profile with-nginx up -d"
# 生成强 admin 密码（首次部署强制；写入 .env 用于后端启动）
ADMIN_PASS=$(openssl rand -base64 18 | tr -d '=+/' | head -c 20)
echo "DEFAULT_ADMIN_PASSWORD=$ADMIN_PASS" >> .env

echo ""
echo "=========================================="
echo "  🔐 首次部署 - 自动生成 admin 强密码"
echo "=========================================="
echo "  账号: admin"
echo "  密码: $ADMIN_PASS"
echo "  ⚠️  请立即记录，关闭此终端后将无法找回！"
echo "  📝 登录后请在「系统设置 → 修改密码」中改为自己的强密码。"
echo "=========================================="
echo ""
echo "  4. 桌面应用配置 API 地址为: https://your-domain.com/api"
echo ""
echo "查看日志: cd $APP_DIR && docker-compose logs -f backend"
echo ""
