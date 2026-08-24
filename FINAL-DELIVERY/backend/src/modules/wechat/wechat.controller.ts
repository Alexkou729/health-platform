import { Body, Controller, Get, Post, Query, Res } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { WechatService } from './wechat.service';

@ApiTags('wechat')
@Controller('wx')
export class WechatController {
  constructor(private readonly service: WechatService) {}

  @Get('callback')
  @ApiOperation({ summary: '微信公众号回调验证' })
  async verify(@Query('signature') signature, @Query('timestamp') timestamp, @Query('nonce') nonce, @Query('echostr') echostr, @Res() res) {
    if (this.service.verifySignature(timestamp, nonce, signature)) {
      res.send(echostr);
    } else {
      res.status(401).send('invalid signature');
    }
  }

  @Post('callback')
  @ApiOperation({ summary: '微信公众号事件回调' })
  async event(@Body() body) { return this.service.handleEvent(body); }

  @Get('oauth')
  @ApiOperation({ summary: 'OAuth 换取 openid' })
  async oauth(@Query('code') code) { return this.service.oauth(code); }
}
