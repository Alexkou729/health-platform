import { Injectable } from "@nestjs/common";
@Injectable()
export class WechatPayService {
  async createNativePay(p: any) { return { success: true, mock: true, qrCode: "weixin://wxpay/bizpayurl?pr=mock", outTradeNo: p.outTradeNo }; }
  async createH5Pay(p: any) { return { success: true, mock: true, outTradeNo: p.outTradeNo }; }
  async createJSAPIPay(p: any) { return { success: true, mock: true, outTradeNo: p.outTradeNo }; }
  async refund(p: any) { return { success: true, mock: true }; }
}
