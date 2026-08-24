import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * 从请求中取出当前登录用户（由 JwtAuthGuard 注入）
 * 结构: { sub, username, role, storeId }
 */
export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
