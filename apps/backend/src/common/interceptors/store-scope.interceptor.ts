import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';

/**
 * 门店数据隔离拦截器：
 * 非总部(SUPER_ADMIN)用户，所有请求的 storeId 强制锁定为自己的门店，
 * 防止商家越权访问其他门店数据。
 */
@Injectable()
export class StoreScopeInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();
    const user = req.user;
    if (user && user.role !== 'SUPER_ADMIN' && user.storeId) {
      // 查询参数
      if (req.query && typeof req.query === 'object') {
        req.query.storeId = user.storeId;
      }
      // 请求体
      if (req.body && typeof req.body === 'object' && !Array.isArray(req.body)) {
        req.body.storeId = user.storeId;
      }
    }
    return next.handle();
  }
}
