import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import compression from 'compression';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';

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

  // CORS - 允许桌面端和 Web 访问
  app.enableCors({
    origin: true,
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
      forbidNonWhitelisted: false,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // 全局过滤器 / 拦截器
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new TransformInterceptor(), new LoggingInterceptor());

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
