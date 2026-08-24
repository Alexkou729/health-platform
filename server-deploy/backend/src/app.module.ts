import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ThrottlerModule } from '@nestjs/throttler';
import { PrismaModule } from './config/prisma.module';
import { RedisModule } from './config/redis.module';
import { MinioModule } from './config/minio.module';
import { AuthModule } from './modules/auth/auth.module';
import { CustomerModule } from './modules/customer/customer.module';
import { DetectionModule } from './modules/detection/detection.module';
import { ReportModule } from './modules/report/report.module';
import { DeviceModule } from './modules/device/device.module';
import { PackageModule } from './modules/package/package.module';
import { OrderModule } from './modules/order/order.module';
import { StaffModule } from './modules/staff/staff.module';
import { StoreModule } from './modules/store/store.module';
import { WechatModule } from './modules/wechat/wechat.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { HealthModule } from './modules/health/health.module';
import { RecipeModule } from './modules/recipe/recipe.module';
import { AppointmentModule } from './modules/appointment/appointment.module';
import { TaskModule } from './modules/task/task.module';
import { ScriptModule } from './modules/script/script.module';
import { PerformanceModule } from './modules/performance/performance.module';
import { PaymentModule } from './modules/payment/payment.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ['.env.local', '.env'] }),
    ScheduleModule.forRoot(),
    EventEmitterModule.forRoot({ wildcard: true }),
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => [{ ttl: 60_000, limit: config.get('NODE_ENV') === 'production' ? 100 : 1000 }],
    }),
    PrismaModule, RedisModule, MinioModule,
    AuthModule, CustomerModule, DetectionModule, ReportModule, DeviceModule,
    PackageModule, OrderModule, StaffModule, StoreModule, WechatModule,
    DashboardModule, HealthModule, RecipeModule, AppointmentModule, TaskModule,
    ScriptModule, PerformanceModule, PaymentModule,
  ],
})
export class AppModule {}
