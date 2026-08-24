import { Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PackageService } from './package.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('package')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('packages')
export class PackageController {
  constructor(private readonly service: PackageService) {}

  @Get()
  @ApiOperation({ summary: '套餐列表' })
  async list(@Query('page') page = 1, @Query('pageSize') pageSize = 20, @Query('storeId') storeId, @Query('type') type, @Query('status') status, @Query('keyword') keyword) {
    return this.service.list({ page: +page, pageSize: +pageSize, storeId, type, status, keyword });
  }

  @Get(':id')
  @ApiOperation({ summary: '套餐详情' })
  async findOne(@Param('id') id: string) { return this.service.findOne(id); }

  @Post()
  @ApiOperation({ summary: '新增套餐' })
  async create(@Body() body: any) { return this.service.create(body); }

  @Put(':id')
  @ApiOperation({ summary: '更新套餐' })
  async update(@Param('id') id: string, @Body() body: any) { return this.service.update(id, body); }

  @Delete(':id')
  @ApiOperation({ summary: '下架套餐' })
  async remove(@Param('id') id: string) { return this.service.remove(id); }
}
