import { Controller, Get, Post, Body, UseGuards, Inject } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { OriginalSystemService } from "./original-system.service";

@ApiTags("original-system")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("original-system")
export class OriginalSystemController {
  constructor(private readonly svc: OriginalSystemService) {}

  @Get("status")
  @ApiOperation({ summary: "原系统接入状态" })
  status() { return this.svc.getStatus(); }

  @Post("import")
  @ApiOperation({ summary: "接收桌面端解析好的报告数据" })
  async importParsed(@Body() body: any, @CurrentUser() u: any) {
    return this.svc.importParsed(body, u?.storeId);
  }

  @Post("scan")
  @ApiOperation({ summary: "一键扫描并导入原系统 ReportC/ 所有历史报告" })
  async scan(@CurrentUser() u: any) {
    const storeId = u?.storeId || (await this.svc["prisma"].store.findFirst())?.id;
    return this.svc.scanAndImportAll(storeId);
  }

  @Get("history")
  @ApiOperation({ summary: "导入历史" })
  history() { return this.svc.getHistory(); }

  @Post("start-polling")
  @ApiOperation({ summary: "启动自动轮询（新报告自动入档）" })
  startPolling() { this.svc.startPolling(); return { ok: true }; }
  @Post("stop-polling")
  stopPolling() { this.svc.stopPolling(); return { ok: true }; }
}
