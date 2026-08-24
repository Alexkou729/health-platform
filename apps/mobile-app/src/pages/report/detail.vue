<template>
<view class="page">
<view v-if="!report" class="empty">报告不存在</view>
<template v-else>
  <view class="hero">
    <text class="title">{{ report.title }}</text>
    <text class="score" :style="{ color: scoreColor(report.score) }">{{ report.score }}</text>
    <text class="sub">综合健康评分</text>
    <text v-if="report.isDemo" class="demo">演示数据</text>
  </view>
  <view class="card">
    <text class="card-title">评估结论</text>
    <text class="body">{{ report.conclusion || '暂无' }}</text>
  </view>
  <view class="card" v-if="warnings.length">
    <text class="card-title">重点关注</text>
    <text v-for="(w, i) in warnings" :key="i" class="warn">⚠ {{ w }}</text>
  </view>
  <view class="card">
    <text class="card-title">关键指标（{{ indicators.length }}）</text>
    <view v-for="ind in indicators.slice(0, visibleCount)" :key="ind.code" class="ind">
      <text class="ind-name">{{ ind.name }}</text>
      <text class="ind-val" :style="{ color: statusColor(ind.status) }">{{ ind.value }}{{ ind.unit }}</text>
    </view>
    <text v-if="indicators.length > visibleCount" class="more" @click="visibleCount += 20">加载更多（{{ indicators.length - visibleCount }} 项）</text>
  </view>
  <view class="card" v-if="suggestions.length">
    <text class="card-title">健康建议</text>
    <text v-for="(s, i) in suggestions" :key="i" class="sug">✓ {{ s }}</text>
  </view>
  <view class="footer">本结果仅供养生参考，不构成医疗诊断或治疗建议</view>
</template>
</view>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { reportApi } from '../../api/index.js';
const report = ref(null);
const visibleCount = ref(20);
const indicators = computed(() => Array.isArray(report.value?.indicators) ? report.value.indicators : []);
const warnings = computed(() => Array.isArray(report.value?.warnings) ? report.value.warnings : []);
const suggestions = computed(() => Array.isArray(report.value?.suggestions) ? report.value.suggestions : []);
function scoreColor(s) { return s >= 85 ? '#34d399' : s >= 70 ? '#fbbf24' : '#f87171'; }
function statusColor(s) { return s === 0 ? '#34d399' : s >= 3 ? '#f87171' : '#fbbf24'; }
onMounted(async () => {
  const pages = getCurrentPages();
  const id = pages[pages.length - 1].options?.id;
  if (!id) return;
  try { report.value = await reportApi.detail(id); }
  catch (e) { console.error('报告详情加载失败', e); uni.showToast({ title: '加载失败', icon: 'none' }); }
});
</script>

<style lang="scss" scoped>
.page { min-height: 100vh; padding: 16px 16px 100px; background: #0f172a; }
.empty { padding: 60px 0; text-align: center; color: #64748b; }
.hero { padding: 32px 20px; text-align: center; background: linear-gradient(135deg, rgba(16,185,129,0.25), rgba(14,165,233,0.15)); border-radius: 16px; margin-bottom: 12px; }
.title { color: #fff; font-size: 20px; font-weight: 700; display: block; }
.score { font-size: 56px; font-weight: 700; display: block; margin: 8px 0; }
.sub { color: #94a3b8; font-size: 13px; display: block; }
.demo { display: inline-block; margin-top: 8px; padding: 4px 12px; background: rgba(245,158,11,0.2); color: #fbbf24; border-radius: 12px; font-size: 12px; }
.card { padding: 16px; border-radius: 12px; background: rgba(30,41,59,0.6); margin-bottom: 12px; }
.card-title { color: #fff; font-size: 15px; font-weight: 600; margin-bottom: 12px; display: block; }
.body { color: #cbd5e0; font-size: 14px; line-height: 1.7; }
.warn { color: #fca5a5; font-size: 13px; display: block; padding: 4px 0; }
.ind { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,0.05); }
.ind-name { color: #cbd5e0; font-size: 13px; }
.ind-val { font-size: 14px; font-weight: 600; }
.more { color: #64748b; font-size: 12px; text-align: center; display: block; margin-top: 8px; }
.sug { color: #cbd5e0; font-size: 13px; display: block; padding: 4px 0; }
.footer { text-align: center; color: #64748b; font-size: 12px; padding: 20px 0; }
</style>
