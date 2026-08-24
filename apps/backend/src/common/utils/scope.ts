/**
 * 门店数据隔离：总部(SUPER_ADMIN)可见全部，其余角色仅可见自己门店
 */
export function scopedWhere(user: any, base: any = {}) {
  if (user?.role === 'SUPER_ADMIN') return base;
  const storeId = user?.storeId;
  if (!storeId) return base;
  return { ...base, storeId };
}

/**
 * 总部管理员：拥有跨门店、加盟管理、计费结算等全权限
 */
export function isHeadOffice(user: any): boolean {
  return user?.role === 'SUPER_ADMIN';
}

/**
 * 生成唯一单号
 */
export function genNo(prefix: string): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const stamp =
    d.getFullYear() +
    pad(d.getMonth() + 1) +
    pad(d.getDate()) +
    pad(d.getHours()) +
    pad(d.getMinutes()) +
    pad(d.getSeconds());
  const rand = String(Math.floor(Math.random() * 10000)).padStart(4, '0');
  return prefix + stamp + rand;
}
