import axios from 'axios';
import { getApiBase } from '../utils/config.js';
const api = axios.create({ baseURL: getApiBase(), timeout: 30000 });
api.interceptors.request.use(c => { const t = uni.getStorageSync('access_token'); if (t) c.headers.Authorization = 'Bearer ' + t; return c; });
api.interceptors.response.use(res => { const d = res.data; if (d && 'code' in d) { if (d.code !== 0 && d.code !== 200) return Promise.reject(new Error(d.message)); return d.data; } return d; }, err => { if (err.response?.status === 401) { uni.removeStorageSync('access_token'); uni.reLaunch({ url: '/pages/my/index' }); } return Promise.reject(err); });
export default api;
export const authApi = { login: (u, p) => api.post('/auth/login', { username: u, password: p }) };
export const customerApi = { list: p => api.get('/customers', { params: p }), detail: id => api.get('/customers/' + id), create: d => api.post('/customers', d) };
export const detectionApi = { list: p => api.get('/detections', { params: p }), start: d => api.post('/detections', d) };
export const deviceApi = { list: p => api.get('/devices', { params: p }), detail: id => api.get('/devices/' + id) };
export const appointmentApi = { list: p => api.get('/appointments', { params: p }), today: () => api.get('/appointments/today'), create: d => api.post('/appointments', d), confirm: id => api.post('/appointments/' + id + '/confirm') };
export const planApi = { list: p => api.get('/care-plans', { params: p }), detail: id => api.get('/care-plans/' + id), create: d => api.post('/care-plans', d), generateAdvice: (c, i) => api.post('/advice/generate', { constitution: c, indicators: i }), recommendRecipes: (c, i) => api.post('/recipes/recommend', { constitution: c, issues: i }) };
export const reportApi = { list: p => api.get('/reports', { params: p }), detail: id => api.get('/reports/' + id) };
export const dashboardApi = { overview: () => api.get('/performance/dashboard'), staff: p => api.get('/performance/staff', { params: { period: p } }) };
export const scriptApi = { generate: d => api.post('/scripts/generate', d) };
// 小程序客户端（客户）API
export const clientAuth = {
  sendCode: phone => api.post('/client/auth/send-code', { phone }),
  login: (phone, code) => api.post('/client/auth/login', { phone, code }),
};
export const clientApi = {
  products: (category) => api.get('/client/products', { params: category ? { category } : {} }),
  homeServices: () => api.get('/client/home-services'),
  createMallOrder: (data) => api.post('/client/mall-orders', data),
  mallOrders: () => api.get('/client/mall-orders'),
  createHomeServiceOrder: (data) => api.post('/client/home-service-orders', data),
  homeServiceOrders: () => api.get('/client/home-service-orders'),
  reports: () => api.get('/client/reports'),
  carePlans: () => api.get('/client/care-plans'),
  coupons: () => api.get('/client/coupons'),
};
