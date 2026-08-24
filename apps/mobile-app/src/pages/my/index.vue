<template>
<view class="page">
<view v-if="!clientToken" class="login-card">
  <text class="brand">🏥 健康管理系统</text>
  <text class="subtitle">手机号登录 · 绑定你的健康档案</text>
  <input v-model="phone" type="number" placeholder="请输入手机号" class="ipt" maxlength="11" />
  <view class="code-row">
    <input v-model="code" type="number" placeholder="验证码" class="ipt code-ipt" maxlength="6" />
    <button class="code-btn" :disabled="countdown > 0" @click="sendCode">{{ countdown > 0 ? countdown + 's' : '获取验证码' }}</button>
  </view>
  <button class="login-btn" @click="handleLogin">登 录</button>
</view>
<view v-else>
  <view class="user-card">
    <view class="avatar">{{ clientName[0] || '客' }}</view>
    <view>
      <text class="name">{{ clientName }}</text>
      <text class="role">{{ phone }}</text>
    </view>
  </view>
  <view class="menu">
    <view class="menu-item" @click="go('/pages/report/list')"><text class="mi-icon">📊</text><text class="mi-text">我的报告</text><text class="arrow">›</text></view>
    <view class="menu-item" @click="go('/pages/plan/list')"><text class="mi-icon">📋</text><text class="mi-text">我的调理方案</text><text class="arrow">›</text></view>
    <view class="menu-item" @click="go('/pages/mall/index')"><text class="mi-icon">🛒</text><text class="mi-text">健康商城</text><text class="arrow">›</text></view>
    <view class="menu-item" @click="go('/pages/home-service/index')"><text class="mi-icon">🏠</text><text class="mi-text">上门服务</text><text class="arrow">›</text></view>
    <view class="menu-item" @click="go('/pages/order/list')"><text class="mi-icon">📦</text><text class="mi-text">我的订单</text><text class="arrow">›</text></view>
    <view class="menu-item danger" @click="logout"><text class="mi-icon">🚪</text><text class="mi-text">退出登录</text><text class="arrow">›</text></view>
  </view>
</view>
</view>
</template>

<script setup>
import { ref, computed } from 'vue';
import { clientAuth } from '../../api/index.js';
const phone = ref('');
const code = ref('');
const countdown = ref(0);
const clientToken = ref(uni.getStorageSync('client_token') || '');
const clientName = ref(uni.getStorageSync('client_name') || '');
let timer;
async function sendCode() {
  if (!/^1\d{10}$/.test(phone.value)) { uni.showToast({ title: '请输入正确手机号', icon: 'none' }); return; }
  try { await clientAuth.sendCode(phone.value); uni.showToast({ title: '验证码已发送' }); countdown.value = 60; timer = setInterval(() => { countdown.value--; if (countdown.value <= 0) clearInterval(timer); }, 1000); }
  catch (e) { uni.showToast({ title: e.message || '发送失败', icon: 'none' }); }
}
async function handleLogin() {
  if (!/^1\d{10}$/.test(phone.value)) { uni.showToast({ title: '请输入正确手机号', icon: 'none' }); return; }
  if (!code.value) { uni.showToast({ title: '请输入验证码', icon: 'none' }); return; }
  try {
    const res = await clientAuth.login(phone.value, code.value);
    clientToken.value = res.token;
    clientName.value = res.customer?.name || '微信用户';
    uni.setStorageSync('client_token', res.token);
    uni.setStorageSync('client_name', clientName.value);
    uni.showToast({ title: '登录成功' });
  } catch (e) { uni.showToast({ title: e.message || '登录失败', icon: 'none' }); }
}
function go(url) { uni.navigateTo({ url }); }
function logout() { clientToken.value = ''; uni.removeStorageSync('client_token'); uni.removeStorageSync('client_name'); uni.showToast({ title: '已退出' }); }
</script>

<style lang="scss" scoped>
.page { min-height: 100vh; padding: 16px; background: #0a0e27; }
.login-card { padding: 40px 24px; background: rgba(30,41,59,0.6); border-radius: 16px; }
.brand { display: block; text-align: center; font-size: 24px; font-weight: 700; color: #fff; margin-bottom: 8px; }
.subtitle { display: block; text-align: center; color: #94a3b8; font-size: 13px; margin-bottom: 32px; }
.ipt { display: block; width: 100%; padding: 14px 16px; background: rgba(255,255,255,0.05); border-radius: 10px; color: #fff; border: 1px solid rgba(255,255,255,0.08); margin-bottom: 12px; box-sizing: border-box; }
.code-row { display: flex; gap: 8px; margin-bottom: 12px; }
.code-ipt { flex: 1; margin-bottom: 0; }
.code-btn { padding: 0 16px; background: #10b981; color: #fff; border-radius: 10px; border: none; font-size: 13px; line-height: 44px; height: 44px; white-space: nowrap; }
.login-btn { display: block; width: 100%; padding: 14px; background: linear-gradient(135deg, #10b981, #0ea5e9); color: #fff; border-radius: 10px; border: none; font-size: 16px; font-weight: 600; margin-top: 8px; }
.user-card { display: flex; align-items: center; gap: 16px; padding: 20px; background: linear-gradient(135deg, rgba(16,185,129,0.2), rgba(14,165,233,0.1)); border-radius: 16px; margin-bottom: 16px; }
.avatar { width: 60px; height: 60px; border-radius: 50%; background: linear-gradient(135deg, #10b981, #0ea5e9); display: flex; align-items: center; justify-content: center; color: #fff; font-size: 24px; font-weight: 700; }
.name { color: #fff; font-size: 18px; font-weight: 600; display: block; }
.role { color: #94a3b8; font-size: 13px; display: block; margin-top: 4px; }
.menu { background: rgba(30,41,59,0.6); border-radius: 16px; overflow: hidden; }
.menu-item { display: flex; align-items: center; gap: 12px; padding: 16px; border-bottom: 1px solid rgba(255,255,255,0.05); }
.menu-item:last-child { border: none; }
.menu-item.danger .mi-text { color: #ef4444; }
.mi-icon { font-size: 20px; }
.mi-text { flex: 1; color: #cbd5e0; }
.arrow { color: #64748b; font-size: 18px; }
</style>
