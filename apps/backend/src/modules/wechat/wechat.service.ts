import { Inject, Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import * as crypto from 'crypto';

@Injectable()
export class WechatService {
  private readonly logger = new Logger(WechatService.name);
  private accessToken;
  private tokenExpiresAt = 0;

  constructor(@Inject('PRISMA_CLIENT') private readonly prisma) {}

  async getAccessToken() {
    if (this.accessToken && Date.now() < this.tokenExpiresAt - 300000) return this.accessToken;
    const appId = process.env.WECHAT_APP_ID;
    const appSecret = process.env.WECHAT_APP_SECRET;
    if (!appId || !appSecret || appId.startsWith('wx0000')) {
      this.logger.warn('微信 AppID 未配置，使用模拟 Token');
      this.accessToken = 'mock-token-' + Date.now();
      this.tokenExpiresAt = Date.now() + 7200000;
      return this.accessToken;
    }
    try {
      const res = await axios.get('https://api.weixin.qq.com/cgi-bin/token', {
        params: { grant_type: 'client_credential', appid: appId, secret: appSecret },
      });
      if (res.data.access_token) {
        this.accessToken = res.data.access_token;
        this.tokenExpiresAt = Date.now() + res.data.expires_in * 1000;
        return this.accessToken;
      }
      throw new Error(JSON.stringify(res.data));
    } catch (e) {
      this.logger.error('获取 AccessToken 失败: ' + e.message);
      throw e;
    }
  }

  async oauth(code) {
    const appId = process.env.WECHAT_APP_ID;
    const appSecret = process.env.WECHAT_APP_SECRET;
    if (!appId || !appSecret || appId.startsWith('wx0000')) {
      return { openid: 'mock-' + code, unionid: 'mock-u-' + code, nickname: '微信用户', access_token: 'mock', refresh_token: 'mock', expires_in: 7200 };
    }
    const res = await axios.get('https://api.weixin.qq.com/sns/oauth2/access_token', {
      params: { appid: appId, secret: appSecret, code, grant_type: 'authorization_code' },
    });
    return res.data;
  }

  async sendTemplateMessage(openid, templateId, data, url) {
    const token = await this.getAccessToken();
    try {
      const res = await axios.post(`https://api.weixin.qq.com/cgi-bin/message/template/send?access_token=${token}`, {
        touser: openid, template_id: templateId, data, url,
      });
      await this.prisma.wxMessage.create({
        data: { openid, templateId, content: JSON.stringify(data || {}), url, status: res.data.errcode === 0 ? 1 : 2, errorMsg: res.data.errmsg, msgId: res.data.msgid, sentAt: new Date() },
      });
      return res.data;
    } catch (e) {
      await this.prisma.wxMessage.create({ data: { openid, templateId, content: JSON.stringify(data || {}), status: 2, errorMsg: e.message } });
      throw e;
    }
  }

  async sendDetectionCompleted(customerId, score) {
    const customer = await this.prisma.customer.findUnique({ where: { id: customerId } });
    if (!customer || !customer.openid) return;
    const templateId = process.env.WECHAT_TEMPLATE_DETECTION || 'DETECTION_COMPLETED_TEMPLATE_ID';
    return this.sendTemplateMessage(customer.openid, templateId, {
      first: { value: customer.name + '，您的健康检测报告已生成！' },
      keyword1: { value: String(score) },
      keyword2: { value: new Date().toLocaleString('zh-CN') },
      remark: { value: '点击查看完整报告' },
    }, (process.env.WEB_BASE_URL || 'http://localhost:5173') + '/report/' + customerId);
  }

  async sendRemind(customerId, days) {
    const customer = await this.prisma.customer.findUnique({ where: { id: customerId } });
    if (!customer || !customer.openid) return;
    const templateId = process.env.WECHAT_TEMPLATE_REMIND || 'REMIND_TEMPLATE_ID';
    return this.sendTemplateMessage(customer.openid, templateId, {
      first: { value: customer.name + '，您已经 ' + days + ' 天没来复检啦' },
      keyword1: { value: '建议复检跟踪' },
      keyword2: { value: new Date().toLocaleDateString('zh-CN') },
      remark: { value: '点击预约复检' },
    }, '');
  }

  verifySignature(timestamp, nonce, signature) {
    const token = process.env.WECHAT_TOKEN || 'healthclinic';
    const tmp = [token, timestamp, nonce].sort().join('');
    const sha1 = crypto.createHash('sha1').update(tmp).digest('hex');
    return sha1 === signature;
  }

  async handleEvent(xml) {
    const msgType = xml.MsgType?.[0];
    const event = xml.Event?.[0];
    const fromUser = xml.FromUserName?.[0];
    if (msgType === 'event' && event === 'subscribe') {
      this.logger.log('新关注: ' + fromUser);
      await this.prisma.wxSubscribe.upsert({
        where: { openid: fromUser },
        update: { subscribedAt: new Date() },
        create: { openid: fromUser, scene: 'subscribe' },
      });
    }
    return { success: true };
  }
}
