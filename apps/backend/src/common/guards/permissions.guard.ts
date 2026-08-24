import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { hasPermission } from '../utils/permissions';
import { REQUIRE_PERMISSION_KEY } from '../decorators/require-permission.decorator';

/**
 * 功能权限守卫：配合 @RequirePermission('code') 使用。
 * 必须在 JwtAuthGuard 之后执行（此时 req.user 已注入）。
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const code = this.reflector.getAllAndOverride<string>(REQUIRE_PERMISSION_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!code) return true;
    const req = context.switchToHttp().getRequest();
    const user = req.user;
    if (!hasPermission(user, code)) {
      throw new ForbiddenException('无权执行此操作');
    }
    return true;
  }
}
