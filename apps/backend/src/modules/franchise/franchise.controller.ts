import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { FranchiseService } from './franchise.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('franchise')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class FranchiseController {
  constructor(private readonly service: FranchiseService) {}

  // 服务工单
  @Get('service-requests')
  listRequests(@CurrentUser() user: any, @Query() q: any) { return this.service.listRequests(user, q); }

  @Get('service-requests/:id')
  findRequest(@CurrentUser() user: any, @Param('id') id: string) { return this.service.findRequest(user, id); }

  @Post('service-requests')
  createRequest(@CurrentUser() user: any, @Body() body: any) { return this.service.createRequest(user, body); }

  @Post('service-requests/:id/accept')
  accept(@CurrentUser() user: any, @Param('id') id: string) { return this.service.acceptRequest(user, id); }

  @Post('service-requests/:id/reject')
  reject(@CurrentUser() user: any, @Param('id') id: string, @Body() body: any) { return this.service.rejectRequest(user, id, body?.reason); }

  @Post('service-requests/:id/complete')
  complete(@CurrentUser() user: any, @Param('id') id: string, @Body() body: any) { return this.service.completeRequest(user, id, body?.result); }

  // 订阅 / 计费
  @Get('subscriptions')
  subscriptions(@CurrentUser() user: any) { return this.service.listSubscriptions(user); }

  @Post('subscriptions')
  createSubscription(@CurrentUser() user: any, @Body() body: any) { return this.service.createSubscription(user, body); }

  // AI 接口配置（总台专属）
  @Get('ai-config')
  getAiConfig(@CurrentUser() user: any) { return this.service.getAiConfig(user); }

  @Post('ai-config')
  setAiConfig(@CurrentUser() user: any, @Body() body: any) { return this.service.setAiConfig(user, body); }

  @Get('ai-usage')
  usage(@CurrentUser() user: any) { return this.service.listUsage(user); }

  @Get('invoices')
  invoices(@CurrentUser() user: any) { return this.service.listInvoices(user); }

  @Post('invoices/:id/pay')
  payInvoice(@CurrentUser() user: any, @Param('id') id: string, @Body() body: any) { return this.service.payInvoice(user, id, body?.method); }

  // 加盟看板
  @Get('franchise/dashboard')
  dashboard(@CurrentUser() user: any) { return this.service.dashboard(user); }

  // 加盟申请审批
  @Get('franchise/applications')
  applications(@CurrentUser() user: any) { return this.service.listApplications(user); }

  @Post('franchise/applications/:id/approve')
  approveApplication(@CurrentUser() user: any, @Param('id') id: string, @Body() body: any) { return this.service.approveApplication(user, id, body); }

  @Post('franchise/applications/:id/reject')
  rejectApplication(@CurrentUser() user: any, @Param('id') id: string, @Body() body: any) { return this.service.rejectApplication(user, id, body?.reason); }
}
