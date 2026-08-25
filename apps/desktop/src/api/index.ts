/**
 * API 客户端 (含离线演示模式)
 * 当后端不可用时自动切换到本地模拟数据
 */
import axios from 'axios';
import { ElMessage } from 'element-plus';

// ============================================
// 离线模式开关 (true = 启用, 无需后端即可演示)
// ============================================
const OFFLINE_MODE = false;
let isOnline = false;

// ============================================
// 模拟数据
// ============================================
const MOCK = {
  user: { id: 'u1', username: 'admin', name: '超级管理员', role: 'SUPER_ADMIN', storeId: 's1', store: { id: 's1', name: '总店' } },
  dashboard: {
    total: { customers: 5, detections: 36, orders: 28, revenue: 20648 },
    today: { customers: 0, detections: 3, orders: 1, revenue: 99 },
    month: { revenue: 12680 },
    devices: { online: 1 },
    tasks: { pending: 4 },
    appointments: { today: 2 },
  },
  staffPerformance: [
    { staff: { id: 's2', name: '李医生', role: 'DOCTOR', avatarUrl: null }, store: { id: 's1', name: '总店' }, period: '2025-08', detectionCount: 28, customerCount: 18, orderCount: 12, revenue: 12800, commission: 1920 },
    { staff: { id: 's3', name: '前台小张', role: 'RECEPTIONIST', avatarUrl: null }, store: { id: 's1', name: '总店' }, period: '2025-08', detectionCount: 8, customerCount: 5, orderCount: 4, revenue: 5680, commission: 284 },
  ],
  customers: [
    { id: '1', name: '张三', phone: '13800138000', gender: 1, age: 45, heightCm: 175, weightKg: 72, tags: ['QI_DEFICIENCY'], level: 'GOLD', totalSpent: 3680, totalDetections: 8, lastDetectionAt: new Date().toISOString(), createdAt: '2025-06-15', source: 'WECHAT', status: 'ACTIVE', store: { id: 's1', name: '总店' } },
    { id: '2', name: '李四', phone: '13900139000', gender: 2, age: 38, heightCm: 162, weightKg: 55, tags: ['YANG_DEFICIENCY'], level: 'DIAMOND', totalSpent: 8990, totalDetections: 12, lastDetectionAt: new Date().toISOString(), createdAt: '2024-12-10', source: 'REFERRAL', status: 'ACTIVE', store: { id: 's1', name: '总店' } },
    { id: '3', name: '王五', phone: '13700137000', gender: 1, age: 62, heightCm: 168, weightKg: 65, tags: ['PHLEGM_DAMPNESS'], level: 'SILVER', totalSpent: 1999, totalDetections: 5, lastDetectionAt: new Date().toISOString(), createdAt: '2025-03-20', source: 'OFFLINE', status: 'ACTIVE', store: { id: 's1', name: '总店' } },
    { id: '4', name: '赵六', phone: '13600136000', gender: 2, age: 28, heightCm: 165, weightKg: 50, tags: ['BALANCED'], level: 'BRONZE', totalSpent: 299, totalDetections: 1, lastDetectionAt: new Date().toISOString(), createdAt: '2025-09-01', source: 'WECHAT', status: 'ACTIVE', store: { id: 's1', name: '总店' } },
    { id: '5', name: '孙七', phone: '13500135000', gender: 1, age: 55, heightCm: 170, weightKg: 68, tags: ['BLOOD_STASIS'], level: 'GOLD', totalSpent: 5680, totalDetections: 10, lastDetectionAt: new Date().toISOString(), createdAt: '2025-01-15', source: 'OFFLINE', status: 'ACTIVE', store: { id: 's1', name: '总店' } },
  ],
  reports: [
    {
      id: 'r1', title: '综合报告', score: 78, templateCode: 'comprehensive',
      conclusion: '张先生本次检测综合评分78分，整体状态良好。检测发现气虚体质倾向，建议加强日常调理。',
      indicators: [
        { name: '心率', value: 72, unit: 'BPM', status: 0, lowLimit: 60, highLimit: 100, referenceRange: '60-100' },
        { name: '血氧饱和度', value: 97, unit: '%', status: 0, lowLimit: 95, highLimit: 100, referenceRange: '95-100' },
        { name: '基础代谢', value: 1620, unit: 'kcal', status: 1, lowLimit: 1400, highLimit: 1800, referenceRange: '1400-1800' },
        { name: '免疫力指数', value: 65, unit: '分', status: 2, lowLimit: 70, highLimit: 90, referenceRange: '70-90' },
        { name: '疲劳程度', value: 75, unit: '%', status: 3, lowLimit: 0, highLimit: 50, referenceRange: '0-50' },
      ],
      suggestions: ['保证每天7-8小时优质睡眠', '每周进行3次有氧运动,每次30分钟', '增加蛋白质摄入,适当食用红枣、桂圆', '避免过度劳累,劳逸结合', '可考虑中医调理或艾灸'],
      warnings: ['⚠ 免疫力指数 偏低 (65分), 建议关注', '⚠ 疲劳程度 偏高 (75%), 需注意休息'],
      highlights: ['心率 正常 (72 BPM)', '血氧饱和度 良好 (97%)'],
      customer: { id: '1', name: '张三', phone: '13800138000', gender: 1, age: 45 },
      createdAt: new Date().toISOString(),
    },
  ],
  appointments: [
    { id: 'a1', customer: { id: '1', name: '张三', phone: '13800138000' }, staff: { id: 's2', name: '李医生' }, serviceType: 'TREATMENT', serviceName: '艾灸调理', scheduledAt: new Date(Date.now() + 2*3600*1000).toISOString(), durationMin: 60, status: 'CONFIRMED', source: 'OFFLINE' },
    { id: 'a2', customer: { id: '2', name: '李四', phone: '13900139000' }, staff: { id: 's2', name: '李医生' }, serviceType: 'CONSULTATION', serviceName: '健康咨询', scheduledAt: new Date(Date.now() + 5*3600*1000).toISOString(), durationMin: 30, status: 'PENDING', source: 'WECHAT' },
  ],
  packages: [
    { id: 'p1', code: 'PKG-SINGLE', name: '单次检测体验', type: 'SINGLE', totalTimes: 1, price: 99, originalPrice: 299, validityDays: 365, description: '60秒全身健康检测 + 43份评估报告', salesCount: 12, status: 'ACTIVE' },
    { id: 'p2', code: 'PKG-QUARTERLY', name: '季度体检套餐', type: 'TIMES', totalTimes: 3, price: 599, originalPrice: 999, validityDays: 90, description: '3次检测 + 调理建议', salesCount: 8, status: 'ACTIVE' },
    { id: 'p3', code: 'PKG-ANNUAL', name: '年度健康管家', type: 'ANNUAL', totalTimes: 12, price: 3999, originalPrice: 6980, validityDays: 365, description: '12次月度检测 + 专属健康顾问', salesCount: 5, status: 'ACTIVE' },
    { id: 'p4', code: 'PKG-TREATMENT', name: '亚健康调理套餐', type: 'TREATMENT', totalTimes: 8, price: 1999, originalPrice: 3580, validityDays: 180, description: '8次检测 + 调理方案', salesCount: 3, status: 'ACTIVE' },
  ],
  orders: [
    { id: 'o1', orderNo: 'ORD20250823001', customer: { id: '1', name: '张三', phone: '13800138000' }, staff: { id: 's2', name: '李医生' }, totalAmount: 599, discountAmount: 0, paidAmount: 599, status: 1, paymentMethod: 'WECHAT', items: [{ id: 'i1', name: '季度体检套餐', quantity: 1, price: 599, subtotal: 599 }], createdAt: new Date(Date.now() - 86400000).toISOString() },
    { id: 'o2', orderNo: 'ORD20250823002', customer: { id: '2', name: '李四', phone: '13900139000' }, staff: { id: 's2', name: '李医生' }, totalAmount: 3999, discountAmount: 0, paidAmount: 3999, status: 1, paymentMethod: 'ALIPAY', items: [{ id: 'i2', name: '年度健康管家', quantity: 1, price: 3999, subtotal: 3999 }], createdAt: new Date(Date.now() - 172800000).toISOString() },
  ],
  devices: [{ id: 'd1', deviceNo: 'QA-DEMO-001', model: 'QA-13', vendor: 'Quantum', status: 1, totalDetections: 158, store: { id: 's1', name: '总店' }, lastHeartbeatAt: new Date().toISOString() }],
  staff: [
    { id: 's1', name: '王经理', role: 'STORE_ADMIN', username: 'manager', phone: '13900000001', commissionRate: 0.1, status: 'ACTIVE' },
    { id: 's2', name: '李医生', role: 'DOCTOR', username: 'doctor', phone: '13900000002', commissionRate: 0.15, status: 'ACTIVE' },
    { id: 's3', name: '前台小张', role: 'RECEPTIONIST', username: 'staff', phone: '13900000003', commissionRate: 0.05, status: 'ACTIVE' },
  ],
  tasks: [
    { id: 't1', title: '跟进张三复检', type: 'REMIND', priority: 'HIGH', customer: { id: '1', name: '张三', phone: '13800138000' }, assignee: { id: 's2', name: '李医生' }, dueDate: new Date(Date.now() + 86400000).toISOString(), status: 'PENDING' },
    { id: 't2', title: '李四套餐推荐', type: 'FOLLOW_UP', priority: 'NORMAL', customer: { id: '2', name: '李四', phone: '13900139000' }, assignee: { id: 's2', name: '李医生' }, dueDate: new Date(Date.now() + 2*86400000).toISOString(), status: 'PENDING' },
  ],
  plans: [
    { id: 'pl1', title: '张三的阳虚体质调理方案', customer: { id: '1', name: '张三', phone: '13800138000' }, constitution: 'YANG_DEFICIENCY', diagnosis: '畏寒肢冷,精神不振', summary: '温阳散寒,益气固表', status: 'ACTIVE', totalPrice: 1280, items: [{ id: 'pi1', name: '艾灸调理', frequency: '1次/周', duration: 60, price: 380, quantity: 4 }, { id: 'pi2', name: '足浴包', frequency: '每日', duration: 30, price: 80, quantity: 1 }], createdAt: new Date(Date.now() - 7*86400000).toISOString() },
  ],
  stores: [{ id: 's1', name: '总店', code: 'DEFAULT', address: '北京市朝阳区', phone: '010-12345678', manager: '王经理', openHours: '09:00-21:00', status: 'ACTIVE', _count: { customers: 5, staff: 3, devices: 1, orders: 28 } }],
};

