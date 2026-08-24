<template>
<view class="dashboard">
  <view class="user-bar">
    <view class="user-avatar">{{ avatarText }}</view>
    <view class="user-info"><text class="user-name">{{ user?.name || "员工" }}</text><text class="user-role">{{ roleText }}</text></view>
  </view>
  <view class="stats-grid">
    <view class="stat-card"><text class="stat-num">{{ stats.total?.customers || 0 }}</text><text class="stat-label">客户</text></view>
    <view class="stat-card"><text class="stat-num">{{ stats.today?.detections || 0 }}</text><text class="stat-label">今日检测</text></view>
    <view class="stat-card"><text class="stat-num">{{ stats.today?.orders || 0 }}</text><text class="stat-label">今日订单</text></view>
    <view class="stat-card"><text class="stat-num">¥{{ stats.month?.revenue || 0 }}</text><text class="stat-label">本月营收</text></view>
  </view>
  <view class="quick-grid">
    <view class="qa" @click="goDetect"><text class="qa-icon">🔬</text><text>检测</text></view>
    <view class="qa" @click="goCustomer"><text class="qa-icon">👥</text><text>客户</text></view>
    <view class="qa" @click="goAppointment"><text class="qa-icon">📅</text><text>预约</text></view>
    <view class="qa" @click="goPlan"><text class="qa-icon">💊</text><text>方案</text></view>
    <view class="qa" @click="goReport"><text class="qa-icon">📋</text><text>报告</text></view>
  </view>
  <view class="section">
    <text class="section-title">📅 今日预约</text>
    <view v-if="appts.length === 0" class="empty">暂无预约</view>
    <view v-for="a in appts" :key="a.id" class="appt">
      <text class="appt-time">{{ formatTime(a.scheduledAt) }}</text>
      <view class="appt-info"><text class="appt-name">{{ a.customer?.name }}</text><text class="appt-svc">{{ a.serviceName }}</text></view>
      <text class="appt-st" :class="'st-' + a.status">{{ statusText(a.status) }}</text>
    </view>
  </view>
</view>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { onShow, onPullDownRefresh } from '@dcloudio/uni-app';
import { dashboardApi, appointmentApi } from '../../api/index.js';
const user = ref(null); const stats = ref({}); const appts = ref([]);
const avatarText = computed(() => user.value?.name?.[0] || 'U');
const roleText = computed(() => ({ SUPER_ADMIN: '超级管理员', STORE_ADMIN: '店长', DOCTOR: '医师', CONSULTANT: '健康顾问', RECEPTIONIST: '前台' }[user.value?.role] || '员工'));
function formatTime(d) { return d ? new Date(d).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }) : '--:--'; }
function statusText(s) { return { PENDING: '待确认', CONFIRMED: '已确认', IN_PROGRESS: '进行中', COMPLETED: '已完成' }[s] || s; }
async function loadData() { try { user.value = JSON.parse(uni.getStorageSync('user_info') || 'null'); const [s, a] = await Promise.all([dashboardApi.overview(), appointmentApi.today()]); stats.value = s; appts.value = (a || []).slice(0, 5); } catch (e) {} }
onMounted(loadData); onShow(loadData);
onPullDownRefresh(async () => { await loadData(); uni.stopPullDownRefresh(); });
function goDetect() { uni.switchTab({ url: '/pages/detect/index' }); }
function goCustomer() { uni.switchTab({ url: '/pages/customer/list' }); }
function goAppointment() { uni.switchTab({ url: '/pages/appointment/list' }); }
function goPlan() { uni.navigateTo({ url: '/pages/plan/list' }); }
function goReport() { uni.navigateTo({ url: '/pages/report/list' }); }
</script>

<style lang="scss" scoped>
.dashboard { min-height: 100vh; padding: 16px 16px 100px; background: #0f172a; }
.user-bar { display: flex; align-items: center; gap: 12px; padding: 16px; background: linear-gradient(135deg, rgba(16,185,129,0.2), rgba(14,165,233,0.1)); border-radius: 16px; margin-bottom: 16px; border: 1px solid rgba(16,185,129,0.3); }
.user-avatar { width: 50px; height: 50px; border-radius: 50%; background: linear-gradient(135deg, #10b981, #0ea5e9); display: flex; align-items: center; justify-content: center; color: #fff; font-size: 20px; font-weight: bold; }
.user-info { flex: 1; }
.user-name { color: #fff; font-size: 18px; font-weight: 600; display: block; }
.user-role { color: #94a3b8; font-size: 12px; display: block; }
.stats-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 16px; }
.stat-card { padding: 16px; text-align: center; border-radius: 12px; background: rgba(30,41,59,0.6); border: 1px solid rgba(255,255,255,0.05); }
.stat-num { color: #fff; font-size: 24px; font-weight: 700; display: block; }
.stat-label { color: #94a3b8; font-size: 12px; margin-top: 4px; display: block; }
.quick-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px; padding: 16px; background: rgba(30,41,59,0.5); border-radius: 16px; margin-bottom: 16px; }
.qa { display: flex; flex-direction: column; align-items: center; gap: 6px; }
.qa-icon { font-size: 28px; }
.qa text:last-child { color: #cbd5e0; font-size: 12px; }
.section { padding: 16px; border-radius: 12px; background: rgba(30,41,59,0.6); border: 1px solid rgba(255,255,255,0.05); }
.section-title { color: #fff; font-size: 15px; font-weight: 600; margin-bottom: 12px; display: block; }
.empty { padding: 30px 0; text-align: center; color: #64748b; }
.appt { display: flex; align-items: center; gap: 12px; padding: 12px 0; border-bottom: 1px solid rgba(255,255,255,0.05); }
.appt-time { color: #10b981; font-size: 16px; font-weight: 600; min-width: 60px; }
.appt-info { flex: 1; }
.appt-name { color: #fff; font-size: 15px; display: block; }
.appt-svc { color: #94a3b8; font-size: 12px; }
.appt-st { padding: 2px 10px; border-radius: 12px; font-size: 11px; }
.st-PENDING { background: rgba(245,158,11,0.2); color: #fbbf24; }
.st-CONFIRMED { background: rgba(16,185,129,0.2); color: #34d399; }
.st-IN_PROGRESS { background: rgba(16,185,129,0.2); color: #34d399; }
</style>
