import { Injectable, Logger, ServiceUnavailableException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

/**
 * 支付宝服务 - MOCK 实现，开业版禁止用于真实收款
 * 接入真实支付宝需要：alipay-sdk 4.x + appId + 应用私钥 + 支付宝公钥 + 异步通知验签
 */
@Injectable()
export class AlipayService {
  private readonly logger = new Logger(AlipayService.name);
  constructor(private readonly config: ConfigService) {}

  async createPCPay(p: any) {
    if (this.isProduction()) {
      throw new ServiceUnavailableException('支付宝未配置，请联系总部运营');
    }
    return { success: true, mock: true, qrCode: "MOCK_ALIPAY_" + p.outTradeNo, outTradeNo: p.outTradeNo };
  }

  async createH5Pay(p: any) {
    if (this.isProduction()) {
      throw new ServiceUnavailableException('支付宝未配置，请联系总部运营');
    }
    return { success: true, mock: true, h5Url: "alipays://", outTradeNo: p.outTradeNo };
  }

  async refund(p: any) {
    if (this.isProduction()) {
      throw new ServiceUnavailableException('支付宝未配置，请联系总部运营');
    }
    return { success: true, mock: true };
  }

  async handleNotify(params: any) {
    if (this.isProduction()) {
      throw new ServiceUnavailableException('支付宝未配置');
    }
    return 'success';
  }

  private isProduction(): boolean {
    return this.config?.get('NODE_ENV') === 'production'
      && !this.config?.get('ALIPAY_ALLOW_MOCK');
  }
}
