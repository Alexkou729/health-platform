<template>
  <div class="page">
    <div class="page-header"><h2>商城订单</h2><el-button @click="load"><el-icon><Refresh /></el-icon>刷新</el-button></div>
    <div class="glass-card">
      <el-table :data="items" stripe v-loading="loading">
        <el-table-column prop="orderNo" label="订单号" width="190" />
        <el-table-column prop="customer.name" label="客户" width="110" />
        <el-table-column prop="store.name" label="门店" width="120" />
        <el-table-column label="商品" min-width="160"><template #default="{ row }">{{ (row.items || []).map((i: any) => i.name + '×' + i.quantity).join('、') }}</template></el-table-column>
        <el-table-column label="金额" width="90"><template #default="{ row }">¥{{ row.totalAmount }}</template></el-table-column>
        <el-table-column label="收款" width="80"><template #default="{ row }"><el-tag :type="row.payStatus === 'PAID' ? 'success' : 'warning'">{{ row.payStatus === 'PAID' ? '已付' : '未付' }}</el-tag></template></el-table-column>
        <el-table-column label="状态" width="90"><template #default="{ row }"><el-tag :type="statusType(row.status)">{{ statusLabel(row.status) }}</el-tag></template></el-table-column>
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button v-if="row.status === 'PENDING'" text type="primary" size="small" @click="accept(row)">接单</el-button>
            <el-button v-if="row.status === 'ACCEPTED'" text type="success" size="small" @click="ship(row)">发货</el-button>
            <el-button v-if="['ACCEPTED','SHIPPED'].includes(row.status)" text type="primary" size="small" @click="complete(row)">完成</el-button>
            <el-button v-if="row.payStatus !== 'PAID' && ['PENDING','ACCEPTED','SHIPPED'].includes(row.status)" text type="warning" size="small" @click="pay(row)">收款</el-button>
            <el-button v-if="['PENDING','ACCEPTED'].includes(row.status)" text type="danger" size="small" @click="cancel(row)">取消</el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Refresh } from '@element-plus/icons-vue';
import { mallOrderApi } from '@/api';
const items = ref<any[]>([]); const loading = ref(false);
async function load() { loading.value = true; try { const r: any = await mallOrderApi.list({ page: 1, pageSize: 100 }); items.value = r.items || []; } finally { loading.value = false; } }
async function accept(r: any) { await mallOrderApi.accept(r.id); ElMessage.success('已接单'); load(); }
async function ship(r: any) { await mallOrderApi.ship(r.id); ElMessage.success('已发货'); load(); }
async function complete(r: any) { await mallOrderApi.complete(r.id); ElMessage.success('已完成'); load(); }
async function pay(r: any) { await mallOrderApi.pay(r.id); ElMessage.success('已登记收款'); load(); }
async function cancel(r: any) { try { const { value } = await ElMessageBox.prompt('请输入取消原因', '取消订单'); await mallOrderApi.cancel(r.id, value); ElMessage.success('已取消'); load(); } catch (e: any) {} }
function statusLabel(s: string) { return ({ PENDING: '待处理', ACCEPTED: '已接单', SHIPPED: '已发货', COMPLETED: '已完成', CANCELLED: '已取消' } as any)[s] || s; }
function statusType(s: string) { return ({ PENDING: 'warning', ACCEPTED: 'primary', SHIPPED: 'primary', COMPLETED: 'success', CANCELLED: 'danger' } as any)[s] || 'info'; }
onMounted(load);
</script>

<style lang="scss" scoped>
.page { display: flex; flex-direction: column; height: 100%; }
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.page-header h2 { margin: 0; font-size: 18px; }
</style>
