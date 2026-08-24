import { Body, Controller, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AppointmentService } from './appointment.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';

@ApiTags('appointment')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermission('appointments')
@Controller('appointments')
export class AppointmentController {
  constructor(private readonly service: AppointmentService) {}

  @Get() list(@CurrentUser() user: any, @Query() q: any) { return this.service.list(q, user); }
  @Get('today') today(@Query('storeId') storeId?: string) { return this.service.today(storeId); }
  @Get('calendar') calendar(@Query('storeId') storeId: string, @Query('year') year: number, @Query('month') month: number) { return this.service.getCalendar(storeId, +year, +month); }
  @Get(':id') findOne(@CurrentUser() user: any, @Param('id') id: string) { return this.service.findOne(id, user); }
  @Post() create(@CurrentUser() user: any, @Body() body: any) { return this.service.create(body, user); }
  @Put(':id') update(@Param('id') id: string, @Body() body: any) { return this.service.update(id, body); }
  @Post(':id/confirm') confirm(@Param('id') id: string) { return this.service.confirm(id); }
  @Post(':id/start') start(@Param('id') id: string) { return this.service.start(id); }
  @Post(':id/complete') complete(@Param('id') id: string, @Body() body: any) { return this.service.complete(id, body?.staffNotes); }
  @Post(':id/cancel') cancel(@Param('id') id: string, @Body() body: any) { return this.service.cancel(id, body?.reason); }
  @Post(':id/assign') assign(@Param('id') id: string, @Body() body: any) { return this.service.assignStaff(id, body?.staffId); }
}
