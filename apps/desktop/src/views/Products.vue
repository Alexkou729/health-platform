<template>
  <div class="page">
    <div class="page-header">
      <h2>商品管理</h2>
      <el-button type="primary" @click="openCreate"><el-icon><Plus /></el-icon>新增商品</el-button>
    </div>
    <div class="glass-card">
      <el-table :data="items" stripe v-loading="loading">
        <el-table-column prop="name" label="商品名称" min-width="140" />
        <el-table-column label="分类" width="110"><template #default="{ row }">{{ catLabel(row.category) }}</template></el-table-column>
        <el-table-column label="价格" width="90"><template #default="{ row }">¥{{ row.price }}</template></el-table-column>
        <el-table-column prop="stock" label="库存" width="70" />
        <el-table-column prop="store.name" label="归属门店" width="120" />
        <el-table-column label="提成比例" width="100"><template #default="{ row }">{{ Math.round(row.commissionRate * 100) }}%</template></el-table-column>
        <el-table-column label="状态" width="100"><template #default="{ row }"><el-tag :type="statusType(row.status)">{{ statusLabel(row.status) }}</el-tag></template></el-table-column>
        <el-table-column label="操作" width="220" fixed="right">
          <template #default="{ row }">
            <el-button v-if="row.status === 'PENDING'" text type="success" size="small" @click="audit(row, true)">通过</el-button>
            <el-button v-if="row.status === 'PENDING'" text type="danger" size="small" @click="audit(row, false)">驳回</el-button>
            <el-button text type="primary" size="small" @click="openEdit(row)">编辑</el-button>
            <el-button text type="danger" size="small" @click="remove(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <el-dialog v-model="showDialog" :title="form.id ? '编辑商品' : '新增商品'" width="560px">
      <el-form :model="form" label-width="90px">
        <el-form-item label="商品名称" required><el-input v-model="form.name" placeholder="例如：养生调理包" /></el-form-item>
        <el-form-item label="分类"><el-select v-model="form.category" style="width:100%">
          <el-option label="保健品" value="HEALTH" /><el-option label="调理包" value="CARE" /><el-option label="保健用品" value="DEVICE" /><el-option label="其他" value="OTHER" />
        </el-select></el-form-item>
        <div style="display:flex;gap:12px">
          <el-form-item label="价格" style="flex:1"><el-input-number v-model="form.price" :min="0" :step="10" /></el-form-item>
          <el-form-item label="库存" style="flex:1"><el-input-number v-model="form.stock" :min="0" /></el-form-item>
        </div>
        <el-form-item label="提成比例"><el-input-number v-model="form.commissionRate" :min="0" :max="1" :step="0.05" style="width:100%" /></el-form-item>
        <el-form-item label="商品描述"><el-input v-model="form.description" type="textarea" :rows="2" /></el-form-item>
      </el-form>
      <template #footer><el-button @click="showDialog=false">取消</el-button><el-button type="primary" :loading="saving" @click="save">保存</el-button></template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Plus } from '@element-plus/icons-vue';
import { productApi } from '@/api';
const items = ref<any[]>([]); const loading = ref(false); const showDialog = ref(false); const saving = ref(false);
const form = reactive<any>({ id: '', name: '', category: 'HEALTH', price: 100, stock: 100, commissionRate: 0, description: '' });
async function load() { loading.value = true; try { items.value = (await productApi.list()) as any[]; } finally { loading.value = false; } }
function reset() { Object.assign(form, { id: '', name: '', category: 'HEALTH', price: 100, stock: 100, commissionRate: 0, description: '' }); }
function openCreate() { reset(); showDialog.value = true; }
function openEdit(r: any) { Object.assign(form, { id: r.id, name: r.name, category: r.category, price: r.price, stock: r.stock, commissionRate: r.commissionRate, description: r.description }); showDialog.value = true; }
async function save() {
  if (!form.name) { ElMessage.warning('请填写商品名称'); return; }
  saving.value = true;
  try { if (form.id) await productApi.update(form.id, form); else await productApi.create(form); ElMessage.success('已保存'); showDialog.value = false; load(); }
  catch (e: any) { ElMessage.error(e.message); } finally { saving.value = false; }
}
async function audit(r: any, approve: boolean) {
  try {
    if (!approve) { const { value } = await ElMessageBox.prompt('请输入驳回原因', '驳回商品', { inputValue: '不符合要求' }); await productApi.audit(r.id, false, value); }
    else await productApi.audit(r.id, true);
    ElMessage.success(approve ? '已上架' : '已驳回'); load();
  } catch (e: any) {}
}
async function remove(r: any) { try { await ElMessageBox.confirm('确定删除商品「' + r.name + '」？', '提示', { type: 'warning' }); await productApi.remove(r.id); ElMessage.success('已删除'); load(); } catch (e: any) {} }
function catLabel(c: string) { return ({ HEALTH: '保健品', CARE: '调理包', DEVICE: '保健用品', OTHER: '其他' } as any)[c] || c; }
function statusLabel(s: string) { return ({ PENDING: '待审核', ACTIVE: '已上架', REJECTED: '已驳回', OFF: '已下架' } as any)[s] || s; }
function statusType(s: string) { return ({ PENDING: 'warning', ACTIVE: 'success', REJECTED: 'danger', OFF: 'info' } as any)[s] || 'info'; }
onMounted(load);
</script>

<style lang="scss" scoped>
.page { display: flex; flex-direction: column; height: 100%; }
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.page-header h2 { margin: 0; font-size: 18px; }
</style>
