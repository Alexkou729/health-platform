import { Controller, Get, UseGuards, Inject } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { PermissionsGuard } from "../../common/guards/permissions.guard";
import { CurrentUser } from "../../common/decorators/current-user.decorator";

@ApiTags("dashboard")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller("dashboard")
export class DashboardController {
  constructor(@Inject("PRISMA_CLIENT") private readonly prisma: any) {}

  @Get("workbench")
  @ApiOperation({ summary: "店面工作台数据看板" })
  async workbench(@CurrentUser() user: any) {
    const storeId = user?.role === "SUPER_ADMIN" ? undefined : user?.storeId;
    const today = new Date(); today.setHours(0,0,0,0);
    const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate()+1);
    const in7days = new Date(today); in7days.setDate(in7days.getDate()+7);
    const customerWhere: any = { status: "ACTIVE" };
    if (storeId) customerWhere.storeId = storeId;
    const detectionWhere: any = {};
    if (storeId) detectionWhere.customer = { is: { storeId } };
    const [totalCustomers, todayTests, dueRechecks, upcomingRechecks, abnormalReports, recentTests, recheckList] = await Promise.all([
      this.prisma.customer.count({ where: customerWhere }),
      this.prisma.detection.count({ where: { ...detectionWhere, createdAt: { gte: today, lt: tomorrow } } }),
      this.prisma.detection.count({ where: { ...detectionWhere, nextCheckDate: { gte: today, lt: tomorrow } } }),
      this.prisma.detection.count({ where: { ...detectionWhere, nextCheckDate: { gte: tomorrow, lt: in7days } } }),
      this.prisma.report.count({ where: { ...(storeId ? { customer: { is: { storeId } } } : {}), status: 1, score: { lt: 70 }, createdAt: { gte: new Date(Date.now() - 7 * 86400000) } } }),
      this.prisma.detection.findMany({ where: { ...detectionWhere, createdAt: { gte: today, lt: tomorrow } }, orderBy: { createdAt: "desc" }, take: 10, include: { customer: { select: { id: true, name: true, phone: true } } } }),
      this.prisma.detection.findMany({ where: { ...detectionWhere, nextCheckDate: { gte: today, lt: in7days } }, orderBy: { nextCheckDate: "asc" }, take: 20, include: { customer: { select: { id: true, name: true, phone: true } } } }),
    ]);
    return {
      kpi: { totalCustomers, todayTests, dueRechecks, upcomingRechecks, abnormalReports },
      todayTests: recentTests.map((d: any) => ({ id: d.id, customerId: d.customerId, customerName: d.customer?.name, customerPhone: d.customer?.phone, startedAt: d.startedAt, finishedAt: d.finishedAt, overallScore: d.overallScore })),
      recheckList: recheckList.map((d: any) => ({ id: d.id, customerId: d.customerId, customerName: d.customer?.name, customerPhone: d.customer?.phone, lastDetection: d.createdAt, nextCheckDate: d.nextCheckDate, checkCycleDays: d.checkCycleDays, overallScore: d.overallScore })),
    };
  }
}
