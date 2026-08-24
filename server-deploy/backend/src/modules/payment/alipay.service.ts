import { Injectable } from "@nestjs/common";
@Injectable()
export class AlipayService {
  async createPCPay(p: any) { return { success: true, mock: true, qrCode: "mock", outTradeNo: p.outTradeNo }; }
  async createH5Pay(p: any) { return { success: true, mock: true, h5Url: "alipays://", outTradeNo: p.outTradeNo }; }
  async refund(p: any) { return { success: true, mock: true }; }
}
