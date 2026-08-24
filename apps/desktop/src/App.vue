<template>
  <router-view />
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import { setupGuards } from '@/router';

onMounted(() => {
  // 读取本地配置
  if (window.electronAPI) {
    window.electronAPI.readConfig().then((config: any) => {
      if (config?.apiBaseUrl) {
        localStorage.setItem('api_base_url', config.apiBaseUrl);
      }
    });
  }
});
</script>

<style>
#app { width: 100%; height: 100vh; }
</style>
