import { Module, Global } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { PaymentController } from "./payment.controller";
import { AlipayService } from "./alipay.service";
import { WechatPayService } from "./wechat-pay.service";
import { PaymentService } from "./payment.service";

@Global()
@Module({
  imports: [ConfigModule],
  controllers: [PaymentController],
  providers: [AlipayService, WechatPayService, PaymentService],
  exports: [AlipayService, WechatPayService, PaymentService],
})
export class PaymentModule {}
