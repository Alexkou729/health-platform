import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { PerformanceService } from "./performance.service";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";

@ApiTags("performance")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("performance")
export class PerformanceController {
  constructor(private readonly service: PerformanceService) {}

  @Get("dashboard") dashboard(@Query("storeId") storeId: string) { return this.service.getDashboard(storeId); }
  @Get("staff") staff(@Query("storeId") storeId: string, @Query("period") period: string) {
    return this.service.getStaffPerformance(storeId, period || new Date().toISOString().substring(0, 7));
  }
  @Get("revenue") revenue(@Query("storeId") storeId: string, @Query("startDate") s: string, @Query("endDate") e: string) {
    return this.service.getStoreRevenue(storeId, s, e);
  }
  @Get("projects") projects(@Query("storeId") storeId: string, @Query("startDate") s: string, @Query("endDate") e: string) {
    return this.service.getProjectUsage(storeId, s, e);
  }
  @Get("customers") customers(@Query("storeId") storeId: string) {
    return this.service.getCustomerStats(storeId);
  }
}
