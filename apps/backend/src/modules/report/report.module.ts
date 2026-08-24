import { Module } from '@nestjs/common';
import { ReportController } from './report.controller';
import { ReportPublicController } from './report.public.controller';
import { ReportService } from './report.service';
import { ReportEngine } from './report.engine';
import { ReportRenderer } from './report.renderer';

@Module({
  controllers: [ReportController, ReportPublicController],
  providers: [ReportService, ReportEngine, ReportRenderer],
  exports: [ReportService, ReportEngine],
})
export class ReportModule {}
