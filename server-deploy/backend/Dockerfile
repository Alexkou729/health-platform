# 后端 API Dockerfile
# 多阶段构建，减小镜像体积

# 阶段 1：构建
FROM node:20-alpine AS builder

WORKDIR /app

# 安装构建依赖
RUN apk add --no-cache python3 make g++ openssl

# 复制根 package.json
COPY package.json pnpm-workspace.yaml .npmrc ./

# 复制所有 apps 和 packages（pnpm monorepo）
COPY apps/backend/package.json ./apps/backend/
COPY packages/ ./packages/

# 安装依赖
RUN npm install -g pnpm@9 && pnpm install --frozen-lockfile

# 复制源码
COPY apps/backend/ ./apps/backend/
COPY packages/ ./packages/

# 生成 Prisma Client
RUN cd apps/backend && npx prisma generate

# 构建后端
RUN cd apps/backend && pnpm build

# 阶段 2：运行时
FROM node:20-alpine AS runner

WORKDIR /app

# 安装运行时依赖
RUN apk add --no-cache openssl chromium

ENV NODE_ENV=production
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

# 复制构建产物
COPY --from=builder /app/apps/backend/dist ./dist
COPY --from=builder /app/apps/backend/node_modules ./node_modules
COPY --from=builder /app/apps/backend/prisma ./prisma
COPY --from=builder /app/apps/backend/package.json ./

# 创建非 root 用户
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001
RUN chown -R nodejs:nodejs /app
USER nodejs

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"

CMD ["node", "dist/main.js"]
