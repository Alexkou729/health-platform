import { Module, OnModuleInit } from "@nestjs/common";
import { OriginalSystemController } from "./original-system.controller";
import { OriginalSystemService } from "./original-system.service";

@Module({
  controllers: [OriginalSystemController],
  providers: [OriginalSystemService],
  exports: [OriginalSystemService],
})
export class OriginalSystemModule implements OnModuleInit {
  constructor(private readonly svc: OriginalSystemService) {}
  onModuleInit() { this.svc.startPolling(); }
}
