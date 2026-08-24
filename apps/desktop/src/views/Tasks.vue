<template>
<div class="page">
<div class="page-header"><h2>任务工作台</h2></div>
<div class="task-stats">
<div class="stat glass-card"><div class="stat-label">待办</div><div class="stat-value text-warning">{{ stats.pending || 0 }}</div></div>
<div class="stat glass-card"><div class="stat-label">进行中</div><div class="stat-value text-primary">{{ stats.inProgress || 0 }}</div></div>
<div class="stat glass-card"><div class="stat-label">今日完成</div><div class="stat-value text-success">{{ stats.completedToday || 0 }}</div></div>
<div class="stat glass-card"><div class="stat-label">累计</div><div class="stat-value">{{ stats.total || 0 }}</div></div>
</div>
<div class="task-toolbar">
<el-button @click="loadMy" type="primary">我的任务</el-button>
<el-button @click="loadAll">所有任务</el-button>
<el-button @click="showAssignDialog = true" type="success"><el-icon><Plus/></el-icon>分配任务</el-button>
</div>
<div class="glass-card" style="flex:1;overflow:hidden;display:flex;flex-direction:column">
<el-table :data="items" style="flex:1" v-loading="loading">
<el-table-column label="优先级" width="80">
<template #default="{row}"><el-tag :type="priorityType(row.priority)" effect="dark" size="small">{{ priorityText(row.priority) }}</el-tag></template>
</el-table-column>
<el-table-column prop="title" label="任务" min-width="200"/>
<el-table-column label="类型" width="100"><template #default="{row}"><el-tag size="small">{{ typeText(row.type) }}</el-tag></template></el-table-column>
<el-table-column label="客户" width="120"><template #default="{row}"><div v-if="row.customer">{{ row.customer.name }}</div><div v-else class="text-tertiary">-</div></template></el-table-column>
<el-table-column label="负责人" width="100"><template #default="{row}">{{ row.assignee?.name || '-' }}</template></el-table-column>
<el-table-column label="截止" width="120"><template #default="{row}">{{ formatDate(row.dueDate) }}</template></el-table-column>
<el-table-column label="状态" width="100">
<template #default="{row}"><el-tag :type="statusType(row.status)" effect="dark" size="small">{{ statusText(row.status) }}</el-tag></template>
</el-table-column>
<el-table-column label="操作" width="160" fixed="right">
<template #default="{row}">
<el-button v-if="row.status==='PENDING'" text type="success" size="small" @click="startTask(row)">开始</el-button>
<el-button v-if="row.status==='IN_PROGRESS'" text type="warning" size="small" @click="completeTask(row)">完成</el-button>
<el-button text type="info" size="small" @click="viewTask(row)">详情</el-button>
</template>
</el-table-column>
</el-table>
</div>
<el-dialog v-model="showAssignDialog" title="分配任务" width="500px">
<el-form :model="newTask" label-width="100px">
<el-form-item label="任务标题"><el-input v-model="newTask.title"/></el-form-item>
<el-form-item label="优先级">
<el-radio-group v-model="newTask.priority"><el-radio value="LOW">低</el-radio><el-radio value="NORMAL">中</el-radio><el-radio value="HIGH">高</el-radio><el-radio value="URGENT">紧急</el-radio></el-radio-group>
</el-form-item>
<el-form-item label="类型">
<el-select v-model="newTask.type"><el-option label="跟进" value="FOLLOW_UP"/><el-option label="提醒" value="REMIND"/><el-option label="检测" value="DETECTION"/><el-option label="咨询" value="CONSULTATION"/></el-select>
</el-form-item>
<el-form-item label="负责人"><el-select v-model="newTask.assigneeId" filterable>
<el-option v-for="s in staffs" :key="s.id" :label="s.name" :value="s.id"/>
</el-select></el-form-item>
<el-form-item label="截止日期"><el-date-picker v-model="newTask.dueDate" type="date" value-format="YYYY-MM-DD" style="width:100%"/></el-form-item>
<el-form-item label="关联客户"><el-select v-model="newTask.customerId" filterable clearable>
<el-option v-for="c in customers" :key="c.id" :label="c.name + ' (' + c.phone + ')'" :value="c.id"/>
</el-select></el-form-item>
<el-form-item label="描述"><el-input v-model="newTask.description" type="textarea" :rows="2"/></el-form-item>
</el-form>
<template #footer><el-button @click="showAssignDialog=false">取消</el-button><el-button type="primary" @click="assignTask">分配</el-button></template>
</el-dialog>
</div>
</template>
<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Plus } from '@element-plus/icons-vue';
import { taskApi, staffApi, customerApi } from '@/api';
const items = ref<any[]>([]); const loading = ref(false);
const stats = ref<any>({}); const staffs = ref<any[]>([]); const customers = ref<any[]>([]);
const showAssignDialog = ref(false);
const newTask = reactive({ title: '', priority: 'NORMAL', type: 'FOLLOW_UP', assigneeId: '', dueDate: '', customerId: '', description: '' });
async function loadMy() { loading.value = true; try { items.value = await taskApi.myTodos('PENDING'); stats.value = await taskApi.myStats(); } catch (e: any) { ElMessage.error(e.message); } finally { loading.value = false; } }
async function loadAll() { loading.value = true; try { const res: any = await taskApi.list({ pageSize: 50 }); items.value = res.items || []; } catch (e) {} finally { loading.value = false; } }
function priorityText(p) { return ({ LOW: '低', NORMAL: '中', HIGH: '高', URGENT: '紧急' }[p] || p); }
function priorityType(p) { return ({ LOW: 'info', NORMAL: '', HIGH: 'warning', URGENT: 'danger' }[p] || ''); }
function typeText(t) { return ({ FOLLOW_UP: '跟进', REMIND: '提醒', DETECTION: '检测', CONSULTATION: '咨询' }[t] || t); }
function statusText(s) { return ({ PENDING: '待办', IN_PROGRESS: '进行中', COMPLETED: '已完成', CANCELLED: '已取消' }[s] || s); }
function statusType(s) { return ({ PENDING: 'warning', IN_PROGRESS: 'primary', COMPLETED: 'success', CANCELLED: 'info' }[s] || ''); }
function formatDate(d) { return d ? new Date(d).toLocaleDateString('zh-CN') : '-'; }
async function startTask(row) { try { await taskApi.start(row.id); ElMessage.success('已开始'); loadAll(); } catch (e) {} }
async function completeTask(row) { try { const { value } = await ElMessageBox.prompt('完成情况', '完成任务', { confirmButtonText: '完成', cancelButtonText: '取消' }); await taskApi.complete(row.id, value); ElMessage.success('已完成'); loadAll(); } catch (e) {} }
async function viewTask(row) { ElMessageBox.alert(row.description || '无描述', row.title); }
async function loadStaffs() { try { const res: any = await staffApi.list({ pageSize: 100 }); staffs.value = res.items || []; } catch (e) {} }
async function loadCustomers() { try { const res: any = await customerApi.list({ pageSize: 200 }); customers.value = res.items || []; } catch (e) {} }
async function assignTask() {
  if (!newTask.title || !newTask.assigneeId) { ElMessage.warning('请填写任务标题和负责人'); return; }
  try { await taskApi.create({ ...newTask, storeId: '', assignerId: localStorage.getItem('staff_id'), dueDate: newTask.dueDate ? new Date(newTask.dueDate).toISOString() : null }); ElMessage.success('任务已分配'); showAssignDialog.value = false; Object.assign(newTask, { title: '', priority: 'NORMAL', type: 'FOLLOW_UP', assigneeId: '', dueDate: '', customerId: '', description: '' }); loadAll(); } catch (e: any) { ElMessage.error(e.message); }
}
onMounted(() => { loadMy(); loadStaffs(); loadCustomers(); });
</script>
<style lang="scss" scoped>
.page{display:flex;flex-direction:column;height:100%}
.page-header{margin-bottom:16px}
.page-header h2{margin:0;font-size:18px}
.task-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:16px}
.stat{padding:16px;display:flex;flex-direction:column;align-items:center}
.stat-label{color:var(--text-tertiary);font-size:12px;margin-bottom:4px}
.stat-value{font-size:28px;font-weight:700}
.task-toolbar{display:flex;gap:8px;margin-bottom:16px}
</style>
