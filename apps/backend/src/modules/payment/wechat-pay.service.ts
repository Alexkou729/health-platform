import { Injectable, Logger, ServiceUnavailableException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

/**
 * 微信支付服务
 *
 * 当前版本（v1.0 开业版）：MOCK 实现，禁止直接用于生产收款。
 * 接入真实微信支付 V3 需要：
 *   1) 申请微信支付商户号，获取 mch_id / api_v3_key / api_cert（apiclient_cert.pem / apiclient_key.pem）
 *   2) 引入 wechatpay-node-v3 或 axios + crypto 实现签名/验签
 *   3) 实现 createNativePay / createH5Pay / createJSAPIPay / handleNotify / refund / queryOrder
 *   4) 开通 JSAPI / H5 / Native 权限域
 *
 * 开业前临时方案：前端若走到「在线支付」会自动进入 mock 模式，
 * 实际订单由门店「现金/到账」线下收款，订单状态走 PAID 由人工确认。
 */
@Injectable()
export class WechatPayService {
  private readonly logger = new Logger(WechatPayService.name);

  constructor(private readonly config: ConfigService) {}

  /** Native 扫码支付（PC 端扫码） */
  async createNativePay(p: any) {
    if (this.isProduction()) {
      this.logger.warn('生产环境禁止使用 mock 微信支付，请接入 V3 SDK');
      throw new ServiceUnavailableException('微信支付未配置，请联系总部运营');
    }
    return {
      success: true,
      mock: true,
      qrCode: "weixin://wxpay/bizpayurl?pr=MOCK_" + p.outTradeNo,
      outTradeNo: p.outTradeNo,
      message: 'mock 模式：请门店使用现金/到账收款并人工标记 PAID',
    };
  }

  /** H5 支付（手机浏览器） */
  async createH5Pay(p: any) {
    if (this.isProduction()) {
      throw new ServiceUnavailableException('微信支付未配置，请联系总部运营');
    }
    return {
      success: true,
      mock: true,
      outTradeNo: p.outTradeNo,
      redirectUrl: "javascript:alert('mock 模式：请使用现金/到账')",
      message: 'mock 模式',
    };
  }

  /** JSAPI（公众号 / 小程序内） */
  async createJSAPIPay(p: any) {
    if (this.isProduction()) {
      throw new ServiceUnavailableException('微信支付未配置，请联系总部运营');
    }
    return {
      success: true,
      mock: true,
      outTradeNo: p.outTradeNo,
      message: 'mock 模式',
    };
  }

  /** 退款 */
  async refund(p: any) {
    if (this.isProduction()) {
      throw new ServiceUnavailableException('微信支付未配置，请联系总部运营');
    }
    return { success: true, mock: true, refundId: 'MOCK_REFUND_' + Date.now() };
  }

  /** 回调验签（生产对接时实现） */
  async handleNotify(headers: any, body: any) {
    if (this.isProduction()) {
      throw new ServiceUnavailableException('微信支付未配置');
    }
    return { code: 'SUCCESS' };
  }

  private isProduction(): boolean {
    return this.config?.get('NODE_ENV') === 'production'
      && !this.config?.get('WECHAT_PAY_ALLOW_MOCK');
  }
}
