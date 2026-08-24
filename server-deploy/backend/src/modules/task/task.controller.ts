import { Body, Controller, Get, Param, Post, Put, Query, UseGuards, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { TaskService } from './task.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('task')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('tasks')
export class TaskController {
  constructor(private readonly service: TaskService) {}

  @Get() list(@Query() q: any) { return this.service.list(q); }
  @Get('my-todos') myTodos(@Req() req: any, @Query('status') status: string) { return this.service.myTodos(req.user.sub, status); }
  @Get('my-stats') myStats(@Req() req: any) { return this.service.getMyStats(req.user.sub); }
  @Get(':id') findOne(@Param('id') id: string) { return this.service.findOne(id); }
  @Post() create(@Body() body: any) { return this.service.create(body); }
  @Put(':id') update(@Param('id') id: string, @Body() body: any) { return this.service.update(id, body); }
  @Post(':id/start') start(@Param('id') id: string) { return this.service.start(id); }
  @Post(':id/complete') complete(@Param('id') id: string, @Body() body: any) { return this.service.complete(id, body?.result); }
  @Post(':id/cancel') cancel(@Param('id') id: string) { return this.service.cancel(id); }
}