// ============================================
// Axios 实例
// ============================================
const api = axios.create({
  baseURL: localStorage.getItem('api_base_url') || 'http://localhost:3000/api',
  timeout: 30000,
});

// 检测后端
async function checkBackend() {
  if (!OFFLINE_MODE) return true;
  try {
    const base = api.defaults.baseURL.replace(/\/api$/, '');
    const res = await fetch(base + '/health', { method: 'GET', signal: AbortSignal.timeout(2000) });
    isOnline = res.ok;
  } catch { isOnline = false; }
  return isOnline;
}
checkBackend();

// ============================================
// 请求拦截器 - 标记离线
// ============================================
api.interceptors.request.use(async (config: any) => {
  if (OFFLINE_MODE) {
    const online = await checkBackend();
    if (!online) config._offline = true;
  }
  const token = localStorage.getItem('access_token');
  if (token) config.headers.Authorization = 'Bearer ' + token;
  return config;
});

// ============================================
// 离线模式响应生成
// ============================================
async function mockResponse(method: string, url: string, body: any): Promise<any> {
  await new Promise(r => setTimeout(r, 80 + Math.random() * 150));
  const u = url.split('?')[0];

  if (u.endsWith('/auth/login')) return { accessToken: 'offline-token-' + Date.now(), refreshToken: 'offline-refresh', expiresIn: '7d', staff: MOCK.user };
  if (u.endsWith('/auth/profile')) return MOCK.user;

  if (u.endsWith('/performance/dashboard')) return MOCK.dashboard;
  if (u.includes('/performance/staff')) return MOCK.staffPerformance;
  if (u.endsWith('/customers/statistics')) return { total: 5, todayNew: 0, byLevel: [], bySource: [], byGender: [] };
  if (u.match(/\/customers\/[^/]+\/detections$/)) return [];
  if (u.match(/\/customers\/[^/]+$/) && method === 'GET') {
    const id = u.split('/').pop();
    return MOCK.customers.find(c => c.id === id) || MOCK.customers[0];
  }
  if (u.includes('/customers')) return { items: MOCK.customers, total: 5, page: 1, pageSize: 20 };

  if (u.includes('/reports') && !u.match(/\/reports\/[^/]+$/)) return { items: MOCK.reports, total: 1, page: 1, pageSize: 20 };
  if (u.match(/\/reports\/[^/]+$/) && method === 'GET') return MOCK.reports[0];

  if (u.includes('/appointments/today')) return MOCK.appointments;
  if (u.match(/\/appointments\/[^/]+\/confirm$/)) return { ...MOCK.appointments[0], status: 'CONFIRMED' };
  if (u.match(/\/appointments\/[^/]+\/start$/)) return { ...MOCK.appointments[0], status: 'IN_PROGRESS' };
  if (u.match(/\/appointments\/[^/]+\/complete$/)) return { ...MOCK.appointments[0], status: 'COMPLETED' };
  if (u.match(/\/appointments\/[^/]+\/cancel$/)) return { ...MOCK.appointments[0], status: 'CANCELLED' };
  if (u.includes('/appointments')) return { items: MOCK.appointments, total: 2, page: 1, pageSize: 20 };

  if (u.includes('/care-plans') && !u.match(/\/care-plans\/[^/]+$/)) return { items: MOCK.plans, total: 1, page: 1, pageSize: 20 };
  if (u.match(/\/care-plans\/[^/]+$/)) return MOCK.plans[0];
  if (u.endsWith('/advice/generate')) return { constitution: body?.constitution || 'BALANCED', summary: '您属于平和体质，建议保持健康的生活方式。', advice: { lifestyle: '保持规律作息', diet: '均衡饮食', exercise: '适度运动' }, warnings: [], generatedAt: new Date().toISOString() };

  if (u.includes('/tasks/my-todos')) return MOCK.tasks;
  if (u.includes('/tasks/my-stats')) return { pending: 2, inProgress: 0, completedToday: 1, total: 5 };
  if (u.match(/\/tasks\/[^/]+\/start$/)) return { ...MOCK.tasks[0], status: 'IN_PROGRESS' };
  if (u.match(/\/tasks\/[^/]+\/complete$/)) return { ...MOCK.tasks[0], status: 'COMPLETED' };
  if (u.match(/\/tasks\/[^/]+\/cancel$/)) return { ...MOCK.tasks[0], status: 'CANCELLED' };
  if (u.includes('/tasks')) return { items: MOCK.tasks, total: 2, page: 1, pageSize: 20 };

  if (u.includes('/packages')) return { items: MOCK.packages, total: 4, page: 1, pageSize: 20 };

  if (u.includes('/orders/statistics')) return { total: 28, todayCount: 1, todayRevenue: 99, monthRevenue: 12680, totalRevenue: 20648, byStatus: [] };
  if (u.match(/\/orders\/[^/]+\/pay$/)) return { ...MOCK.orders[0], status: 1, paidAt: new Date().toISOString() };
  if (u.match(/\/orders\/[^/]+\/cancel$/)) return { ...MOCK.orders[0], status: 3 };
  if (u.match(/\/orders\/[^/]+\/refund$/)) return { ...MOCK.orders[0], status: 2 };
  if (u.includes('/orders')) return { items: MOCK.orders, total: 2, page: 1, pageSize: 20 };

  if (u.includes('/devices/statistics')) return { total: 1, online: 1, offline: 0, detecting: 0, byVendor: [] };
  if (u.includes('/devices')) return { items: MOCK.devices, total: 1, page: 1, pageSize: 20 };

  if (u.match(/\/staff\/[^/]+\/reset-password$/)) return { success: true };
  if (u.includes('/staff') && method === 'GET' && !u.match(/\/staff\/[^/]+$/)) return { items: MOCK.staff, total: 3, page: 1, pageSize: 20 };
  if (u.match(/\/staff\/[^/]+$/)) return MOCK.staff.find(s => u.endsWith(s.id)) || MOCK.staff[0];

  if (u.includes('/stores')) return MOCK.stores;

  // Detection
  if (u.includes('/detections') && method === 'POST') return { id: 'd-new-' + Date.now(), status: 1, startedAt: new Date().toISOString(), durationSec: 60, customerId: body?.customerId, deviceId: body?.deviceId };
  if (u.match(/\/detections\/[^/]+\/complete$/)) return { id: u.split('/').slice(-2)[0], status: 2, finishedAt: new Date().toISOString(), overallScore: 75 + Math.floor(Math.random() * 15) };
  if (u.match(/\/detections\/[^/]+\/cancel$/)) return { id: u.split('/').slice(-2)[0], status: 4 };
  if (u.match(/\/detections\/[^/]+$/)) return { id: u.split('/').pop(), status: 2, startedAt: new Date().toISOString(), durationSec: 60 };
  if (u.includes('/detections')) return { items: [], total: 0 };

  return { items: [], total: 0, page: 1, pageSize: 20 };
}

