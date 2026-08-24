import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { AlipayService } from "./alipay.service";
import { WechatPayService } from "./wechat-pay.service";
@Injectable()
export class PaymentService {
  constructor(@Inject("PRISMA_CLIENT") private prisma: any, private alipay: AlipayService, private wechat: WechatPayService) {}
  async createPayment(p: any) {
    const o = await this.prisma.order.findUnique({ where: { id: p.orderId } });
    if (!o) throw new NotFoundException("订单不存在");
    const amount = (o.totalAmount - (o.discountAmount || 0)).toFixed(2);
    let result: any;
    switch (p.method) {
      case "ALIPAY_PC": result = await this.alipay.createPCPay({ outTradeNo: o.orderNo, totalAmount: amount, subject: "订单" + o.orderNo }); break;
      case "ALIPAY_H5": result = await this.alipay.createH5Pay({ outTradeNo: o.orderNo, totalAmount: amount, subject: "订单" + o.orderNo }); break;
      case "WECHAT_NATIVE": result = await this.wechat.createNativePay({ outTradeNo: o.orderNo, totalFee: parseFloat(amount), body: "订单" + o.orderNo }); break;
      case "WECHAT_H5": result = await this.wechat.createH5Pay({ outTradeNo: o.orderNo, totalFee: parseFloat(amount), body: "订单" + o.orderNo }); break;
      case "WECHAT_JSAPI": result = await this.wechat.createJSAPIPay({ outTradeNo: o.orderNo, totalFee: parseFloat(amount), body: "订单" + o.orderNo, openid: p.openid }); break;
    }
    return { orderId: p.orderId, outTradeNo: o.orderNo, amount, method: p.method, ...result };
  }
  async handleWechatNotify(xml: any) { return { code: "SUCCESS" }; }
  async handleAlipayNotify(p: any) { return "success"; }
  async refund(p: any) {
    const o = await this.prisma.order.findUnique({ where: { id: p.orderId } });
    if (!o) throw new NotFoundException("订单不存在");
    let r: any = await this.alipay.refund({ outTradeNo: o.orderNo, refundAmount: (o.totalAmount - (o.discountAmount||0)).toFixed(2) });
    await this.prisma.order.update({ where: { id: p.orderId }, data: { status: 2, refundedAt: new Date() } });
    return r;
  }
}
