import { Body, Controller, Delete, ForbiddenException, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { StaffService } from './staff.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';

@ApiTags('staff')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermission('staff')
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

  @Put(':id/permissions')
  @ApiOperation({ summary: '设置员工功能权限（总部或本店店长）' })
  async updatePermissions(@CurrentUser() user: any, @Param('id') id: string, @Body() body: any) {
    if (user?.role !== 'SUPER_ADMIN' && user?.role !== 'STORE_ADMIN') {
      throw new ForbiddenException('仅总部或店长可设置员工权限');
    }
    return this.service.updatePermissions(id, body?.permissions || []);
  }

  @Delete(':id')
  @ApiOperation({ summary: '停用员工' })
  async remove(@Param('id') id: string) { return this.service.remove(id); }
}
