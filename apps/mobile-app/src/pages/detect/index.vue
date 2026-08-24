<template>
<view class="page">
<view class="hero">
<text class="title">🔬 智能检测</text>
<text class="subtitle">60秒完成 43 项健康评估</text>
<button class="start-btn" @click="goDetect">开始检测</button>
</view>
<view class="card">
<text class="card-title">连接设备</text>
<text v-if="device" class="device">{{ device.deviceNo }} · {{ device.model }}</text>
<text v-else class="text-sec">未连接设备，将使用模拟器</text>
</view>
<view class="card">
<text class="card-title">最近检测</text>
<view v-if="recent.length === 0" class="empty">暂无记录</view>
<view v-for="r in recent" :key="r.id" class="record"><text>{{ r.customer?.name }}</text><text class="time">{{ formatDate(r.createdAt) }}</text></view>
</view>
</view>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import { detectionApi, deviceApi } from '../../api/index.js';
const device = ref(null); const recent = ref([]);
async function load() { try { const [d, r] = await Promise.all([deviceApi.list(), detectionApi.list({ pageSize: 5 })]); device.value = (d.items || []).find(x => x.status === 1); recent.value = r.items || []; } catch (e) { console.error('检测页加载失败', e); } }
function formatDate(d) { return d ? new Date(d).toLocaleDateString('zh-CN') : '-'; }
function goDetect() { uni.navigateTo({ url: '/pages/detect/process' }); }
onMounted(load); onShow(load);
</script>

<style lang="scss" scoped>
.page { min-height: 100vh; padding: 16px 16px 100px; background: #0f172a; }
.hero { padding: 40px 24px; text-align: center; border-radius: 16px; background: linear-gradient(135deg, rgba(16,185,129,0.2), rgba(14,165,233,0.1)); margin-bottom: 16px; }
.title { color: #fff; font-size: 28px; font-weight: 700; display: block; }
.subtitle { color: #94a3b8; font-size: 14px; margin: 8px 0 24px; display: block; }
.start-btn { background: linear-gradient(135deg, #10b981, #0ea5e9); color: #fff; border-radius: 24px; padding: 14px 48px; font-size: 16px; font-weight: 600; border: none; }
.card { padding: 16px; border-radius: 12px; background: rgba(30,41,59,0.6); margin-bottom: 12px; }
.card-title { color: #fff; font-size: 15px; font-weight: 600; margin-bottom: 12px; display: block; }
.device { color: #cbd5e0; font-size: 14px; }
.empty { padding: 30px 0; text-align: center; color: #64748b; }
.record { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid rgba(255,255,255,0.05); color: #cbd5e0; }
.time { color: #64748b; font-size: 12px; }
.text-sec { color: #94a3b8; }
</style>