// ============================================
// 响应拦截器
// ============================================
function wrapData(data: any): any { return { code: 0, message: 'success', data, timestamp: Date.now() }; }



// 网络错误/后端不可达 -> 自动降级到离线模式，不弹错误
api.interceptors.response.use(
  async (response: any) => {
    if (response?.config?._offline) {
      const data = await mockResponse(response.config.method?.toUpperCase(), response.config.url || '', response.config.data ? JSON.parse(response.config.data) : null);
      return wrapData(data);
    }
    const data = response.data;
    if (data && typeof data === 'object' && 'code' in data && (data.code !== 0 && data.code !== 200)) {
      ElMessage.error(data.message || '请求失败');
      return Promise.reject(new Error(data.message));
    }
    return data && 'data' in data ? data.data : data;
  },
  async (error: any) => {
    const config = error?.config;
    const isNetworkError = !error.response;

    // 离线模式：网络错误自动降级到 mock 数据，不弹错误
    if (OFFLINE_MODE && isNetworkError && config && !config._retriedOffline) {
      try {
        const data = await mockResponse(
          config.method?.toUpperCase() || 'GET',
          config.url || '',
          config.data ? JSON.parse(config.data) : null
        );
        config._retriedOffline = true;
        if (!sessionStorage.getItem('offline_notified')) {
          sessionStorage.setItem('offline_notified', '1');
          setTimeout(() => {
            ElMessage({
              message: '⚡ 后端未连接，已自动切换到离线演示模式',
              type: 'info',
              duration: 4000,
            });
          }, 500);
        }
        return wrapData(data);
      } catch (mockErr) {
        return wrapData({ items: [], total: 0, page: 1, pageSize: 20 });
      }
    }

    if (error.response?.status === 401) {
      localStorage.removeItem('access_token');
      window.location.href = '#/login';
    }

    if (isNetworkError && !OFFLINE_MODE) {
      ElMessage.error('网络连接失败');
    } else if (error.response?.status >= 500) {
      ElMessage.error('服务器错误');
    } else if (error.response?.status === 404) {
      console.warn('API 404:', config?.url);
    } else if (error.response?.status >= 400) {
      ElMessage.error(error.response?.data?.message || '请求失败');
    }

    return Promise.reject(error);
  }
);

