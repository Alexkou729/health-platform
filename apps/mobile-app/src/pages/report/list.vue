<template>
<view class="page">
<view v-if="loading" class="empty">加载中...</view>
<view v-else-if="items.length === 0" class="empty">暂无检测报告</view>
<view v-for="r in items" :key="r.id" class="report" @click="goDetail(r.id)">
  <view class="head">
    <text class="title">{{ r.title }}</text>
    <view class="score" :style="{ color: scoreColor(r.score) }">{{ r.score }}</view>
  </view>
  <view class="meta">
    <text class="customer">{{ r.customer?.name || '客户' }}</text>
    <text v-if="r.isDemo" class="demo">演示数据</text>
    <text class="time">{{ formatDate(r.createdAt) }}</text>
  </view>
  <view class="conclusion">{{ r.conclusion || '暂无结论' }}</view>
</view>
</view>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { onShow, onReachBottom } from '@dcloudio/uni-app';
import { reportApi } from '../../api/index.js';
const items = ref([]); const page = ref(1); const total = ref(0); const loading = ref(false);
async function load(reset = true) {
  if (loading.value) return;
  if (reset) page.value = 1;
  loading.value = true;
  try {
    const res = await reportApi.list({ page: page.value, pageSize: 20 });
    items.value = reset ? (res.items || []) : [...items.value, ...(res.items || [])];
    total.value = res.total || 0;
  } catch (e) {
    console.error('报告列表加载失败', e);
    uni.showToast({ title: '加载失败', icon: 'none' });
  } finally {
    loading.value = false;
  }
}
function goDetail(id) { uni.navigateTo({ url: '/pages/report/detail?id=' + id }); }
function scoreColor(s) { return s >= 85 ? '#34d399' : s >= 70 ? '#fbbf24' : '#f87171'; }
function formatDate(d) { return d ? new Date(d).toLocaleDateString('zh-CN') : '-'; }
onMounted(() => load());
onShow(() => load());
onReachBottom(() => {
  if (items.value.length < total.value) { page.value += 1; load(false); }
});
</script>

<style lang="scss" scoped>
.page { min-height: 100vh; padding: 16px 16px 100px; background: #0f172a; }
.empty { padding: 60px 0; text-align: center; color: #64748b; }
.report { padding: 16px; background: rgba(30,41,59,0.6); border-radius: 12px; margin-bottom: 12px; }
.head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
.title { color: #fff; font-size: 16px; font-weight: 600; flex: 1; }
.score { font-size: 24px; font-weight: 700; }
.meta { display: flex; gap: 10px; align-items: center; margin-bottom: 8px; }
.customer { color: #cbd5e0; font-size: 13px; }
.demo { padding: 2px 8px; background: rgba(245,158,11,0.2); color: #fbbf24; border-radius: 10px; font-size: 11px; }
.time { color: #64748b; font-size: 12px; margin-left: auto; }
.conclusion { color: #94a3b8; font-size: 12px; line-height: 1.5; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
</style>
