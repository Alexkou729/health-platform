import { Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ProductService } from './product.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('product')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermission('marketing')
@Controller('products')
export class ProductController {
  constructor(private readonly service: ProductService) {}

  @Get()
  @ApiOperation({ summary: '商品列表' })
  list(@CurrentUser() user: any, @Query() q: any) { return this.service.list(user, q); }

  @Post()
  @ApiOperation({ summary: '创建商品（门店提交待审核/总台直接上架）' })
  create(@CurrentUser() user: any, @Body() body: any) { return this.service.create(user, body); }

  @Put(':id')
  @ApiOperation({ summary: '更新商品' })
  update(@CurrentUser() user: any, @Param('id') id: string, @Body() body: any) { return this.service.update(user, id, body); }

  @Post(':id/audit')
  @ApiOperation({ summary: '总台审核商品' })
  audit(@CurrentUser() user: any, @Param('id') id: string, @Body() body: { approve: boolean; remark?: string }) {
    return this.service.audit(user, id, body.approve, body.remark);
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除商品' })
  remove(@CurrentUser() user: any, @Param('id') id: string) { return this.service.remove(user, id); }
}
