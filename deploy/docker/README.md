# 复制 .env.example
cp .env.example .env

# 修改 .env 中的密钥
# JWT_SECRET=please-change-me-in-production
# POSTGRES_PASSWORD=your-strong-password

# 启动所有服务
docker-compose up -d

# 等待 30 秒后初始化数据库
sleep 30
docker exec -it health-backend npx prisma migrate deploy
docker exec -it health-backend npx prisma db seed

# 查看日志
docker-compose logs -f backend

# 访问
# API: https://your-domain.com/api
# Swagger: https://your-domain.com/api/docs
# MinIO 控制台: http://your-server:9001 (admin / 您的密码)
