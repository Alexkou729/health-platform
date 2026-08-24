<template>
<view class="page">
<view class="filter-bar">
<text v-for="t in tabs" :key="t.value" :class="['tab', status === t.value ? 'active' : '']" @click="setStatus(t.value)">{{ t.label }}</text>
</view>
<view v-if="items.length === 0" class="empty">暂无预约</view>
<view v-for="a in items" :key="a.id" class="appt">
<view class="time-block"><text class="date">{{ formatDate(a.scheduledAt) }}</text><text class="time">{{ formatTime(a.scheduledAt) }}</text></view>
<view class="info"><text class="name">{{ a.customer?.name }}</text><text class="svc">{{ a.serviceName }}</text><text class="staff">顾问: {{ a.staff?.name || '待指派' }}</text></view>
<view class="actions"><text class="status" :class="'s-' + a.status">{{ statusText(a.status) }}</text><button v-if="a.status === 'PENDING'" class="btn" @click="confirm(a.id)">确认</button></view>
</view>
</view>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import { appointmentApi } from '../../api/index.js';
const items = ref([]); const status = ref('');
const tabs = [{ label: '全部', value: '' }, { label: '待确认', value: 'PENDING' }, { label: '已确认', value: 'CONFIRMED' }, { label: '已完成', value: 'COMPLETED' }];
async function load() { try { const res = await appointmentApi.list({ status: status.value, pageSize: 50 }); items.value = res.items || []; } catch (e) {} }
function setStatus(s) { status.value = s; load(); }
function formatDate(d) { return d ? new Date(d).toLocaleDateString('zh-CN') : '-'; }
function formatTime(d) { return d ? new Date(d).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }) : ''; }
function statusText(s) { return { PENDING: '待确认', CONFIRMED: '已确认', IN_PROGRESS: '进行中', COMPLETED: '已完成', CANCELLED: '已取消' }[s] || s; }
async function confirm(id) { try { await appointmentApi.confirm(id); uni.showToast({ title: '已确认' }); load(); } catch (e) {} }
onMounted(load); onShow(load);
</script>

<style lang="scss" scoped>
.page { min-height: 100vh; padding: 16px 16px 100px; background: #0f172a; }
.filter-bar { display: flex; gap: 8px; margin-bottom: 16px; overflow-x: auto; }
.tab { padding: 8px 16px; background: rgba(30,41,59,0.6); color: #94a3b8; border-radius: 16px; font-size: 13px; white-space: nowrap; }
.tab.active { background: linear-gradient(135deg, #10b981, #0ea5e9); color: #fff; }
.empty { padding: 60px 0; text-align: center; color: #64748b; }
.appt { display: flex; gap: 12px; padding: 16px; background: rgba(30,41,59,0.6); border-radius: 12px; margin-bottom: 8px; }
.time-block { display: flex; flex-direction: column; align-items: center; min-width: 50px; padding: 8px; background: rgba(16,185,129,0.15); border-radius: 8px; }
.date { color: #34d399; font-size: 11px; }
.time { color: #34d399; font-size: 16px; font-weight: 700; }
.info { flex: 1; }
.name { color: #fff; font-size: 15px; font-weight: 500; display: block; }
.svc { color: #cbd5e0; font-size: 13px; display: block; }
.staff { color: #94a3b8; font-size: 12px; display: block; }
.actions { display: flex; flex-direction: column; align-items: flex-end; gap: 8px; }
.status { padding: 2px 10px; border-radius: 12px; font-size: 11px; }
.s-PENDING { background: rgba(245,158,11,0.2); color: #fbbf24; }
.s-CONFIRMED { background: rgba(16,185,129,0.2); color: #34d399; }
.s-IN_PROGRESS { background: rgba(16,185,129,0.2); color: #34d399; }
.s-COMPLETED { background: rgba(148,163,184,0.2); color: #cbd5e0; }
.btn { padding: 6px 12px; background: #10b981; color: #fff; border-radius: 12px; border: none; font-size: 11px; }
</style>
