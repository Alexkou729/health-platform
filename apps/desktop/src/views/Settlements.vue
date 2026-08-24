<template>
  <div class="page">
    <div class="page-header">
      <h2>门店结算比例</h2>
      <el-button type="primary" @click="openSet"><el-icon><Plus /></el-icon>设置比例</el-button>
    </div>
    <div class="glass-card">
      <el-table :data="items" stripe v-loading="loading">
        <el-table-column prop="store.name" label="门店" min-width="160" />
        <el-table-column prop="store.code" label="编码" width="110" />
        <el-table-column label="结算比例" width="140"><template #default="{ row }">{{ Math.round(row.ratio * 100) }}%</template></el-table-column>
        <el-table-column prop="remark" label="备注" min-width="140" />
        <el-table-column label="操作" width="100" fixed="right"><template #default="{ row }"><el-button text type="primary" size="small" @click="openEdit(row)">调整</el-button></template></el-table-column>
      </el-table>
    </div>

    <el-dialog v-model="showDialog" :title="editStoreId ? '调整结算比例' : '设置结算比例'" width="460px">
      <el-form label-width="100px">
        <el-form-item label="选择门店" required>
          <el-select v-model="form.storeId" filterable style="width:100%" :disabled="!!editStoreId">
            <el-option v-for="s in stores" :key="s.id" :label="s.name + ' (' + s.code + ')'" :value="s.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="结算比例">
          <el-input-number v-model="form.ratio" :min="0" :max="1" :step="0.05" style="width:100%" />
          <div class="tip">例如 0.8 表示门店拿 80%，总部留 20%</div>
        </el-form-item>
        <el-form-item label="备注"><el-input v-model="form.remark" placeholder="备注" /></el-form-item>
      </el-form>
      <template #footer><el-button @click="showDialog=false">取消</el-button><el-button type="primary" :loading="saving" @click="save">保存</el-button></template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { ElMessage } from 'element-plus';
import { Plus } from '@element-plus/icons-vue';
import { settlementApi, storeApi } from '@/api';
const items = ref<any[]>([]); const stores = ref<any[]>([]); const loading = ref(false); const showDialog = ref(false); const saving = ref(false);
const editStoreId = ref('');
const form = reactive({ storeId: '', ratio: 0.8, remark: '' });
async function load() { loading.value = true; try { items.value = (await settlementApi.list()) as any[]; } finally { loading.value = false; } }
async function loadStores() { try { stores.value = (await storeApi.list()) as any[]; } catch (e: any) {} }
function openSet() { editStoreId.value = ''; form.storeId = ''; form.ratio = 0.8; form.remark = ''; showDialog.value = true; }
function openEdit(r: any) { editStoreId.value = r.storeId; form.storeId = r.storeId; form.ratio = r.ratio; form.remark = r.remark; showDialog.value = true; }
async function save() {
  if (!form.storeId) { ElMessage.warning('请选择门店'); return; }
  saving.value = true;
  try { await settlementApi.set(form.storeId, form.ratio, form.remark); ElMessage.success('已保存'); showDialog.value = false; load(); }
  catch (e: any) { ElMessage.error(e.message); } finally { saving.value = false; }
}
onMounted(() => { load(); loadStores(); });
</script>

<style lang="scss" scoped>
.page { display: flex; flex-direction: column; height: 100%; }
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.page-header h2 { margin: 0; font-size: 18px; }
.tip { color: #909399; font-size: 12px; margin-top: 4px; }
</style>
