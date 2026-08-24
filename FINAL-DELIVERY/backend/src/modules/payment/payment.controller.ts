import { Body, Controller, Get, Post, Query, Res, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { Response } from "express";
import { PaymentService } from "./payment.service";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
@ApiTags("payment")
@Controller("payment")
export class PaymentController {
  constructor(private service: PaymentService) {}
  @Post("create") @UseGuards(JwtAuthGuard) @ApiBearerAuth() async create(@Body() body: any) { return this.service.createPayment(body); }
  @Post("refund") @UseGuards(JwtAuthGuard) @ApiBearerAuth() async refund(@Body() body: any) { return this.service.refund(body); }
  @Post("notify/wechat") async wechatNotify(@Body() body: any) { return this.service.handleWechatNotify(body); }
  @Post("notify/alipay") async alipayNotify(@Body() body: any) { return this.service.handleAlipayNotify(body); }
  @Get("notify/alipay-return") async alipayReturn(@Query() q: any, @Res() res: Response) { res.redirect("/orders?paid=1"); }
}
