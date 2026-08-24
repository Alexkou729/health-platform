<template>
<view class="page">
<view v-if="!plan" class="empty">方案不存在</view>
<template v-else>
  <view class="hero">
    <text class="title">{{ plan.title }}</text>
    <text class="customer">{{ plan.customer?.name }} · {{ constitutionText(plan.constitution) }}</text>
    <text class="price">¥{{ plan.totalPrice || 0 }}</text>
  </view>
  <view class="card" v-if="plan.diagnosis">
    <text class="card-title">中医辨证</text>
    <text class="body">{{ plan.diagnosis }}</text>
  </view>
  <view class="card" v-if="plan.summary">
    <text class="card-title">方案摘要</text>
    <text class="body">{{ plan.summary }}</text>
  </view>
  <view class="card" v-if="adviceText">
    <text class="card-title">医嘱建议</text>
    <text class="body">{{ adviceText }}</text>
  </view>
  <view class="card">
    <text class="card-title">调理项目（{{ (plan.items || []).length }}）</text>
    <view v-for="i in plan.items || []" :key="i.id" class="item">
      <text class="item-name">{{ i.name }}</text>
      <text class="item-meta">{{ i.frequency }} · {{ i.duration }}分钟 · ×{{ i.quantity }}</text>
      <text class="item-price">¥{{ i.price }}</text>
    </view>
    <text v-if="!(plan.items || []).length" class="empty-text">暂无项目</text>
  </view>
</template>
</view>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { planApi } from '../../api/index.js';
const plan = ref(null);
const adviceText = computed(() => {
  const a = plan.value?.advice;
  if (!a) return '';
  if (typeof a === 'string') { try { return Object.values(JSON.parse(a)).filter(Boolean).join('\n'); } catch { return a; } }
  return Object.values(a).filter(Boolean).join('\n');
});
function constitutionText(c) { return { BALANCED: '平和', QI_DEFICIENCY: '气虚', YANG_DEFICIENCY: '阳虚', YIN_DEFICIENCY: '阴虚', PHLEGM_DAMPNESS: '痰湿', DAMPNESS_HEAT: '湿热', BLOOD_STASIS: '血瘀', QI_STAGNATION: '气郁', SPECIAL: '特禀' }[c] || '未分类'; }
onMounted(async () => {
  const pages = getCurrentPages();
  const id = pages[pages.length - 1].options?.id;
  if (!id) return;
  try { plan.value = await planApi.detail(id); }
  catch (e) { console.error('方案详情加载失败', e); uni.showToast({ title: '加载失败', icon: 'none' }); }
});
</script>

<style lang="scss" scoped>
.page { min-height: 100vh; padding: 16px 16px 100px; background: #0f172a; }
.empty { padding: 60px 0; text-align: center; color: #64748b; }
.hero { padding: 28px 20px; text-align: center; background: linear-gradient(135deg, rgba(16,185,129,0.25), rgba(14,165,233,0.15)); border-radius: 16px; margin-bottom: 12px; }
.title { color: #fff; font-size: 20px; font-weight: 700; display: block; }
.customer { color: #34d399; font-size: 13px; display: block; margin: 8px 0; }
.price { color: #fbbf24; font-size: 24px; font-weight: 700; display: block; }
.card { padding: 16px; border-radius: 12px; background: rgba(30,41,59,0.6); margin-bottom: 12px; }
.card-title { color: #fff; font-size: 15px; font-weight: 600; margin-bottom: 12px; display: block; }
.body { color: #cbd5e0; font-size: 14px; line-height: 1.7; white-space: pre-wrap; }
.item { display: flex; align-items: center; padding: 10px 0; border-bottom: 1px solid rgba(255,255,255,0.05); }
.item-name { color: #fff; font-size: 14px; flex: 1; }
.item-meta { color: #94a3b8; font-size: 12px; }
.item-price { color: #fbbf24; font-size: 14px; margin-left: 10px; }
.empty-text { color: #64748b; font-size: 13px; text-align: center; display: block; padding: 12px 0; }
</style>
