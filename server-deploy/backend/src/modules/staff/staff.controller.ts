import { Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { StaffService } from './staff.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('staff')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('staff')
export class StaffController {
  constructor(private readonly service: StaffService) {}

  @Get()
  @ApiOperation({ summary: '员工列表' })
  async list(@Query('page') page = 1, @Query('pageSize') pageSize = 20, @Query('storeId') storeId, @Query('role') role, @Query('status') status, @Query('keyword') keyword) {
    return this.service.list({ page: +page, pageSize: +pageSize, storeId, role, status, keyword });
  }

  @Get(':id')
  @ApiOperation({ summary: '员工详情' })
  async findOne(@Param('id') id: string) { return this.service.findOne(id); }

  @Post()
  @ApiOperation({ summary: '新增员工' })
  async create(@Body() body) { return this.service.create(body); }

  @Put(':id')
  @ApiOperation({ summary: '更新员工' })
  async update(@Param('id') id: string, @Body() body) { return this.service.update(id, body); }

  @Post(':id/reset-password')
  @ApiOperation({ summary: '重置密码' })
  async resetPassword(@Param('id') id: string, @Body() body) { return this.service.resetPassword(id, body?.newPassword); }

  @Delete(':id')
  @ApiOperation({ summary: '停用员工' })
  async remove(@Param('id') id: string) { return this.service.remove(id); }
}
