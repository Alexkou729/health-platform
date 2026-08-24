import { Body, Controller, Delete, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { StoreService } from './store.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('store')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('stores')
export class StoreController {
  constructor(private readonly service: StoreService) {}

  @Get()
  @ApiOperation({ summary: '门店列表' })
  async list() { return this.service.list(); }

  @Get(':id')
  @ApiOperation({ summary: '门店详情' })
  async findOne(@Param('id') id: string) { return this.service.findOne(id); }

  @Post()
  @ApiOperation({ summary: '新增门店' })
  async create(@Body() body) { return this.service.create(body); }

  @Put(':id')
  @ApiOperation({ summary: '更新门店' })
  async update(@Param('id') id: string, @Body() body) { return this.service.update(id, body); }

  @Delete(':id')
  @ApiOperation({ summary: '停用门店' })
  async remove(@Param('id') id: string) { return this.service.remove(id); }
}
