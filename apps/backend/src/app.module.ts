import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ThrottlerModule } from '@nestjs/throttler';
import { CommonModule } from './common/common.module';
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
import { AIModule } from './modules/ai/ai.module';
import { FranchiseModule } from './modules/franchise/franchise.module';
import { CouponModule } from './modules/coupon/coupon.module';
import { ProductModule } from './modules/product/product.module';
import { MallOrderModule } from './modules/mall-order/mall-order.module';
import { HomeServiceModule } from './modules/home-service/home-service.module';
import { SettlementModule } from './modules/settlement/settlement.module';
import { ClientModule } from './modules/client/client.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ['.env.local', '.env'] }),
    ScheduleModule.forRoot(),
    EventEmitterModule.forRoot({ wildcard: true }),
    CommonModule,
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => [{ ttl: 60_000, limit: config.get('NODE_ENV') === 'production' ? 100 : 1000 }],
    }),
    PrismaModule, RedisModule, MinioModule,
    AuthModule, CustomerModule, DetectionModule, ReportModule, DeviceModule,
    PackageModule, OrderModule, StaffModule, StoreModule, WechatModule,
    DashboardModule, HealthModule, AIModule, RecipeModule, AppointmentModule, TaskModule,
    ScriptModule, PerformanceModule, PaymentModule,
    FranchiseModule, CouponModule, ProductModule, MallOrderModule, HomeServiceModule, SettlementModule, ClientModule,
  ],
})
export class AppModule {}
