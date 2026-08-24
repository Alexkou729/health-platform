import { Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CustomerService } from './customer.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('customer')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
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
  async findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: '创建客户' })
  async create(@Body() body: any) {
    return this.service.create(body);
  }

  @Put(':id')
  @ApiOperation({ summary: '更新客户' })
  async update(@Param('id') id: string, @Body() body: any) {
    return this.service.update(id, body);
  }

  @Delete(':id')
  @ApiOperation({ summary: '停用客户' })
  async remove(@Param('id') id: string) {
    return this.service.remove(id);
  }

  @Get(':id/detections')
  @ApiOperation({ summary: '客户检测历史' })
  async history(@Param('id') id: string) {
    return this.service.getDetectionHistory(id);
  }
}
