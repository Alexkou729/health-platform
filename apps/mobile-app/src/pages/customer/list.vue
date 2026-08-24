<template>
<view class="page">
<view class="search-bar">
<input class="search-input" v-model="keyword" placeholder="搜索姓名/手机" @confirm="load" />
</view>
<view v-if="items.length === 0" class="empty">暂无客户</view>
<view v-for="c in items" :key="c.id" class="customer" @click="goDetail(c.id)">
<view class="avatar">{{ c.name?.[0] }}</view>
<view class="info"><text class="name">{{ c.name }}</text><text class="phone">{{ c.phone }}</text></view>
<view class="meta"><text class="gender" :class="c.gender === 1 ? 'm' : 'f'">{{ c.gender === 1 ? '男' : '女' }} {{ c.age || '' }}</text><text class="level">{{ getLevel(c.level) }}</text></view>
</view>
</view>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import { customerApi } from '../../api/index.js';
const items = ref([]); const keyword = ref('');
async function load() { try { const res = await customerApi.list({ keyword: keyword.value, pageSize: 50 }); items.value = res.items || []; } catch (e) {} }
function getLevel(l) { return ({ BLACK: '黑金', DIAMOND: '钻石', GOLD: '黄金', SILVER: '白银', BRONZE: '青铜' }[l] || '青铜'); }
function goDetail(id) { uni.navigateTo({ url: '/pages/customer/detail?id=' + id }); }
onMounted(load); onShow(load);
</script>

<style lang="scss" scoped>
.page { min-height: 100vh; padding: 16px 16px 100px; background: #0f172a; }
.search-bar { margin-bottom: 16px; }
.search-input { width: 100%; padding: 12px 16px; background: rgba(30,41,59,0.6); border-radius: 12px; color: #fff; border: 1px solid rgba(255,255,255,0.05); box-sizing: border-box; }
.empty { padding: 60px 0; text-align: center; color: #64748b; }
.customer { display: flex; align-items: center; gap: 12px; padding: 16px; background: rgba(30,41,59,0.6); border-radius: 12px; margin-bottom: 8px; }
.avatar { width: 44px; height: 44px; border-radius: 50%; background: linear-gradient(135deg, #10b981, #0ea5e9); display: flex; align-items: center; justify-content: center; color: #fff; font-weight: 600; }
.info { flex: 1; }
.name { color: #fff; font-size: 15px; font-weight: 500; display: block; }
.phone { color: #94a3b8; font-size: 12px; display: block; }
.meta { display: flex; flex-direction: column; align-items: flex-end; gap: 4px; }
.gender { font-size: 11px; padding: 2px 8px; border-radius: 8px; }
.m { background: rgba(16,185,129,0.2); color: #34d399; }
.f { background: rgba(236,72,153,0.2); color: #f472b6; }
.level { color: #fbbf24; font-size: 11px; }
</style>
