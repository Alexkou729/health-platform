<template>
<view class="page">
<view v-if="!user" class="login-card">
<text class="brand">🏥 健康管理系统</text>
<text class="subtitle">v1.0.0 · SaaS</text>
<input v-model="loginForm.username" placeholder="账号" class="ipt" />
<input v-model="loginForm.password" type="password" placeholder="密码" class="ipt" />
<input v-model="loginForm.apiUrl" placeholder="服务器地址" class="ipt" />
<button class="login-btn" @click="handleLogin">登 录</button>
</view>
<view v-else>
<view class="user-card">
<view class="avatar">{{ user.name?.[0] }}</view>
<view><text class="name">{{ user.name }}</text><text class="role">{{ roleText }}</text></view>
</view>
<view class="menu">
<view class="menu-item" @click="goAbout"><text class="mi-icon">ℹ️</text><text class="mi-text">关于系统</text><text class="arrow">›</text></view>
<view class="menu-item" @click="goHelp"><text class="mi-icon">📖</text><text class="mi-text">使用帮助</text><text class="arrow">›</text></view>
<view class="menu-item danger" @click="logout"><text class="mi-icon">🚪</text><text class="mi-text">退出登录</text><text class="arrow">›</text></view>
</view>
</view>
</view>
</template>

<script setup>
import { ref, computed } from 'vue';
import { useAuthStore } from '../../store/auth.js';
import { setApiBase, getApiBase } from '../../utils/config.js';
const auth = useAuthStore();
const user = computed(() => auth.user);
const roleText = computed(() => ({ SUPER_ADMIN: '超级管理员', STORE_ADMIN: '店长', DOCTOR: '医师', CONSULTANT: '健康顾问', RECEPTIONIST: '前台' }[user.value?.role] || '员工'));
const loginForm = ref({ username: 'admin', password: 'admin123', apiUrl: getApiBase() });
async function handleLogin() { if (!loginForm.value.username) return; setApiBase(loginForm.value.apiUrl); try { await auth.login(loginForm.value.username, loginForm.value.password); uni.showToast({ title: '登录成功' }); uni.switchTab({ url: '/pages/index/index' }); } catch (e) { uni.showToast({ title: '登录失败', icon: 'none' }); } }
function logout() { auth.logout(); uni.showToast({ title: '已退出' }); }
function goAbout() { uni.showModal({ title: '关于', content: '健康管理系统 v1.0.0\n移动端 APP\nPowered by Codex', showCancel: false }); }
function goHelp() { uni.showModal({ title: '使用帮助', content: '1. 设置服务器地址\n2. 登录账号\n3. 开始使用各项功能', showCancel: false }); }
</script>

<style lang="scss" scoped>
.page { min-height: 100vh; padding: 16px; background: #0f172a; }
.login-card { padding: 32px 24px; background: rgba(30,41,59,0.6); border-radius: 16px; }
.brand { display: block; text-align: center; font-size: 24px; font-weight: 700; color: #fff; margin-bottom: 8px; }
.subtitle { display: block; text-align: center; color: #94a3b8; margin-bottom: 32px; }
.ipt { display: block; width: 100%; padding: 14px 16px; background: rgba(255,255,255,0.05); border-radius: 10px; color: #fff; border: 1px solid rgba(255,255,255,0.08); margin-bottom: 12px; box-sizing: border-box; }
.login-btn { display: block; width: 100%; padding: 14px; background: linear-gradient(135deg, #10b981, #0ea5e9); color: #fff; border-radius: 10px; border: none; font-size: 16px; font-weight: 600; margin-top: 8px; }
.tip { display: block; text-align: center; color: #64748b; font-size: 12px; margin-top: 16px; }
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
