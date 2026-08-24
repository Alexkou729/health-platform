<template>
  <div class="layout">
    <!-- 自定义标题栏 -->
    <div class="title-bar" @mousedown="onDragMouseDown">
      <div class="title-left">
        <div class="logo-mini pulse-glow">
          <el-icon :size="18"><FirstAidKit /></el-icon>
        </div>
        <span class="title">健康管理系统</span>
        <span class="version text-xs text-muted">v{{ appVersion }}</span>
      </div>
      <div class="title-right">
        <span class="text-xs text-tertiary" style="margin-right: 16px">{{ currentTime }}</span>
        <el-button text @click="minimize"><el-icon><Minus /></el-icon></el-button>
        <el-button text @click="toggleMaximize"><el-icon><FullScreen /></el-icon></el-button>
        <el-button text @click="close"><el-icon><Close /></el-icon></el-button>
      </div>
    </div>

    <div class="main-container">
      <!-- 侧边栏 -->
      <aside class="sidebar glass-card">
        <el-menu :default-active="route.path" router>
          <el-menu-item v-for="item in menuItems" :key="item.path" :index="item.path">
            <el-icon><component :is="item.icon" /></el-icon>
            <span>{{ item.title }}</span>
          </el-menu-item>
        </el-menu>

        <div class="user-info glass-card" style="margin-top: auto">
          <el-avatar :size="40" :src="authStore.user?.avatarUrl">
            {{ authStore.user?.name?.[0] || 'U' }}
          </el-avatar>
          <div style="margin-left: 12px; flex: 1">
            <div class="text-sm">{{ authStore.user?.name }}</div>
            <div class="text-xs text-tertiary">{{ roleText }}</div>
          </div>
          <el-dropdown trigger="click">
            <el-button text size="small"><el-icon><MoreFilled /></el-icon></el-button>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item @click="goSettings">系统设置</el-dropdown-item>
                <el-dropdown-item @click="logout" divided>退出登录</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </aside>

      <!-- 内容区 -->
      <main class="content">
        <router-view v-slot="{ Component }">
          <transition name="fade" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { ElMessageBox, ElMessage } from 'element-plus';
import { useAuthStore } from '@/stores/auth';
import pkg from '../../package.json';

const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();
const appVersion = pkg.version || '1.0.0';

const currentTime = ref('');
let timer: any;

function updateTime() {
  currentTime.value = new Date().toLocaleString('zh-CN', { hour12: false });
}

onMounted(() => {
  updateTime();
  timer = setInterval(updateTime, 1000);
});

onUnmounted(() => {
  if (timer) clearInterval(timer);
});

const menuItems = computed(() => {
  const all = router.options.routes[1].children || [];
  return all
    .filter((r: any) => {
      if (r.meta?.roles && !r.meta.roles.includes(authStore.user?.role)) return false;
      return authStore.can(r.path);
    })
    .map((r: any) => ({ path: '/' + r.path, title: r.meta?.title, icon: r.meta?.icon }));
});

const roleText = computed(() => {
  const map: Record<string, string> = {
    SUPER_ADMIN: '超级管理员', STORE_ADMIN: '店长',
    DOCTOR: '医师', CONSULTANT: '健康顾问', RECEPTIONIST: '前台',
  };
  return map[authStore.user?.role || ''] || '员工';
});

function onDragMouseDown(e: MouseEvent) {
  if ((e.target as HTMLElement).closest('.title-right')) return;
  // 让 Electron 拖拽
  if (window.electronAPI) {
    // Electron 默认支持 -webkit-app-region: drag
  }
}

async function minimize() { await window.electronAPI?.minimize(); }
async function toggleMaximize() { await window.electronAPI?.maximize(); }
async function close() { await window.electronAPI?.close(); }

function goSettings() { router.push('/settings'); }

async function logout() {
  await ElMessageBox.confirm('确定要退出登录吗？', '提示', { type: 'warning' }).catch(() => 'cancel');
  authStore.logout();
  ElMessage.success('已退出登录');
  router.push('/login');
}
</script>

<style lang="scss" scoped>
.layout {
  width: 100%;
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--bg-primary);
}

.title-bar {
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
  background: rgba(255, 255, 255, 0.94);
  backdrop-filter: blur(20px);
  border-bottom: 1px solid var(--border);
  -webkit-app-region: drag;
  user-select: none;
  flex-shrink: 0;
}

.title-left, .title-right {
  display: flex;
  align-items: center;
  gap: 12px;
  -webkit-app-region: no-drag;
}

.title { font-size: 14px; font-weight: 600; }
.logo-mini {
  width: 28px;
  height: 28px;
  background: var(--gradient-primary);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
}

.main-container {
  flex: 1;
  display: flex;
  overflow: hidden;
}

.sidebar {
  width: 220px;
  margin: 12px;
  margin-right: 0;
  padding: 16px 12px;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
}

.user-info {
  display: flex;
  align-items: center;
  padding: 12px !important;
  margin-top: 16px !important;
}

.content {
  flex: 1;
  padding: 12px;
  overflow-y: auto;
  overflow-x: hidden;
}

.fade-enter-active, .fade-leave-active { transition: all 0.3s; }
.fade-enter-from { opacity: 0; transform: translateY(10px); }
.fade-leave-to { opacity: 0; transform: translateY(-10px); }
</style>
