<template>
<view class="page">
<view v-if="services.length === 0" class="empty">暂无上门服务</view>
<view v-for="s in services" :key="s.id" class="svc">
  <view class="s-info">
    <text class="s-name">{{ s.name }}</text>
    <text class="s-desc">{{ s.description || '' }} · {{ s.durationMin }}分钟</text>
    <text class="s-price">¥{{ s.price }}</text>
  </view>
  <button class="book-btn" @click="book(s)">预约</button>
</view>
</view>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { clientApi } from '../../api/index.js';
const services = ref([]);
async function load() {
  try { services.value = await clientApi.homeServices(); }
  catch (e) { console.error('服务加载失败', e); uni.showToast({ title: '加载失败', icon: 'none' }); }
}
function book(s) {
  if (!uni.getStorageSync('client_token')) { uni.showToast({ title: '请先登录', icon: 'none' }); return; }
  uni.showModal({
    title: '预约 ' + s.name,
    content: '预约时间默认为明天，地址和联系电话请在下单后联系门店确认。确认预约？价格 ¥' + s.price,
    success: async (r) => {
      if (!r.confirm) return;
      try {
        await clientApi.createHomeServiceOrder({
          serviceId: s.id,
          scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          address: '请电话确认',
        });
        uni.showToast({ title: '预约成功，等待门店接单' });
      } catch (e) { uni.showToast({ title: e.message || '预约失败', icon: 'none' }); }
    },
  });
}
onMounted(load);
</script>

<style lang="scss" scoped>
.page { min-height: 100vh; padding: 16px 16px 100px; background: #0a0e27; }
.empty { padding: 60px 0; text-align: center; color: #64748b; }
.svc { display: flex; align-items: center; padding: 16px; background: rgba(30,41,59,0.6); border-radius: 12px; margin-bottom: 12px; }
.s-info { flex: 1; }
.s-name { color: #fff; font-size: 16px; font-weight: 600; display: block; }
.s-desc { color: #94a3b8; font-size: 12px; display: block; margin: 4px 0; }
.s-price { color: #fbbf24; font-size: 18px; font-weight: 700; }
.book-btn { padding: 8px 18px; background: #10b981; color: #fff; border-radius: 18px; border: none; font-size: 14px; }
</style>
