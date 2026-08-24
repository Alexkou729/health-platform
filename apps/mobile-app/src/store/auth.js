import { defineStore } from 'pinia';
import { authApi } from '../api/index.js';
export const useAuthStore = defineStore('auth', {
  state: () => ({ token: uni.getStorageSync('access_token') || '', user: JSON.parse(uni.getStorageSync('user_info') || 'null') }),
  actions: {
    async login(u, p) { const res = await authApi.login(u, p); this.token = res.accessToken; this.user = res.staff; uni.setStorageSync('access_token', res.accessToken); uni.setStorageSync('user_info', JSON.stringify(res.staff)); return res; },
    logout() { this.token = ''; this.user = null; uni.removeStorageSync('access_token'); uni.removeStorageSync('user_info'); },
  },
});
