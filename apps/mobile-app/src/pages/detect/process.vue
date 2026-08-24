<template>
<view class="page">
<view class="ring-wrap"><view class="ring" :style="{transform:'rotate(' + progress * 3.6 + 'deg)'}"><view class="ring-inner">{{ remaining }}</view></view></view>
<text class="phase">{{ phaseText }}</text>
<view class="wave"><view v-for="i in 30" :key="i" class="bar" :style="{height: getWave(i) + '%'}"></view></view>
<view class="stats">
<view class="box"><text class="lb">信号</text><text class="val">{{ signal }}%</text></view>
<view class="box"><text class="lb">心率</text><text class="val">{{ hr }} BPM</text></view>
<view class="box"><text class="lb">进度</text><text class="val">{{ progress }}%</text></view>
</view>
<button class="cancel" @click="cancel">取消检测</button>
</view>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
const progress = ref(0); const remaining = ref(60); const signal = ref(0); const hr = ref(0); const phase = ref('CONNECTING');
const phaseText = computed(() => ({ CONNECTING: '正在连接设备', CALIBRATING: '校准中', COLLECTING: '采集体征数据', DONE: '检测完成' }[phase.value]));
let timer;
onMounted(() => { timer = setInterval(() => { progress.value = Math.min(100, progress.value + 1.67); remaining.value = Math.max(0, 60 - Math.floor(progress.value * 0.6)); signal.value = 60 + Math.sin(progress.value / 10) * 25; hr.value = 72 + Math.floor(Math.random() * 8); if (progress.value < 5) phase.value = 'CONNECTING'; else if (progress.value < 12) phase.value = 'CALIBRATING'; else phase.value = 'COLLECTING'; if (progress.value >= 100) { clearInterval(timer); phase.value = 'DONE'; uni.showToast({ title: '检测完成', icon: 'success' }); setTimeout(() => uni.navigateBack(), 1500); } }, 1000); });
onUnmounted(() => { if (timer) clearInterval(timer); });
function getWave(i) { return 30 + Math.sin((i + progress) * 0.5) * 20 + Math.random() * 10; }
function cancel() { if (timer) clearInterval(timer); uni.navigateBack(); }
</script>

<style lang="scss" scoped>
.page { min-height: 100vh; padding: 60px 24px; background: #0f172a; }
.ring-wrap { width: 200px; height: 200px; margin: 0 auto 24px; }
.ring { width: 100%; height: 100%; border-radius: 50%; background: conic-gradient(from 0deg, #10b981 0%, #0ea5e9 33%, #ec4899 66%, transparent 100%); padding: 8px; box-sizing: border-box; transition: transform 0.3s; }
.ring-inner { width: 100%; height: 100%; border-radius: 50%; background: #0f172a; display: flex; align-items: center; justify-content: center; font-size: 40px; font-weight: 700; color: #fff; }
.phase { text-align: center; color: #cbd5e0; font-size: 18px; margin: 24px 0; display: block; }
.wave { display: flex; align-items: flex-end; height: 100px; padding: 16px; background: rgba(255,255,255,0.02); border-radius: 12px; margin-bottom: 24px; }
.bar { flex: 1; background: linear-gradient(180deg, #10b981, #0ea5e9); border-radius: 2px; margin: 0 1px; }
.stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 24px; }
.box { background: rgba(30,41,59,0.6); padding: 16px; text-align: center; border-radius: 12px; }
.lb { color: #94a3b8; font-size: 12px; display: block; }
.val { color: #fff; font-size: 18px; font-weight: 700; display: block; margin-top: 4px; }
.cancel { background: rgba(239,68,68,0.2); color: #ef4444; border: 1px solid #ef4444; border-radius: 24px; padding: 14px; width: 100%; font-size: 15px; }
</style>
