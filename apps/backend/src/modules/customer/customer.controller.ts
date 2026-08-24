import { BadRequestException, Body, Controller, Delete, Get, Param, Post, Put, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CustomerService } from './customer.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { CreateCustomerDto, UpdateCustomerDto } from './dto/customer.dto';

@ApiTags('customer')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermission('customers')
@Controller('customers')
export class CustomerController {
  constructor(private readonly service: CustomerService) {}

  @Get()
  @ApiOperation({ summary: '客户列表' })
  async list(
    @Query('page') page = 1, @Query('pageSize') pageSize = 20,
    @Query('keyword') keyword?: string, @Query('storeId') storeId?: string,
    @Query('consultantId') consultantId?: string, @Query('level') level?: string,
    @Query('tag') tag?: string, @Query('source') source?: string,
  ) {
    return this.service.list({ page: +page, pageSize: +pageSize, keyword, storeId, consultantId, level, tag, source });
  }

  @Get('statistics')
  @ApiOperation({ summary: '客户统计' })
  async statistics(@Query('storeId') storeId?: string) {
    return this.service.getStatistics(storeId);
  }

  @Get(':id')
  @ApiOperation({ summary: '客户详情' })
  async findOne(@CurrentUser() user: any, @Param('id') id: string) {
    return this.service.findOne(id, user);
  }

  @Post()
  @ApiOperation({ summary: '创建客户' })
  async create(@Req() req: any, @Body() body: CreateCustomerDto) {
    // 总部可指定门店；门店账号强制使用自己门店
    const storeId = (req.user?.role === 'SUPER_ADMIN' && body.storeId) ? body.storeId : req.user?.storeId;
    if (!storeId) throw new BadRequestException('storeId 缺失，请重新登录');
    return this.service.create({ ...body, storeId });
  }

  @Put(':id')
  @ApiOperation({ summary: '更新客户' })
  async update(@CurrentUser() user: any, @Param('id') id: string, @Body() body: UpdateCustomerDto) {
    return this.service.update(id, body, user);
  }

  @Delete(':id')
  @ApiOperation({ summary: '停用客户' })
  async remove(@CurrentUser() user: any, @Param('id') id: string) {
    return this.service.remove(id, user);
  }

  @Get(':id/detections')
  @ApiOperation({ summary: '客户检测历史' })
  async history(@CurrentUser() user: any, @Param('id') id: string) {
    return this.service.getDetectionHistory(id, user);
  }
}
