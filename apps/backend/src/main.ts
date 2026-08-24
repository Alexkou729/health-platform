import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import * as express from 'express';
import { existsSync } from 'fs';
import { join } from 'path';
import helmet from 'helmet';
import compression from 'compression';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { StoreScopeInterceptor } from './common/interceptors/store-scope.interceptor';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug'],
  });

  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT') || 3000;
  const nodeEnv = configService.get<string>('NODE_ENV') || 'development';

  // 安全中间件
  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(compression());

  // 移动端 H5 静态托管（根路径，uni-app 使用 hash 路由）
  const h5Dir = configService.get<string>('H5_DIST') || join(process.cwd(), 'h5', 'dist');
  if (existsSync(h5Dir)) {
    app.use(express.static(h5Dir));
    Logger.log(`🌐 H5 静态托管: ${h5Dir}`, 'Bootstrap');
  }

  // API 版本化兼容：/api/v1/* 重写到 /api/*（旧客户端继续用 /api，新客户端可切 /api/v1）
  app.use((req: any, _res: any, next: any) => {
    if (req.url && req.url.startsWith('/api/v1/')) {
      req.url = req.url.replace('/api/v1/', '/api/');
    }
    next();
  });

  // CORS - 显式白名单（生产），开发环境默认放行
  const corsOrigins = (configService.get<string>('CORS_ORIGINS') || '').split(',').filter(Boolean);
  app.enableCors({
    origin: (origin, cb) => {
      if (!origin || corsOrigins.length === 0 || corsOrigins.includes(origin) || nodeEnv !== 'production') {
        return cb(null, true);
      }
      return cb(new Error('Not allowed by CORS'), false);
    },
    credentials: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
  });

  // 全局前缀
  app.setGlobalPrefix('api', {
    exclude: ['/', '/health', '/ready'],
  });

  // 全局验证管道
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // 全局过滤器 / 拦截器
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new StoreScopeInterceptor(), new TransformInterceptor(), new LoggingInterceptor());

  // Swagger API 文档
  if (nodeEnv !== 'production' || configService.get<string>('ENABLE_SWAGGER') === 'true') {
    const config = new DocumentBuilder()
      .setTitle('健康管理系统 API')
      .setDescription('Quantum Analyzer 网络版 API 文档')
      .setVersion('1.0')
      .addBearerAuth()
      .addTag('auth', '认证')
      .addTag('customer', '客户')
      .addTag('detection', '检测')
      .addTag('report', '报告')
      .addTag('device', '设备')
      .addTag('package', '套餐')
      .addTag('order', '订单')
      .addTag('wechat', '微信')
      .addTag('dashboard', '数据看板')
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document, {
      swaggerOptions: { persistAuthorization: true },
    });
  }

  // 健康检查
  app.getHttpAdapter().get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  await app.listen(port, '0.0.0.0');
  logger.log(`🚀 Health Platform API 启动成功`);
  logger.log(`📍 监听端口: ${port}`);
  logger.log(`🌐 文档地址: http://localhost:${port}/api/docs`);
  logger.log(`💚 健康检查: http://localhost:${port}/health`);
  logger.log(`🌍 环境: ${nodeEnv}`);
}

bootstrap().catch((err) => {
  console.error('启动失败:', err);
  process.exit(1);
});
