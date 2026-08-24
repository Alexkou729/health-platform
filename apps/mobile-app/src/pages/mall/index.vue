<template>
<view class="page">
<view class="tabs">
  <text v-for="t in cats" :key="t.value" :class="['tab', cat === t.value ? 'active' : '']" @click="setCat(t.value)">{{ t.label }}</text>
</view>
<view v-if="products.length === 0" class="empty">暂无商品</view>
<view v-for="p in products" :key="p.id" class="product">
  <view class="p-info">
    <text class="p-name">{{ p.name }}</text>
    <text class="p-store">{{ p.store?.name }}</text>
    <text class="p-desc">{{ p.description || '' }}</text>
    <view class="p-bottom">
      <text class="p-price">¥{{ p.price }}</text>
      <text v-if="p.originalPrice" class="p-orig">¥{{ p.originalPrice }}</text>
      <button class="buy-btn" @click="buy(p)">购买</button>
    </view>
  </view>
</view>
</view>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { clientApi } from '../../api/index.js';
const products = ref([]); const cat = ref('');
const cats = [
  { label: '全部', value: '' },
  { label: '保健品', value: 'HEALTH' },
  { label: '调理包', value: 'CARE' },
  { label: '保健用品', value: 'DEVICE' },
  { label: '其他', value: 'OTHER' },
];
async function load() {
  try { products.value = await clientApi.products(cat.value || undefined); }
  catch (e) { console.error('商品加载失败', e); uni.showToast({ title: '加载失败', icon: 'none' }); }
}
function setCat(c) { cat.value = c; load(); }
function buy(p) {
  if (!uni.getStorageSync('client_token')) { uni.showToast({ title: '请先登录', icon: 'none' }); return; }
  uni.showModal({
    title: '购买 ' + p.name, content: '确认购买？价格 ¥' + p.price,
    success: async (r) => {
      if (!r.confirm) return;
      try {
        await clientApi.createMallOrder({ items: [{ productId: p.id, quantity: 1 }] });
        uni.showToast({ title: '下单成功，等待门店处理' });
      } catch (e) { uni.showToast({ title: e.message || '下单失败', icon: 'none' }); }
    },
  });
}
onMounted(load);
</script>

<style lang="scss" scoped>
.page { min-height: 100vh; padding: 16px 16px 100px; background: #0a0e27; }
.tabs { display: flex; gap: 8px; margin-bottom: 16px; overflow-x: auto; }
.tab { padding: 8px 16px; background: rgba(30,41,59,0.6); color: #94a3b8; border-radius: 16px; font-size: 13px; white-space: nowrap; }
.tab.active { background: linear-gradient(135deg, #10b981, #0ea5e9); color: #fff; }
.empty { padding: 60px 0; text-align: center; color: #64748b; }
.product { padding: 16px; background: rgba(30,41,59,0.6); border-radius: 12px; margin-bottom: 12px; }
.p-name { color: #fff; font-size: 16px; font-weight: 600; display: block; }
.p-store { color: #8b9bf5; font-size: 12px; display: block; margin: 4px 0; }
.p-desc { color: #94a3b8; font-size: 12px; display: block; margin-bottom: 8px; }
.p-bottom { display: flex; align-items: center; gap: 8px; }
.p-price { color: #fbbf24; font-size: 18px; font-weight: 700; }
.p-orig { color: #64748b; font-size: 12px; text-decoration: line-through; }
.buy-btn { margin-left: auto; padding: 6px 16px; background: #10b981; color: #fff; border-radius: 16px; border: none; font-size: 13px; }
</style>
