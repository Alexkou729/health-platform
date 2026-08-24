import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

/** 小程序客户端鉴权：客户 JWT（type=customer） */
@Injectable()
export class ClientAuthGuard implements CanActivate {
  constructor(private readonly jwt: JwtService, private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const auth: string = req.headers['authorization'] || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
    if (!token) throw new UnauthorizedException('未登录');
    try {
      const payload = this.jwt.verify(token, { secret: this.config.get('JWT_SECRET') });
      if (payload?.type !== 'customer') throw new Error('非客户令牌');
      req.customer = payload;
      return true;
    } catch {
      throw new UnauthorizedException('登录已失效');
    }
  }
}
