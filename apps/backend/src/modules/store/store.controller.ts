import { Body, Controller, Delete, Get, Param, Post, Put, UseGuards, ForbiddenException } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { StoreService } from './store.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';

@ApiTags('store')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermission('stores')
@Controller('stores')
export class StoreController {
  constructor(private readonly service: StoreService) {}

  @Get()
  @ApiOperation({ summary: '门店列表' })
  async list(@CurrentUser() user: any) { return this.service.list(user); }

  @Get(':id')
  @ApiOperation({ summary: '门店详情' })
  async findOne(@CurrentUser() user: any, @Param('id') id: string) { return this.service.findOne(id, user); }

  @Post()
  @ApiOperation({ summary: '新增门店' })
  async create(@CurrentUser() user: any, @Body() body) {
    if (user?.role !== 'SUPER_ADMIN') throw new ForbiddenException('仅总部可新增门店');
    return this.service.create(body);
  }

  @Put(':id')
  @ApiOperation({ summary: '更新门店' })
  async update(@CurrentUser() user: any, @Param('id') id: string, @Body() body) {
    if (user?.role !== 'SUPER_ADMIN') throw new ForbiddenException('仅总部可修改门店');
    return this.service.update(id, body);
  }

  @Delete(':id')
  @ApiOperation({ summary: '停用门店' })
  async remove(@CurrentUser() user: any, @Param('id') id: string) {
    if (user?.role !== 'SUPER_ADMIN') throw new ForbiddenException('仅总部可停用门店');
    return this.service.remove(id);
  }
}
