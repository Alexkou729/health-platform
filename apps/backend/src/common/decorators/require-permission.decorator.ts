import { SetMetadata } from '@nestjs/common';

export const REQUIRE_PERMISSION_KEY = 'require_permission';

/** 在路由上声明所需功能权限码（如 'customers' / 'orders' / 'detection'） */
export const RequirePermission = (code: string) => SetMetadata(REQUIRE_PERMISSION_KEY, code);
