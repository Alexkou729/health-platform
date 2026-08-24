<template>
<div class="page">
<div class="page-header">
<div><h2>预约管理</h2><p class="text-secondary text-sm">共 {{ total }} 条预约</p></div>
<div class="header-actions">
<el-select v-model="filters.status" placeholder="状态" clearable style="width:120px" @change="loadList">
<el-option label="待确认" value="PENDING"/><el-option label="已确认" value="CONFIRMED"/><el-option label="进行中" value="IN_PROGRESS"/><el-option label="已完成" value="COMPLETED"/>
</el-select>
<el-button @click="loadList"><el-icon><Refresh/></el-icon></el-button>
</div>
</div>
<div class="glass-card" style="flex:1;overflow:hidden;display:flex;flex-direction:column">
<el-table :data="items" style="flex:1" v-loading="loading">
<el-table-column label="时间" width="140">
<template #default="{row}"><div class="time-cell"><div class="date">{{ formatDate(row.scheduledAt) }}</div><div class="time">{{ formatTime(row.scheduledAt) }}</div></div></template>
</el-table-column>
<el-table-column label="客户" width="140">
<template #default="{row}"><div>{{ row.customer?.name }}</div><div class="text-xs text-tertiary">{{ row.customer?.phone }}</div></template>
</el-table-column>
<el-table-column prop="serviceName" label="服务" min-width="120"/>
<el-table-column label="顾问" width="100"><template #default="{row}">{{ row.staff?.name || '-' }}</template></el-table-column>
<el-table-column label="状态" width="100">
<template #default="{row}"><el-tag :type="statusType(row.status)" effect="dark">{{ statusLabel(row.status) }}</el-tag></template>
</el-table-column>
<el-table-column label="操作" width="200" fixed="right">
<template #default="{row}">
<el-button v-if="row.status==='PENDING'" text type="primary" size="small" @click="confirmAppt(row)">确认</el-button>
<el-button v-if="row.status==='CONFIRMED'" text type="success" size="small" @click="startAppt(row)">开始</el-button>
<el-button v-if="row.status==='IN_PROGRESS'" text type="warning" size="small" @click="completeAppt(row)">完成</el-button>
<el-button v-if="['PENDING','CONFIRMED'].includes(row.status)" text type="danger" size="small" @click="cancelAppt(row)">取消</el-button>
</template>
</el-table-column>
</el-table>
<el-pagination v-model:current-page="filters.page" v-model:page-size="filters.pageSize" :total="total" :page-sizes="[20,50,100]" layout="total,sizes,prev,pager,next,jumper" @current-change="loadList" @size-change="loadList" style="margin-top:12px;justify-content:flex-end"/>
</div>
</div>
</template>
<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Refresh } from '@element-plus/icons-vue';
import { appointmentApi } from '@/api';
const items = ref<any[]>([]); const total = ref(0); const loading = ref(false);
const filters = reactive({ status: '', page: 1, pageSize: 20 });
async function loadList() {
  loading.value = true;
  try { const res: any = await appointmentApi.list({ page: filters.page, pageSize: filters.pageSize, status: filters.status }); items.value = res.items || []; total.value = res.total || 0; } catch (e: any) { ElMessage.error(e.message); }
  finally { loading.value = false; }
}
function formatDate(d) { return d ? new Date(d).toLocaleDateString('zh-CN') : '-'; }
function formatTime(d) { return d ? new Date(d).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }) : ''; }
function statusLabel(s) { return ({ PENDING: '待确认', CONFIRMED: '已确认', IN_PROGRESS: '进行中', COMPLETED: '已完成', CANCELLED: '已取消' }[s] || s); }
function statusType(s) { return ({ PENDING: 'warning', CONFIRMED: 'primary', IN_PROGRESS: 'success', COMPLETED: 'info', CANCELLED: 'danger' }[s] || ''); }
async function confirmAppt(row) { try { await appointmentApi.confirm(row.id); ElMessage.success('已确认'); loadList(); } catch (e) {} }
async function startAppt(row) { try { await appointmentApi.start(row.id); ElMessage.success('已开始'); loadList(); } catch (e) {} }
async function completeAppt(row) { try { const { value } = await ElMessageBox.prompt('请填写服务备注', '完成预约', { confirmButtonText: '完成', cancelButtonText: '取消' }); await appointmentApi.complete(row.id, value); ElMessage.success('已完成'); loadList(); } catch (e) {} }
async function cancelAppt(row) { try { await ElMessageBox.confirm('确定取消该预约？', '提示', { type: 'warning' }); await appointmentApi.cancel(row.id, '管理员取消'); ElMessage.success('已取消'); loadList(); } catch (e) {} }
onMounted(loadList);
</script>
<style lang="scss" scoped>
.page{display:flex;flex-direction:column;height:100%}
.page-header{display:flex;justify-content:space-between;align-items:flex-end;margin-bottom:16px;flex-wrap:wrap;gap:12px}
.page-header h2{margin:0;font-size:18px}
.header-actions{display:flex;gap:8px;align-items:center}
.time-cell{display:flex;flex-direction:column}
.date{font-size:11px;color:var(--text-tertiary)}
.time{font-size:16px;font-weight:600;color:#059669}
</style>
