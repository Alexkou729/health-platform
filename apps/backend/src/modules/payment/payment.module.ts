import { Module } from "@nestjs/common";
import { PaymentController } from "./payment.controller";
import { AlipayService } from "./alipay.service";
import { WechatPayService } from "./wechat-pay.service";
import { PaymentService } from "./payment.service";
@Module({ controllers: [PaymentController], providers: [AlipayService, WechatPayService, PaymentService], exports: [AlipayService, WechatPayService, PaymentService] })
export class PaymentModule {}
