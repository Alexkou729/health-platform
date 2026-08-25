import { Controller, Get, Post, Delete, Param, Query, Body, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { BodyCompositionService } from './body-composition.service';
import { CreateBodyCompositionDto, QueryBodyCompositionDto } from './dto/body-composition.dto';

@ApiTags('body-composition')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermission('customers')
@Controller('body-compositions')
export class BodyCompositionController {
  constructor(private readonly service: BodyCompositionService) {}

  @Post()
  @ApiOperation({ summary: '上传/接收体脂秤 BIA 真测数据' })
  async create(@Body() dto: CreateBodyCompositionDto, @CurrentUser() user: any) {
    const customer = await this.service['prisma'].customer.findFirst({
      where: user?.role === 'SUPER_ADMIN' ? { id: dto.customerId } : { id: dto.customerId, storeId: user?.storeId },
    });
    if (!customer) throw new Error('客户不存在或越权');
    return this.service.create(dto);
  }

  @Get()
  @ApiOperation({ summary: '体成分记录列表' })
  async list(@Query() q: QueryBodyCompositionDto, @CurrentUser() user: any) {
    if (user?.role !== 'SUPER_ADMIN' && q.customerId) {
      // 限定门店
      const customer = await this.service['prisma'].customer.findFirst({
        where: { id: q.customerId, storeId: user.storeId },
      });
      if (!customer) throw new Error('客户不存在或越权');
    }
    return this.service.list(q as any);
  }

  @Get('latest/:customerId')
  @ApiOperation({ summary: '获取客户最近一次体成分记录' })
  async latest(@Param('customerId') customerId: string) {
    return this.service.getLatest(customerId);
  }

  @Get('trends/:customerId')
  @ApiOperation({ summary: '客户体成分趋势（默认近 30 天）' })
  async trends(@Param('customerId') customerId: string, @Query('days') days?: number) {
    return this.service.getTrends(customerId, Number(days) || 30);
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除一条体成分记录' })
  async remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
