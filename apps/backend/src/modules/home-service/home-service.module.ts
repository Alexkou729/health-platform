import { Module } from '@nestjs/common';
import { HomeServiceController } from './home-service.controller';
import { HomeServiceService } from './home-service.service';

@Module({ controllers: [HomeServiceController], providers: [HomeServiceService], exports: [HomeServiceService] })
export class HomeServiceModule {}
