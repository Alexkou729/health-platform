import { Module } from '@nestjs/common';
import { DeviceController } from './device.controller';
import { DeviceCallbackController } from './device-callback.controller';
import { DeviceService } from './device.service';

@Module({ controllers: [DeviceController, DeviceCallbackController], providers: [DeviceService], exports: [DeviceService] })
export class DeviceModule {}