export { api };
export default api;

// ============================================
// 业务 API
// ============================================
export const authApi = {
  login: (username: string, password: string) => api.post('/auth/login', { username, password }),
  profile: () => api.get('/auth/profile'),
  changePassword: (oldPassword: string, newPassword: string) => api.put('/auth/password', { oldPassword, newPassword }),
};
export const customerApi = {
  list: (params: any = {}) => api.get('/customers', { params }),
  detail: (id: string) => api.get('/customers/' + id),
  create: (data: any) => api.post('/customers', data),
  update: (id: string, data: any) => api.put('/customers/' + id, data),
  remove: (id: string) => api.delete('/customers/' + id),
  statistics: (storeId?: string) => api.get('/customers/statistics', { params: { storeId } }),
  detectionHistory: (id: string) => api.get('/customers/' + id + '/detections'),
};
export const detectionApi = {
  list: (params: any = {}) => api.get('/detections', { params }),
  detail: (id: string) => api.get('/detections/' + id),
  start: (data: any) => api.post('/detections', data),
  complete: (id: string, data: any) => api.post('/detections/' + id + '/complete', data),
  cancel: (id: string, reason?: string) => api.post('/detections/' + id + '/cancel', { reason }),
  statistics: (storeId?: string) => api.get('/detections/statistics', { params: { storeId } }),
};
export const reportApi = {
  list: (params: any = {}) => api.get('/reports', { params }),
  templates: () => api.get('/reports/templates'),
  detail: (id: string) => api.get('/reports/' + id),
  send: (id: string) => api.post('/reports/' + id + '/send'),
  interpret: (id: string) => api.post('/ai/interpret/' + id),
  interpretStructured: (id: string) => api.post('/ai/interpret/' + id + '/structured'),
  htmlUrl: (id: string) => api.defaults.baseURL + '/reports/' + id + '/html?token=' + (localStorage.getItem('access_token') || ''),
  pdfUrl: (id: string) => api.defaults.baseURL + '/reports/' + id + '/pdf?token=' + (localStorage.getItem('access_token') || ''),
  comparison: (customerId: string, templateCode: string) => api.get('/reports/comparison/' + customerId, { params: { templateCode } }),
  statistics: () => api.get('/reports/statistics'),
};
export const deviceApi = {
  list: (params: any = {}) => api.get('/devices', { params }),
  detail: (id: string) => api.get('/devices/' + id),
  create: (data: any) => api.post('/devices', data),
  update: (id: string, data: any) => api.put('/devices/' + id, data),
  remove: (id: string) => api.delete('/devices/' + id),
  statistics: () => api.get('/devices/statistics'),
  sync: (devices: any[]) => api.post('/devices/sync', { devices }),
};
export const packageApi = {
  list: (params: any = {}) => api.get('/packages', { params }),
  detail: (id: string) => api.get('/packages/' + id),
  create: (data: any) => api.post('/packages', data),
  update: (id: string, data: any) => api.put('/packages/' + id, data),
  remove: (id: string) => api.delete('/packages/' + id),
};
export const orderApi = {
  list: (params: any = {}) => api.get('/orders', { params }),
  detail: (id: string) => api.get('/orders/' + id),
  create: (data: any) => api.post('/orders', data),
  pay: (id: string, paymentMethod: string) => api.post('/orders/' + id + '/pay', { paymentMethod }),
  cancel: (id: string, reason?: string) => api.post('/orders/' + id + '/cancel', { reason }),
  refund: (id: string) => api.post('/orders/' + id + '/refund'),
  statistics: (storeId?: string) => api.get('/orders/statistics', { params: { storeId } }),
};
export const staffApi = {
  list: (params: any = {}) => api.get('/staff', { params }),
  detail: (id: string) => api.get('/staff/' + id),
  create: (data: any) => api.post('/staff', data),
  update: (id: string, data: any) => api.put('/staff/' + id, data),
  remove: (id: string) => api.delete('/staff/' + id),
  resetPassword: (id: string, newPassword?: string) => api.post('/staff/' + id + '/reset-password', { newPassword }),
  updatePermissions: (id: string, permissions: string[]) => api.put('/staff/' + id + '/permissions', { permissions }),
};
export const storeApi = {
  list: () => api.get('/stores'),
  detail: (id: string) => api.get('/stores/' + id),
  create: (data: any) => api.post('/stores', data),
  update: (id: string, data: any) => api.put('/stores/' + id, data),
  remove: (id: string) => api.delete('/stores/' + id),
};
export const dashboardApi = {
  overview: (storeId?: string) => api.get('/dashboard/overview', { params: { storeId } }),
  trend: (days = 7, storeId?: string) => api.get('/dashboard/trend', { params: { days, storeId } }),
  constitution: () => api.get('/dashboard/constitution'),
  hotReports: (limit = 10) => api.get('/dashboard/hot-reports', { params: { limit } }),
};
export const planApi = {
  list: (params: any = {}) => api.get('/care-plans', { params }),
  detail: (id: string) => api.get('/care-plans/' + id),
  create: (data: any) => api.post('/care-plans', data),
  update: (id: string, data: any) => api.put('/care-plans/' + id, data),
  remove: (id: string) => api.delete('/care-plans/' + id),
  generateAdvice: (data: any) => api.post('/advice/generate', data),
};
export const appointmentApi = {
  list: (params: any = {}) => api.get('/appointments', { params }),
  detail: (id: string) => api.get('/appointments/' + id),
  today: (storeId?: string) => api.get('/appointments/today', { params: { storeId } }),
  create: (data: any) => api.post('/appointments', data),
  update: (id: string, data: any) => api.put('/appointments/' + id, data),
  confirm: (id: string) => api.post('/appointments/' + id + '/confirm'),
  start: (id: string) => api.post('/appointments/' + id + '/start'),
  complete: (id: string, staffNotes?: string) => api.post('/appointments/' + id + '/complete', { staffNotes }),
  cancel: (id: string, reason?: string) => api.post('/appointments/' + id + '/cancel', { reason }),
};
export const taskApi = {
  list: (params: any = {}) => api.get('/tasks', { params }),
  detail: (id: string) => api.get('/tasks/' + id),
  create: (data: any) => api.post('/tasks', data),
  update: (id: string, data: any) => api.put('/tasks/' + id, data),
  myTodos: (status?: string) => api.get('/tasks/my-todos', { params: { status } }),
  myStats: () => api.get('/tasks/my-stats'),
  start: (id: string) => api.post('/tasks/' + id + '/start'),
  complete: (id: string, result?: string) => api.post('/tasks/' + id + '/complete', { result }),
  cancel: (id: string) => api.post('/tasks/' + id + '/cancel'),
};
export const scriptApi = {
  list: (params: any = {}) => api.get('/scripts', { params }),
  generate: (data: any) => api.post('/scripts/generate', data),
};
export const performanceApi = {
  dashboard: () => api.get('/performance/dashboard'),
  staff: (period: string) => api.get('/performance/staff', { params: { period } }),
  revenue: (startDate?: string, endDate?: string) => api.get('/performance/revenue', { params: { startDate, endDate } }),
  projects: (startDate?: string, endDate?: string) => api.get('/performance/projects', { params: { startDate, endDate } }),
};
export const paymentApi = {
  create: (data: any) => api.post('/payment/create', data),
  refund: (data: any) => api.post('/payment/refund', data),
};
export const couponApi = {
  list: () => api.get('/coupons'),
  create: (data: any) => api.post('/coupons', data),
  issue: (id: string, customerId: string) => api.post('/coupons/' + id + '/issue', { customerId }),
  customerCoupons: (customerId: string) => api.get('/customers/' + customerId + '/coupons'),
};
export const franchiseApi = {
  // 服务工单
  listRequests: (params: any = {}) => api.get('/service-requests', { params }),
  requestDetail: (id: string) => api.get('/service-requests/' + id),
  createRequest: (data: any) => api.post('/service-requests', data),
  acceptRequest: (id: string) => api.post('/service-requests/' + id + '/accept'),
  rejectRequest: (id: string, reason?: string) => api.post('/service-requests/' + id + '/reject', { reason }),
  completeRequest: (id: string, result: any) => api.post('/service-requests/' + id + '/complete', { result }),
  // 订阅 / 计费
  subscriptions: () => api.get('/subscriptions'),
  createSubscription: (data: any) => api.post('/subscriptions', data),
  aiUsage: () => api.get('/ai-usage'),
  invoices: () => api.get('/invoices'),
  payInvoice: (id: string, method: string) => api.post('/invoices/' + id + '/pay', { method }),
  // 加盟看板
  dashboard: () => api.get('/franchise/dashboard'),
  // AI 接口配置（总台专属）
  getAiConfig: () => api.get('/ai-config'),
  setAiConfig: (data: any) => api.post('/ai-config', data),
  // 加盟申请（公共提交 / 总部审批）
  applyFranchise: (data: any) => api.post('/franchise/apply', data),
  listApplications: () => api.get('/franchise/applications'),
  approveApplication: (id: string, data: any) => api.post('/franchise/applications/' + id + '/approve', data),
  rejectApplication: (id: string, reason?: string) => api.post('/franchise/applications/' + id + '/reject', { reason }),
};
export const productApi = {
  list: (params: any = {}) => api.get('/products', { params }),
  create: (data: any) => api.post('/products', data),
  update: (id: string, data: any) => api.put('/products/' + id, data),
  audit: (id: string, approve: boolean, remark?: string) => api.post('/products/' + id + '/audit', { approve, remark }),
  remove: (id: string) => api.delete('/products/' + id),
};
export const mallOrderApi = {
  list: (params: any = {}) => api.get('/mall-orders', { params }),
  accept: (id: string) => api.post('/mall-orders/' + id + '/accept'),
  ship: (id: string) => api.post('/mall-orders/' + id + '/ship'),
  complete: (id: string) => api.post('/mall-orders/' + id + '/complete'),
  cancel: (id: string, reason?: string) => api.post('/mall-orders/' + id + '/cancel', { reason }),
  pay: (id: string) => api.post('/mall-orders/' + id + '/pay'),
};
export const homeServiceApi = {
  services: (params: any = {}) => api.get('/home-services', { params }),
  createService: (data: any) => api.post('/home-services', data),
  orders: (params: any = {}) => api.get('/home-service-orders', { params }),
  assign: (id: string, storeId: string) => api.post('/home-service-orders/' + id + '/assign', { storeId }),
  accept: (id: string) => api.post('/home-service-orders/' + id + '/accept'),
  start: (id: string) => api.post('/home-service-orders/' + id + '/start'),
  complete: (id: string) => api.post('/home-service-orders/' + id + '/complete'),
  cancel: (id: string, reason?: string) => api.post('/home-service-orders/' + id + '/cancel', { reason }),
  pay: (id: string, method: string) => api.post('/home-service-orders/' + id + '/pay', { method }),
};
export const settlementApi = {
  list: () => api.get('/settlements'),
  set: (storeId: string, ratio: number, remark?: string) => api.post('/settlements', { storeId, ratio, remark }),
};
