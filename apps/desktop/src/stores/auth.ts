/**
 * 认证状态管理
 */
import { defineStore } from 'pinia';
import { authApi, api } from '@/api';

interface UserInfo {
  id: string;
  username: string;
  name: string;
  role: string;
  avatarUrl?: string;
  storeId?: string;
}

const ROLE_DEFAULT_PERMISSIONS: Record<string, string[]> = {
  STORE_ADMIN: ['detection', 'reports', 'comparison', 'customers', 'orders', 'packages', 'devices', 'staff', 'marketing', 'wechat', 'care-plans', 'appointments', 'tasks', 'analytics', 'service-request', 'settings'],
  DOCTOR: ['detection', 'reports', 'comparison', 'customers', 'care-plans', 'appointments', 'tasks', 'service-request'],
  CONSULTANT: ['detection', 'reports', 'comparison', 'customers', 'care-plans', 'appointments', 'tasks', 'service-request'],
  RECEPTIONIST: ['detection', 'reports', 'customers', 'orders', 'appointments', 'tasks'],
};

export const useAuthStore = defineStore('auth', {
  state: () => ({
    token: localStorage.getItem('access_token') || '',
    user: JSON.parse(localStorage.getItem('user_info') || 'null') as UserInfo | null,
    permissions: JSON.parse(localStorage.getItem('user_permissions') || '[]') as string[],
    apiBaseUrl: localStorage.getItem('api_base_url') || 'http://localhost:3000/api',
  }),
  getters: {
    isLoggedIn: (state) => !!state.token,
    isAdmin: (state) => state.user?.role === 'SUPER_ADMIN' || state.user?.role === 'STORE_ADMIN',
    isDoctor: (state) => state.user?.role === 'DOCTOR' || state.user?.role === 'CONSULTANT',
    can: (state) => (code: string) => {
      if (!state.user) return false;
      if (state.user.role === 'SUPER_ADMIN') return true;
      if (!state.permissions || state.permissions.length === 0) {
        const defaults = ROLE_DEFAULT_PERMISSIONS[state.user.role] || [];
        return defaults.includes(code);
      }
      return state.permissions.includes(code);
    },
  },
  actions: {
    async login(username: string, password: string) {
      const res: any = await authApi.login(username, password);
      this.token = res.accessToken;
      this.user = res.staff;
      this.permissions = res.staff?.permissions || [];
      localStorage.setItem('access_token', res.accessToken);
      localStorage.setItem('user_info', JSON.stringify(res.staff));
      localStorage.setItem('user_permissions', JSON.stringify(this.permissions));
      return res;
    },
    logout() {
      this.token = '';
      this.user = null;
      this.permissions = [];
      localStorage.removeItem('access_token');
      localStorage.removeItem('user_info');
      localStorage.removeItem('user_permissions');
    },
    setApiBaseUrl(url: string) {
      this.apiBaseUrl = url;
      localStorage.setItem('api_base_url', url);
      // 同步更新 axios 实例，切换服务器地址立即生效（无需重启）
      api.defaults.baseURL = url;
    },
  },
});
