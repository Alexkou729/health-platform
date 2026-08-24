import { CanActivate, ExecutionContext, Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'crypto';

/**
 * 设备独立鉴权：设备不持有 JWT，改用「设备编号 + 时间戳 + HMAC 签名」。
 * 请求头：
 *   X-Device-No        设备序列号
 *   X-Device-Timestamp 毫秒时间戳（5 分钟内有效）
 *   X-Device-Sign      HMAC-SHA256(secret, `${deviceNo}.${timestamp}`) 的 hex
 */
@Injectable()
export class DeviceAuthGuard implements CanActivate {
  constructor(@Inject('PRISMA_CLIENT') private readonly prisma: any) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const deviceNo = req.headers['x-device-no'];
    const timestamp = req.headers['x-device-timestamp'];
    const sign = req.headers['x-device-sign'];
    if (!deviceNo || !timestamp || !sign) {
      throw new UnauthorizedException('设备鉴权参数缺失');
    }
    const ts = parseInt(String(timestamp), 10);
    if (!Number.isFinite(ts) || Math.abs(Date.now() - ts) > 5 * 60 * 1000) {
      throw new UnauthorizedException('设备签名已过期');
    }
    const device = await this.prisma.device.findUnique({ where: { deviceNo: String(deviceNo) } });
    if (!device || !device.secret) throw new UnauthorizedException('设备未绑定或密钥缺失');
    const expected = createHmac('sha256', device.secret).update(`${deviceNo}.${timestamp}`).digest('hex');
    const a = Buffer.from(expected, 'hex');
    const b = Buffer.from(String(sign), 'hex');
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      throw new UnauthorizedException('设备签名校验失败');
    }
    req.device = device;
    return true;
  }
}
