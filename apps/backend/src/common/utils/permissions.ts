/**
 * 功能权限码（与桌面端菜单一一对应）
 */
export const PERMISSION_DEFS: Array<{ code: string; label: string }> = [
  { code: 'detection', label: '检测中心' },
  { code: 'reports', label: '报告中心' },
  { code: 'comparison', label: '历史对比' },
  { code: 'customers', label: '客户管理' },
  { code: 'orders', label: '订单管理' },
  { code: 'packages', label: '套餐管理' },
  { code: 'devices', label: '设备管理' },
  { code: 'staff', label: '员工管理' },
  { code: 'marketing', label: '营销中心' },
  { code: 'products', label: '商品管理' },
  { code: 'mall-orders', label: '商城订单' },
  { code: 'home-service-orders', label: '上门服务' },
  { code: 'wechat', label: '微信配置' },
  { code: 'care-plans', label: '调理方案' },
  { code: 'appointments', label: '预约管理' },
  { code: 'tasks', label: '任务工作台' },
  { code: 'analytics', label: '运营报表' },
  { code: 'service-request', label: '服务申请' },
  { code: 'franchise', label: '加盟管理' },
  { code: 'stores', label: '门店管理' },
  { code: 'settings', label: '系统设置' },
  { code: 'settlements', label: '结算比例' },
];

export function parsePermissions(permissions: any): string[] {
  if (typeof permissions === 'string') {
    try { return JSON.parse(permissions || '[]'); } catch { return []; }
  }
  return Array.isArray(permissions) ? permissions : [];
}

/**
 * 角色默认权限集（permissions 为空时按角色收敛，不再“空=放行一切”）
 */
export const ROLE_DEFAULT_PERMISSIONS: Record<string, string[]> = {
  SUPER_ADMIN: [],
  STORE_ADMIN: ['detection', 'reports', 'comparison', 'customers', 'orders', 'packages', 'devices', 'staff', 'marketing', 'products', 'mall-orders', 'home-service-orders', 'wechat', 'care-plans', 'appointments', 'tasks', 'analytics', 'service-request', 'settings'],
  DOCTOR: ['detection', 'reports', 'comparison', 'customers', 'care-plans', 'appointments', 'tasks', 'service-request'],
  CONSULTANT: ['detection', 'reports', 'comparison', 'customers', 'care-plans', 'appointments', 'tasks', 'service-request'],
  RECEPTIONIST: ['detection', 'reports', 'customers', 'orders', 'appointments', 'tasks'],
};

/**
 * 判断用户是否有某项功能权限
 * SUPER_ADMIN 拥有全部权限；其余角色：permissions 为空时按角色默认，
 * 非空时作为白名单（仍受角色限制约束）。
 */
export function hasPermission(user: any, code: string): boolean {
  if (!user) return false;
  if (user.role === 'SUPER_ADMIN') return true;
  const perms = parsePermissions(user.permissions);
  if (perms.length === 0) {
    const defaults = ROLE_DEFAULT_PERMISSIONS[user.role] || [];
    return defaults.includes(code);
  }
  return perms.includes(code);
}
