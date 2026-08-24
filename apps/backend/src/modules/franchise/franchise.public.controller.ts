import { Body, Controller, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { FranchiseService } from './franchise.service';

/**
 * 加盟申请公开入口（商家无需登录即可提交）
 */
@ApiTags('franchise-apply')
@Controller('franchise')
export class FranchisePublicController {
  constructor(private readonly service: FranchiseService) {}

  @Post('apply')
  @ApiOperation({ summary: '提交加盟申请' })
  async apply(@Body() body: any) {
    return this.service.applyFranchise(body);
  }
}
