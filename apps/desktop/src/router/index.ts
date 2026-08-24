/**
 * 路由配置
 */
import { createRouter, createWebHashHistory } from 'vue-router';
import { useAuthStore } from '@/stores/auth';

const routes = [
  { path: '/login', component: () => import('@/views/Login.vue'), meta: { layout: 'blank' } },
  {
    path: '/',
    component: () => import('@/views/Layout.vue'),
    redirect: '/dashboard',
    children: [
      { path: 'dashboard', component: () => import('@/views/Dashboard.vue'), meta: { title: '运营看板', icon: 'Odometer' } },
      { path: 'detection', component: () => import('@/views/Detection.vue'), meta: { title: '检测中心', icon: 'Aim' } },
      { path: 'reports', component: () => import('@/views/Reports.vue'), meta: { title: '报告中心', icon: 'Document' } },
      { path: 'comparison', component: () => import('@/views/Comparison.vue'), meta: { title: '历史对比', icon: 'DataAnalysis' } },
      { path: 'customers', component: () => import('@/views/Customers.vue'), meta: { title: '客户管理', icon: 'User' } },
      { path: 'orders', component: () => import('@/views/Orders.vue'), meta: { title: '订单管理', icon: 'List' } },
      { path: 'packages', component: () => import('@/views/Packages.vue'), meta: { title: '套餐管理', icon: 'Goods' } },
      { path: 'devices', component: () => import('@/views/Devices.vue'), meta: { title: '设备管理', icon: 'Cpu' } },
      { path: 'staff', component: () => import('@/views/Staff.vue'), meta: { title: '员工管理', icon: 'UserFilled', roles: ['SUPER_ADMIN', 'STORE_ADMIN'] } },
      { path: 'stores', component: () => import('@/views/Stores.vue'), meta: { title: '门店管理', icon: 'OfficeBuilding', roles: ['SUPER_ADMIN'] } },
      { path: 'marketing', component: () => import('@/views/Marketing.vue'), meta: { title: '营销中心', icon: 'TrendCharts' } },
      { path: 'wechat', component: () => import('@/views/Wechat.vue'), meta: { title: '微信配置', icon: 'ChatDotRound' } },
      { path: 'care-plans', component: () => import('@/views/CarePlans.vue'), meta: { title: '调理方案', icon: 'MagicStick' } },
      { path: 'appointments', component: () => import('@/views/Appointments.vue'), meta: { title: '预约管理', icon: 'Calendar' } },
      { path: 'tasks', component: () => import('@/views/Tasks.vue'), meta: { title: '任务工作台', icon: 'List' } },
      { path: 'analytics', component: () => import('@/views/Analytics.vue'), meta: { title: '运营报表', icon: 'DataLine', roles: ['SUPER_ADMIN', 'STORE_ADMIN'] } },
      { path: 'service-request', component: () => import('@/views/ServiceRequest.vue'), meta: { title: '服务申请', icon: 'Promotion' } },
      { path: 'franchise', component: () => import('@/views/Franchise.vue'), meta: { title: '加盟管理', icon: 'OfficeBuilding', roles: ['SUPER_ADMIN'] } },
      { path: 'settings', component: () => import('@/views/Settings.vue'), meta: { title: '系统设置', icon: 'Setting' } },
    ],
  },
];

export default createRouter({
  history: createWebHashHistory(),
  routes,
});

export function setupGuards(router: any) {
  router.beforeEach((to: any, from: any, next: any) => {
    const auth = useAuthStore();
    if (to.path !== '/login' && !auth.isLoggedIn) {
      next('/login');
    } else if (to.path !== '/login' && to.path !== '/dashboard' && !auth.can(to.path.replace(/^\//, ''))) {
      next('/dashboard');
    } else {
      next();
    }
  });
}
