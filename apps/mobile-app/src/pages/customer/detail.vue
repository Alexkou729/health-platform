<template>
<view class="page" v-if="customer">
<view class="card"><view class="avatar">{{ customer.name?.[0] }}</view><view class="info"><text class="name">{{ customer.name }} {{ customer.gender === 1 ? '♂' : '♀' }} {{ customer.age || '' }}岁</text><text class="phone">{{ customer.phone }}</text></view></view>
<view class="card">
<text class="ct">基本信息</text>
<text class="cb">身高: {{ customer.heightCm || '-' }} cm</text>
<text class="cb">体重: {{ customer.weightKg || '-' }} kg</text>
<text class="cb">检测次数: {{ customer.totalDetections || 0 }}</text>
<text class="cb">累计消费: ¥{{ customer.totalSpent || 0 }}</text>
</view>
<button class="primary-btn" @click="goHistory">查看检测历史</button>
</view>
<view v-else class="loading">加载中...</view>
</template>
<script setup>
import { ref, onMounted } from 'vue';
import { customerApi } from '../../api/index.js';
const customer = ref(null);
async function load() { try { const pages = getCurrentPages(); const id = pages[pages.length - 1].options.id; customer.value = await customerApi.detail(id); } catch (e) {} }
function goHistory() { uni.navigateTo({ url: '/pages/report/list?customerId=' + customer.value.id }); }
onMounted(load);
</script>
<style lang="scss" scoped>
.page { min-height: 100vh; padding: 16px; background: #0f172a; }
.loading { padding: 60px 0; text-align: center; color: #64748b; }
.card { padding: 16px; background: rgba(30,41,59,0.6); border-radius: 12px; margin-bottom: 12px; display: flex; align-items: center; gap: 16px; }
.avatar { width: 60px; height: 60px; border-radius: 50%; background: linear-gradient(135deg, #10b981, #0ea5e9); display: flex; align-items: center; justify-content: center; color: #fff; font-size: 24px; font-weight: 700; }
.info { flex: 1; }
.name { color: #fff; font-size: 18px; font-weight: 600; display: block; }
.phone { color: #94a3b8; font-size: 13px; display: block; margin-top: 4px; }
.ct { color: #fff; font-size: 15px; font-weight: 600; margin-bottom: 12px; display: block; }
.cb { color: #cbd5e0; font-size: 14px; line-height: 2; display: block; }
.primary-btn { width: 100%; padding: 14px; background: linear-gradient(135deg, #10b981, #0ea5e9); color: #fff; border-radius: 12px; border: none; font-size: 15px; font-weight: 600; margin-top: 16px; }
</style>
