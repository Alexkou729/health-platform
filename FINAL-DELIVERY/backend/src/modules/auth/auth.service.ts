import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class AuthService {
  constructor(
    @Inject('PRISMA_CLIENT') private readonly prisma: any,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  async login(username: string, password: string) {
    const staff = await this.prisma.staff.findUnique({ where: { username } });
    if (!staff || staff.status !== 'ACTIVE') {
      throw new UnauthorizedException('用户名或密码错误');
    }
    const ok = await bcrypt.compare(password, staff.password);
    if (!ok) {
      // 记录失败日志
      await this.prisma.loginLog.create({
        data: { staffId: staff.id, success: false, message: '密码错误' },
      });
      throw new UnauthorizedException('用户名或密码错误');
    }

    // 更新最后登录时间
    await this.prisma.staff.update({
      where: { id: staff.id },
      data: { lastLoginAt: new Date() },
    });

    // 记录成功日志
    await this.prisma.loginLog.create({
      data: { staffId: staff.id, success: true },
    });

    const payload = {
      sub: staff.id,
      username: staff.username,
      role: staff.role,
      storeId: staff.storeId,
    };

    return {
      accessToken: this.jwtService.sign(payload),
      refreshToken: this.jwtService.sign(payload, { expiresIn: '30d' }),
      expiresIn: this.config.get('JWT_EXPIRES_IN', '7d'),
      staff: {
        id: staff.id,
        username: staff.username,
        name: staff.name,
        role: staff.role,
        avatarUrl: staff.avatarUrl,
        storeId: staff.storeId,
      },
    };
  }

  async getProfile(staffId: string) {
    return this.prisma.staff.findUnique({
      where: { id: staffId },
      select: {
        id: true, username: true, name: true, phone: true, email: true,
        avatarUrl: true, role: true, storeId: true, commissionRate: true,
        lastLoginAt: true, createdAt: true,
        store: { select: { id: true, name: true, code: true } },
      },
    });
  }

  async changePassword(staffId: string, oldPassword: string, newPassword: string) {
    const staff = await this.prisma.staff.findUnique({ where: { id: staffId } });
    if (!staff) throw new UnauthorizedException('用户不存在');
    const ok = await bcrypt.compare(oldPassword, staff.password);
    if (!ok) throw new UnauthorizedException('原密码错误');
    const hashed = await bcrypt.hash(newPassword, 10);
    await this.prisma.staff.update({
      where: { id: staffId },
      data: { password: hashed },
    });
    return { success: true };
  }

  async createStaff(data: any) {
    const hashed = await bcrypt.hash(data.password || '123456', 10);
    return this.prisma.staff.create({
      data: { ...data, password: hashed },
    });
  }
}
