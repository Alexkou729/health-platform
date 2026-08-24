<template>
<view class="page">
<view class="header"><text class="title">新建预约</text></view>
<view class="card">
<text class="label">客户</text>
<picker mode="selector" :range="customerNames" @change="onCustomerChange"><view class="picker">{{ form.customerName || '请选择客户' }}</view></picker>
<text class="label">服务类型</text>
<picker mode="selector" :range="serviceLabels" @change="onServiceChange"><view class="picker">{{ form.serviceName || '请选择服务' }}</view></picker>
<text class="label">预约日期</text>
<picker mode="date" @change="onDateChange"><view class="picker">{{ form.date || '请选择日期' }}</view></picker>
<text class="label">预约时间</text>
<picker mode="time" @change="onTimeChange"><view class="picker">{{ form.time || '请选择时间' }}</view></picker>
<text class="label">备注</text>
<textarea v-model="form.notes" class="textarea" placeholder="客户备注 / 注意事项" />
</view>
<button class="submit-btn" @click="submit">提交预约</button>
</view>
</template>
<script setup>
import { ref, onMounted } from 'vue';
import { appointmentApi, customerApi } from '../../api/index.js';
const customerNames = ref([]); const customersCache = ref([]);
const serviceLabels = ['体质检测', '健康咨询', '理疗调理', '复检'];
const serviceTypes = ['DETECTION', 'CONSULTATION', 'TREATMENT', 'RECHECK'];
const form = ref({ customerId: '', customerName: '', serviceType: 'DETECTION', serviceName: '体质检测', date: '', time: '', notes: '' });
onMounted(async () => { try { const res = await customerApi.list({ pageSize: 100 }); customersCache.value = res.items || []; customerNames.value = customersCache.value.map(c => c.name + ' (' + c.phone + ')'); } catch (e) {} });
function onCustomerChange(e) { const c = customersCache.value[e.detail.value]; if (c) { form.value.customerId = c.id; form.value.customerName = c.name; } }
function onServiceChange(e) { form.value.serviceName = serviceLabels[e.detail.value]; form.value.serviceType = serviceTypes[e.detail.value]; }
function onDateChange(e) { form.value.date = e.detail.value; }
function onTimeChange(e) { form.value.time = e.detail.value; }
async function submit() { if (!form.value.customerId || !form.value.date || !form.value.time) { uni.showToast({ title: '请填写完整信息', icon: 'none' }); return; } try { await appointmentApi.create({ customerId: form.value.customerId, storeId: '', serviceType: form.value.serviceType, serviceName: form.value.serviceName, scheduledAt: form.value.date + 'T' + form.value.time + ':00', notes: form.value.notes }); uni.showToast({ title: '预约成功' }); setTimeout(() => uni.navigateBack(), 800); } catch (e) { uni.showToast({ title: '失败', icon: 'none' }); } }
</script>
<style lang="scss" scoped>
.page { min-height: 100vh; padding: 16px; background: #0f172a; }
.header { margin-bottom: 16px; }
.title { color: #fff; font-size: 22px; font-weight: 700; }
.card { padding: 20px; background: rgba(30,41,59,0.6); border-radius: 12px; }
.label { color: #94a3b8; font-size: 13px; margin: 16px 0 8px; display: block; }
.label:first-child { margin-top: 0; }
.picker { padding: 14px 16px; background: rgba(255,255,255,0.05); border-radius: 8px; color: #fff; border: 1px solid rgba(255,255,255,0.08); }
.textarea { width: 100%; min-height: 80px; padding: 12px 16px; background: rgba(255,255,255,0.05); border-radius: 8px; color: #fff; border: 1px solid rgba(255,255,255,0.08); box-sizing: border-box; }
.submit-btn { width: 100%; padding: 14px; background: linear-gradient(135deg, #10b981, #0ea5e9); color: #fff; border-radius: 12px; border: none; font-size: 16px; font-weight: 600; margin-top: 16px; }
</style>
