<template>
<div class="app">
<div v-if="loading">
<div class="loading-circle"></div>
<p>加载报告中...</p>
</div>
<div v-else-if="error" class="error"><p>😢 {{ error }}</p></div>
<div v-else-if="report">
<div class="brand-bar"><h1>🏥 健康管理系统</h1><p>智能检测 · 精准评估 · 科学调理</p></div>
<div class="score-circle" :style="{ background: scoreColor }">
<div class="score-num">{{ report.score }}</div>
<div class="score-label">综合评分</div>
</div>
<div class="customer-info">
<div class="avatar">{{ report.customer?.name?.[0] }}</div>
<div class="info">
<div class="name">{{ report.customer?.name }} {{ genderSymbol }} {{ report.customer?.age }}岁</div>
<div class="meta">{{ report.title }} · {{ formatDate(report.createdAt) }}</div>
</div>
</div>
<div class="tabs">
<div :class="['tab', tab === 'conclusion' ? 'active' : '']" @click="tab = 'conclusion'">评估结论</div>
<div :class="['tab', tab === 'indicators' ? 'active' : '']" @click="tab = 'indicators'">指标 ({{ (report.indicators || []).length }})</div>
<div :class="['tab', tab === 'suggestions' ? 'active' : '']" @click="tab = 'suggestions'">健康建议</div>
</div>
<div v-if="tab === 'conclusion'" class="section">
<div class="section-title">📋 评估结论</div>
<div class="conclusion">{{ report.conclusion }}</div>
</div>
<div v-if="tab === 'indicators'" class="section">
<div class="section-title">📊 关键指标</div>
<div v-for="(ind, i) in (report.indicators || []).slice(0, 20)" :key="i" class="indicator">
<div class="name">{{ ind.name }}</div>
<div class="value" :class="'status-' + ind.status">{{ ind.value }} {{ ind.unit }}</div>
<div class="status" :class="'status-' + ind.status">{{ statusText(ind.status) }}</div>
</div>
</div>
<div v-if="tab === 'suggestions'" class="section">
<div class="section-title">💡 健康建议</div>
<div v-for="(s, i) in (report.suggestions || [])" :key="i" class="suggestion">{{ s }}</div>
<div v-if="report.warnings && report.warnings.length" class="section-title" style="margin-top:16px">⚠️ 重点关注</div>
<div v-for="(w, i) in report.warnings" :key="i" class="warning">{{ w }}</div>
</div>
<div class="disclaimer">⚠️ 本检测结果仅供参考，不作为诊断结论。请咨询专业医师。</div>
<a href="javascript:;" @click="bookConsult" class="action-btn">📞 预约健康顾问解读</a>
<a href="javascript:;" @click="shareTo" class="action-btn" style="background: linear-gradient(135deg, #10b981, #059669); margin-top: -10px;">💚 分享给好友</a>
</div>
</div>
</template>
<script setup>
import { ref, computed, inject, onMounted } from 'vue';
const api = inject('api');
const report = ref(null);
const loading = ref(true);
const error = ref('');
const tab = ref('conclusion');
const genderSymbol = computed(() => report.value?.customer?.gender === 1 ? '♂' : '♀');
const scoreColor = computed(() => {
  const s = report.value?.score || 0;
  return s >= 85 ? 'linear-gradient(135deg, #10b981, #059669)' : s >= 70 ? 'linear-gradient(135deg, #f59e0b, #d97706)' : 'linear-gradient(135deg, #ef4444, #dc2626)';
});
function formatDate(d) { return d ? new Date(d).toLocaleDateString('zh-CN') : '-'; }
function statusText(s) { return ['正常','偏高','偏低','过高','过低'][s] || '未知'; }
onMounted(async () => {
  const params = new URLSearchParams(location.hash.split('?')[1] || location.search);
  const id = params.get('id');
  if (!id) { error.value = '报告ID缺失，请检查链接'; loading.value = false; return; }
  try { const res = await api.get('/reports/' + id); report.value = res; } catch (e) { error.value = e.message || '加载失败，请稍后重试'; }
  loading.value = false;
});
function bookConsult() {
  if (navigator.share) navigator.share({ title: '预约健康咨询', text: '我想预约健康顾问解读报告', url: location.href });
  else alert('请联系您的健康顾问：400-888-8888');
}
function shareTo() {
  if (navigator.share) navigator.share({ title: '我的健康报告', text: '查看我的健康检测报告', url: location.href });
  else { navigator.clipboard?.writeText(location.href); alert('链接已复制，分享给好友吧！'); }
}
</script>
