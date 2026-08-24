<template>
<view class="page">
<view v-if="items.length === 0" class="empty">暂无调理方案</view>
<view v-for="p in items" :key="p.id" class="plan" @click="goDetail(p.id)">
  <view class="head">
    <text class="title">{{ p.title }}</text>
    <text class="status" :class="'s-' + p.status">{{ statusText(p.status) }}</text>
  </view>
  <text class="customer">{{ p.customer?.name }} · {{ constitutionText(p.constitution) }}</text>
  <text v-if="p.summary" class="summary">{{ p.summary }}</text>
  <view class="foot"><text class="price">¥{{ p.totalPrice || 0 }}</text><text class="time">{{ formatDate(p.createdAt) }}</text></view>
</view>
</view>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import { planApi } from '../../api/index.js';
const items = ref([]);
async function load() {
  try { const res = await planApi.list({ pageSize: 50 }); items.value = res.items || []; }
  catch (e) { console.error('调理方案加载失败', e); uni.showToast({ title: '加载失败', icon: 'none' }); }
}
function goDetail(id) { uni.navigateTo({ url: '/pages/plan/detail?id=' + id }); }
function statusText(s) { return { DRAFT: '草稿', ACTIVE: '进行中', COMPLETED: '已完成', CANCELLED: '已取消' }[s] || s; }
function constitutionText(c) { return { BALANCED: '平和', QI_DEFICIENCY: '气虚', YANG_DEFICIENCY: '阳虚', YIN_DEFICIENCY: '阴虚', PHLEGM_DAMPNESS: '痰湿', DAMPNESS_HEAT: '湿热', BLOOD_STASIS: '血瘀', QI_STAGNATION: '气郁', SPECIAL: '特禀' }[c] || '未分类'; }
function formatDate(d) { return d ? new Date(d).toLocaleDateString('zh-CN') : '-'; }
onMounted(load); onShow(load);
</script>

<style lang="scss" scoped>
.page { min-height: 100vh; padding: 16px 16px 100px; background: #0f172a; }
.empty { padding: 60px 0; text-align: center; color: #64748b; }
.plan { padding: 16px; background: rgba(30,41,59,0.6); border-radius: 12px; margin-bottom: 12px; }
.head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; }
.title { color: #fff; font-size: 16px; font-weight: 600; flex: 1; }
.status { padding: 2px 10px; border-radius: 10px; font-size: 11px; background: rgba(16,185,129,0.2); color: #34d399; }
.s-ACTIVE { background: rgba(16,185,129,0.2); color: #34d399; }
.s-COMPLETED { background: rgba(148,163,184,0.2); color: #cbd5e0; }
.customer { color: #34d399; font-size: 13px; display: block; margin-bottom: 6px; }
.summary { color: #94a3b8; font-size: 12px; display: block; margin-bottom: 8px; }
.foot { display: flex; justify-content: space-between; align-items: center; }
.price { color: #fbbf24; font-size: 18px; font-weight: 700; }
.time { color: #64748b; font-size: 12px; }
</style>
