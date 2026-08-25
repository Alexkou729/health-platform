<template>
  <div class="customers-page">
    <div class="page-header">
      <div>
        <h2>客户管理</h2>
        <p class="text-secondary text-sm">共 {{ total }} 位客户</p>
      </div>
      <div class="header-actions">
        <el-input v-model="filters.keyword" placeholder="搜索姓名 / 手机号" style="width: 240px" clearable @change="loadList">
          <template #prefix><el-icon><Search /></el-icon></template>
        </el-input>
        <el-select v-model="filters.level" placeholder="会员等级" clearable style="width: 120px" @change="loadList">
          <el-option label="黑金" value="BLACK" />
          <el-option label="钻石" value="DIAMOND" />
          <el-option label="黄金" value="GOLD" />
          <el-option label="白银" value="SILVER" />
          <el-option label="青铜" value="BRONZE" />
        </el-select>
        <el-button type="primary" @click="showDialog = true"><el-icon><Plus /></el-icon>新增客户</el-button>
      </div>
    </div>

    <div class="glass-card" style="flex: 1; overflow: hidden; display: flex; flex-direction: column">
      <el-table :data="items" style="flex: 1" :loading="loading" stripe>
        <el-table-column type="index" label="#" width="60" />
        <el-table-column prop="name" label="姓名" width="100" />
        <el-table-column prop="phone" label="手机号" width="140" />
        <el-table-column label="性别" width="70">
          <template #default="{ row }">
            <el-tag size="small" :type="row.gender === 1 ? 'primary' : 'danger'">
              {{ row.gender === 1 ? '男' : row.gender === 2 ? '女' : '-' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="age" label="年龄" width="70" />
        <el-table-column label="身高cm" width="80">
          <template #default="{ row }">{{ row.heightCm || '-' }}</template>
        </el-table-column>
        <el-table-column label="体重kg" width="80">
          <template #default="{ row }">{{ row.weightKg || '-' }}</template>
        </el-table-column>
        <el-table-column label="BMI" width="80">
          <template #default="{ row }">
            <el-tag v-if="bmiOf(row)" size="small" :type="bmiType(row)">{{ bmiOf(row) }}</el-tag>
            <span v-else>-</span>
          </template>
        </el-table-column>
        <el-table-column label="会员等级" width="100">
          <template #default="{ row }">
            <el-tag size="small" :type="levelType(row.level)">{{ levelLabel(row.level) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="totalDetections" label="检测次数" width="100" />
        <el-table-column prop="totalSpent" label="累计消费" width="120">
          <template #default="{ row }">¥{{ row.totalSpent || 0 }}</template>
        </el-table-column>
        <el-table-column label="最近检测" width="180">
          <template #default="{ row }">{{ row.lastDetectionAt ? formatDate(row.lastDetectionAt) : '-' }}</template>
        </el-table-column>
        <el-table-column label="来源" width="100">
          <template #default="{ row }">
            <el-tag size="small" effect="plain">{{ sourceLabel(row.source) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="180" fixed="right">
          <template #default="{ row }">
            <el-button text type="primary" size="small" @click="editCustomer(row)">编辑</el-button>
            <el-button text type="success" size="small" @click="viewHistory(row)">检测记录</el-button>
            <el-button text type="danger" size="small" @click="removeCustomer(row)">停用</el-button>
          </template>
        </el-table-column>
      </el-table>
      <el-pagination
        v-model:current-page="filters.page"
        v-model:page-size="filters.pageSize"
        :total="total"
        :page-sizes="[20, 50, 100]"
        layout="total, sizes, prev, pager, next, jumper"
        @current-change="loadList"
        @size-change="loadList"
        style="margin-top: 12px; justify-content: flex-end"
      />
    </div>

    <!-- 新增/编辑对话框 -->
    <el-dialog v-model="showDialog" :title="editing ? '编辑客户' : '新增客户'" width="560px">
      <el-form :model="form" label-width="100px">
        <el-row :gutter="20">
          <el-col :span="12"><el-form-item label="姓名" required><el-input v-model="form.name" /></el-form-item></el-col>
          <el-col :span="12"><el-form-item label="手机号" required><el-input v-model="form.phone" /></el-form-item></el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12"><el-form-item label="性别"><el-radio-group v-model="form.gender"><el-radio :value="1">男</el-radio><el-radio :value="2">女</el-radio></el-radio-group></el-form-item></el-col>
          <el-col :span="12"><el-form-item label="生日"><el-date-picker v-model="form.birthday" type="date" value-format="YYYY-MM-DD" style="width:100%" /></el-form-item></el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12"><el-form-item label="身高(cm)"><el-input-number v-model="form.heightCm" :min="0" :max="250" style="width:100%" /></el-form-item></el-col>
          <el-col :span="12"><el-form-item label="体重(kg)"><el-input-number v-model="form.weightKg" :min="0" :max="300" :step="0.1" style="width:100%" /></el-form-item></el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="BMI">
              <el-input :model-value="bmiOf(form)" disabled />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="BMI 分级">
              <el-tag v-if="bmiOf(form)" :type="bmiType(form)">{{ bmiLabel(form) }}</el-tag>
              <span v-else class="text-secondary text-sm">填写身高体重后自动计算</span>
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="备注"><el-input v-model="form.remark" type="textarea" :rows="2" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showDialog = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="submitForm">保存</el-button>
      </template>
    </el-dialog>

    <!-- 检测历史 -->
    <el-drawer v-model="historyDrawer" :title="historyCustomer?.name + ' 的检测记录'" size="60%">
      <el-timeline>
        <el-timeline-item v-for="d in history" :key="d.id" :timestamp="formatDate(d.createdAt)">
          <div class="history-item">
            <div class="history-meta">
              <el-tag :type="d.status === 2 ? 'success' : 'info'">{{ statusLabel(d.status) }}</el-tag>
              <span class="text-sm">设备: {{ d.device?.deviceNo }}</span>
              <span class="text-sm">评分: <strong>{{ d.overallScore || '-' }}</strong></span>
            </div>
            <div class="history-reports">
              <el-tag v-for="r in d.reports || []" :key="r.id" size="small" effect="plain" style="margin: 2px">
                {{ r.title }} {{ r.score }}分
              </el-tag>
            </div>
          </div>
        </el-timeline-item>
      </el-timeline>
    </el-drawer>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { customerApi } from '@/api';

const items = ref<any[]>([]);
const total = ref(0);
const loading = ref(false);
const showDialog = ref(false);
const editing = ref(false);
const saving = ref(false);
const historyDrawer = ref(false);
const historyCustomer = ref<any>(null);
const history = ref<any[]>([]);

const filters = reactive({ keyword: '', level: '', page: 1, pageSize: 20 });

const form = reactive({
  id: '',
  name: '', phone: '', gender: 1, birthday: '',
  heightCm: undefined as any, weightKg: undefined as any, remark: '',
});

async function loadList() {
  loading.value = true;
  try {
    const res: any = await customerApi.list({ page: filters.page, pageSize: filters.pageSize, keyword: filters.keyword, level: filters.level });
    items.value = res.items || [];
    total.value = res.total || 0;
  } catch (e: any) { ElMessage.error(e.message); }
  finally { loading.value = false; }
}

function resetForm() {
  Object.assign(form, { id: '', name: '', phone: '', gender: 1, birthday: '', heightCm: undefined, weightKg: undefined, remark: '' });
}

function editCustomer(row: any) {
  editing.value = true;
  Object.assign(form, row);
  showDialog.value = true;
}

async function submitForm() {
  if (!form.name || !form.phone) { ElMessage.warning('请填写姓名和手机号'); return; }
  saving.value = true;
  try {
    // 只提交后端白名单字段，避免把 id / store / consultant 等关联对象一起提交导致 500
    const payload: any = {
      name: form.name,
      phone: form.phone,
      gender: form.gender,
      birthday: form.birthday || null,
      heightCm: form.heightCm ?? null,
      weightKg: form.weightKg ?? null,
      remark: form.remark || '',
    };
    if (editing.value) await customerApi.update(form.id, payload);
    else await customerApi.create(payload);
    ElMessage.success('保存成功');
    showDialog.value = false;
    editing.value = false;
    resetForm();
    loadList();
  } catch (e: any) { ElMessage.error(e.message); }
  finally { saving.value = false; }
}

async function removeCustomer(row: any) {
  await ElMessageBox.confirm(`确定停用客户 "\${row.name}" 吗？`, '提示', { type: 'warning' });
  await customerApi.remove(row.id);
  ElMessage.success('已停用');
  loadList();
}

async function viewHistory(row: any) {
  historyCustomer.value = row;
  history.value = await customerApi.detectionHistory(row.id);
  historyDrawer.value = true;
}

function bmiOf(r: any) {
  const h = Number(r?.heightCm), w = Number(r?.weightKg);
  if (!h || !w) return '';
  return (w / Math.pow(h / 100, 2)).toFixed(1);
}
function bmiType(r: any) {
  const b = Number(bmiOf(r));
  if (!b) return '';
  if (b < 18.5) return 'info';
  if (b < 24) return 'success';
  if (b < 28) return 'warning';
  return 'danger';
}
function bmiLabel(r: any) {
  const b = Number(bmiOf(r));
  if (!b) return '';
  if (b < 18.5) return '偏瘦';
  if (b < 24) return '正常';
  if (b < 28) return '超重';
  return '肥胖';
}
function levelLabel(l: string) { return ({ BLACK: '黑金', DIAMOND: '钻石', GOLD: '黄金', SILVER: '白银', BRONZE: '青铜' } as any)[l] || '青铜'; }
function levelType(l: string) { return ({ BLACK: 'danger', DIAMOND: 'warning', GOLD: 'warning', SILVER: 'info', BRONZE: '' } as any)[l] || ''; }
function sourceLabel(s: string) { return ({ OFFLINE: '到店', WECHAT: '公众号', REFERRAL: '转介绍', ACTIVITY: '活动' } as any)[s] || s; }
function statusLabel(s: number) { return ['待开始', '检测中', '已完成', '失败', '已取消'][s] || '未知'; }
function formatDate(d: string) { return d ? new Date(d).toLocaleString('zh-CN', { hour12: false }) : '-'; }

onMounted(loadList);
</script>

<style lang="scss" scoped>
.customers-page { display: flex; flex-direction: column; height: 100%; }

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  margin-bottom: 16px;
  flex-wrap: wrap;
  gap: 12px;
}
.page-header h2 { margin: 0; font-size: 18px; }
.header-actions { display: flex; gap: 8px; }

.history-item { padding: 8px 0; }
.history-meta { display: flex; gap: 12px; align-items: center; margin-bottom: 8px; flex-wrap: wrap; }
.history-reports { display: flex; flex-wrap: wrap; }
</style>
