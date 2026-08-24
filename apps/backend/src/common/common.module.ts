import { Global, Module } from '@nestjs/common';
import { PermissionsGuard } from './guards/permissions.guard';
import { DeviceAuthGuard } from './guards/device-auth.guard';

/** 全局通用模块：提供跨模块复用的守卫等 */
@Global()
@Module({
  providers: [PermissionsGuard, DeviceAuthGuard],
  exports: [PermissionsGuard, DeviceAuthGuard],
})
export class CommonModule {}
