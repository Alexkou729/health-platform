<template>
<view class="page">
<view class="tabs">
  <text v-for="t in tabs" :key="t.value" :class="['tab', tab === t.value ? 'active' : '']" @click="setTab(t.value)">{{ t.label }}</text>
</view>
<view v-if="orders.length === 0" class="empty">暂无订单</view>
<view v-for="o in orders" :key="o.id" class="order">
  <view class="o-head"><text class="o-no">{{ o.orderNo }}</text><text class="o-status">{{ statusText(o.status) }}</text></view>
  <view v-if="o.items" class="o-items"><text v-for="i in o.items" :key="i.id" class="o-item">{{ i.name }} ×{{ i.quantity }}</text></view>
  <text v-else class="o-item">{{ o.serviceName }}</text>
  <view class="o-foot"><text class="o-amount">¥{{ o.totalAmount }}</text><text class="o-time">{{ formatDate(o.createdAt) }}</text></view>
</view>
</view>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { clientApi } from '../../api/index.js';
const tab = ref('mall');
const orders = ref([]);
const tabs = [
  { label: '商城订单', value: 'mall' },
  { label: '上门服务', value: 'home' },
];
async function load() {
  try {
    orders.value = tab.value === 'mall' ? await clientApi.mallOrders() : await clientApi.homeServiceOrders();
  } catch (e) { console.error('订单加载失败', e); uni.showToast({ title: '请先登录', icon: 'none' }); }
}
function setTab(t) { tab.value = t; load(); }
function statusText(s) { return { PENDING: '待处理', ASSIGNED: '已派单', ACCEPTED: '已接单', SHIPPED: '已发货', SERVING: '服务中', COMPLETED: '已完成', CANCELLED: '已取消' }[s] || s; }
function formatDate(d) { return d ? new Date(d).toLocaleDateString('zh-CN') : '-'; }
onMounted(load);
</script>

<style lang="scss" scoped>
.page { min-height: 100vh; padding: 16px 16px 100px; background: #0a0e27; }
.tabs { display: flex; gap: 8px; margin-bottom: 16px; }
.tab { padding: 8px 16px; background: rgba(30,41,59,0.6); color: #94a3b8; border-radius: 16px; font-size: 13px; }
.tab.active { background: linear-gradient(135deg, #10b981, #0ea5e9); color: #fff; }
.empty { padding: 60px 0; text-align: center; color: #64748b; }
.order { padding: 16px; background: rgba(30,41,59,0.6); border-radius: 12px; margin-bottom: 12px; }
.o-head { display: flex; justify-content: space-between; margin-bottom: 8px; }
.o-no { color: #64748b; font-size: 12px; }
.o-status { color: #10b981; font-size: 13px; }
.o-items { margin-bottom: 8px; }
.o-item { color: #cbd5e0; font-size: 13px; display: block; padding: 2px 0; }
.o-foot { display: flex; justify-content: space-between; align-items: center; }
.o-amount { color: #fbbf24; font-size: 16px; font-weight: 700; }
.o-time { color: #64748b; font-size: 12px; }
</style>
