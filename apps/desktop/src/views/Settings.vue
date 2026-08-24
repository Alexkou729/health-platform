<template>
  <div class="page">
    <div class="page-header"><h2>系统设置</h2></div>

    <div class="settings-grid">
      <!-- AI 接口配置（总台专属） -->
      <div class="glass-card setting-section ai-section" v-if="authStore.user?.role === 'SUPER_ADMIN'">
        <h3><el-icon><MagicStick /></el-icon> AI 接口配置（总台专属）</h3>
        <p class="section-tip">选择大模型供应商并填写 API Key，用于检测报告的 AI 解读、调理方案与话术生成。门店无任何配置权限。</p>
        <el-form label-width="120px" label-position="top">
          <el-form-item label="模型供应商">
            <el-select v-model="aiForm.provider" placeholder="请选择" style="width:100%" @change="onProviderChange">
              <el-option v-for="p in aiProviders" :key="p.code" :label="p.label" :value="p.code" />
            </el-select>
          </el-form-item>
          <el-form-item label="接口地址 Base URL">
            <el-input v-model="aiForm.baseUrl" placeholder="https://api.example.com/v1" />
          </el-form-item>
          <el-form-item label="模型名称 Model">
            <el-input v-model="aiForm.model" placeholder="模型 ID" />
          </el-form-item>
          <el-form-item label="API Key">
            <el-input v-model="aiForm.apiKey" type="password" show-password
                      :placeholder="aiConfigured ? '已配置（留空保持不变）：' + aiForm.apiKeyMasked : '请输入 API Key'" />
          </el-form-item>
          <div class="ai-actions">
            <el-button type="primary" :loading="aiSaving" @click="saveAiConfig">
              <el-icon><Check /></el-icon> 保存并生效
            </el-button>
            <el-button :loading="aiTesting" @click="testAiConfig">
              <el-icon><Connection /></el-icon> 测试连接
            </el-button>
          </div>
          <el-alert v-if="aiConfigured" title="当前已配置，解读服务已就绪" type="success" :closable="false" show-icon class="ai-status" />
          <el-alert v-else title="尚未配置 API Key，AI 解读暂不可用" type="warning" :closable="false" show-icon class="ai-status" />
        </el-form>
      </div>

      <div class="glass-card setting-section"><h3>服务器配置</h3>
        <el-form label-width="140px">
          <el-form-item label="API 地址"><el-input v-model="settings.apiBaseUrl" placeholder="http://your-aliyun-server:3015/api"><template #append><el-button @click="saveApi">保存</el-button></template></el-input></el-form-item>
          <el-form-item label="设备网关"><el-input v-model="settings.gatewayUrl" placeholder="ws://localhost:8888/ws"/></el-form-item>
          <el-form-item label="H5域名"><el-input v-model="settings.webBaseUrl" placeholder="https://h5.your-domain.com"/></el-form-item>
        </el-form>
      </div>

      <div class="glass-card setting-section"><h3>检测参数</h3>
        <el-form label-width="140px">
          <el-form-item label="检测时长"><el-input-number v-model="settings.detectionDuration" :min="30" :max="120"/> 秒</el-form-item>
          <el-form-item label="采样率"><el-input-number v-model="settings.sampleRate" :min="10" :max="1000"/> Hz</el-form-item>
          <el-form-item label="报告品牌"><el-input v-model="settings.brandName" placeholder="健康管理系统"/></el-form-item>
          <el-form-item label="免责声明"><el-input v-model="settings.disclaimer" type="textarea" :rows="2"/></el-form-item>
        </el-form>
      </div>

      <div class="glass-card setting-section"><h3>应用信息</h3>
        <el-descriptions :column="1" border>
          <el-descriptions-item label="版本">v1.0.0</el-descriptions-item>
          <el-descriptions-item label="Electron">{{appInfo?.electron}}</el-descriptions-item>
          <el-descriptions-item label="Node.js">{{appInfo?.node}}</el-descriptions-item>
          <el-descriptions-item label="Chrome">{{appInfo?.chrome}}</el-descriptions-item>
          <el-descriptions-item label="平台">{{appInfo?.platform}} / {{appInfo?.arch}}</el-descriptions-item>
        </el-descriptions>
      </div>

      <div class="glass-card setting-section"><h3>快捷操作</h3>
        <div class="action-grid">
          <el-button @click="clearCache"><el-icon><Delete/></el-icon>清除本地缓存</el-button>
          <el-button @click="exportConfig"><el-icon><Download/></el-icon>导出配置</el-button>
          <el-button @click="testConnection"><el-icon><Connection/></el-icon>测试连接</el-button>
          <el-button type="danger" @click="logout"><el-icon><SwitchButton/></el-icon>退出登录</el-button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Delete, Download, Connection, SwitchButton, MagicStick, Check } from '@element-plus/icons-vue';
import { useAuthStore } from '@/stores/auth';
import { franchiseApi } from '@/api';

const router = useRouter();
const authStore = useAuthStore();
const appInfo = ref<any>({});
const settings = reactive({
  apiBaseUrl: authStore.apiBaseUrl,
  gatewayUrl: 'ws://localhost:8888/ws',
  webBaseUrl: 'http://localhost:5173',
  detectionDuration: 60,
  sampleRate: 60,
  brandName: '健康管理系统',
  disclaimer: '本检测结果仅供参考，不作为诊断结论。',
});

// ============ AI 接口配置 ============
const aiProviders = ref<any[]>([]);
const aiForm = reactive({ provider: 'minimax', baseUrl: '', model: '', apiKey: '', apiKeyMasked: '' });
const aiConfigured = ref(false);
const aiSaving = ref(false);
const aiTesting = ref(false);

function onProviderChange(code: string) {
  const p = aiProviders.value.find((x) => x.code === code);
  if (p) { aiForm.baseUrl = p.baseUrl; aiForm.model = p.model; }
}

async function loadAiConfig() {
  try {
    const cfg: any = await franchiseApi.getAiConfig();
    aiProviders.value = cfg.providers || [];
    aiForm.provider = cfg.provider || 'minimax';
    aiForm.baseUrl = cfg.baseUrl || '';
    aiForm.model = cfg.model || '';
    aiForm.apiKeyMasked = cfg.apiKeyMasked || '';
    aiConfigured.value = !!cfg.configured;
    if (!aiProviders.value.find((p) => p.code === aiForm.provider)) {
      aiProviders.value.unshift({ code: aiForm.provider, label: aiForm.provider, baseUrl: aiForm.baseUrl, model: aiForm.model });
    }
  } catch (e: any) {
    console.warn('加载 AI 配置失败', e?.message);
  }
}

async function saveAiConfig() {
  aiSaving.value = true;
  try {
    const payload: any = { provider: aiForm.provider, baseUrl: aiForm.baseUrl, model: aiForm.model };
    if (aiForm.apiKey) payload.apiKey = aiForm.apiKey;
    const res: any = await franchiseApi.setAiConfig(payload);
    aiConfigured.value = !!res?.configured;
    aiForm.apiKey = '';
    ElMessage.success('AI 接口配置已保存并生效');
    await loadAiConfig();
  } catch (e: any) {
    ElMessage.error('保存失败：' + (e?.message || '未知错误'));
  } finally {
    aiSaving.value = false;
  }
}

async function testAiConfig() {
  aiTesting.value = true;
  try {
    // 先保存当前配置再测试，确保测试的就是刚填的内容
    const payload: any = { provider: aiForm.provider, baseUrl: aiForm.baseUrl, model: aiForm.model };
    if (aiForm.apiKey) payload.apiKey = aiForm.apiKey;
    await franchiseApi.setAiConfig(payload);
    const { api } = await import('@/api');
    const res: any = await api.post('/ai/chat', { messages: [{ role: 'user', content: '请回复“连接成功”四个字' }] });
    const reply = res?.reply || JSON.stringify(res);
    ElMessage.success('AI 连接正常：' + String(reply).slice(0, 40));
  } catch (e: any) {
    ElMessage.error('AI 连接失败：' + (e?.message || '请检查 API Key 与接口地址'));
  } finally {
    aiTesting.value = false;
  }
}

// ============ 原有设置 ============
async function saveApi() { authStore.setApiBaseUrl(settings.apiBaseUrl); ElMessage.success('API 地址已保存'); }
function clearCache() { ElMessageBox.confirm('确定清除本地缓存吗？将需要重新登录。', '提示', { type: 'warning' }).then(() => { localStorage.clear(); ElMessage.success('已清除'); setTimeout(() => location.reload(), 800); }).catch(() => {}); }
function exportConfig() { const data = JSON.stringify(settings, null, 2); const blob = new Blob([data], { type: 'application/json' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'health-platform-config-' + Date.now() + '.json'; a.click(); URL.revokeObjectURL(url); ElMessage.success('配置已导出'); }
async function testConnection() { ElMessage.info('测试中...'); try { const res = await fetch(settings.apiBaseUrl.replace('/api', '') + '/health'); const data = await res.json(); if (data.status === 'ok') ElMessage.success('✅ 后端连接正常'); else ElMessage.error('❌ 后端响应异常'); } catch (e: any) { ElMessage.error('❌ 连接失败: ' + e.message); } }
function logout() { ElMessageBox.confirm('确定退出登录？', '提示', { type: 'warning' }).then(() => { authStore.logout(); router.push('/login'); }).catch(() => {}); }

onMounted(async () => {
  if (window.electronAPI) appInfo.value = await window.electronAPI.getAppInfo();
  if (authStore.user?.role === 'SUPER_ADMIN') await loadAiConfig();
});
</script>

<style lang="scss" scoped>
.page { padding: 4px; }
.page-header { margin-bottom: 16px; }
.page-header h2 { margin: 0; font-size: 18px; }
.settings-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.setting-section { padding: 24px; }
.setting-section h3 { margin: 0 0 16px; font-size: 15px; display: flex; align-items: center; gap: 6px; }
.ai-section { grid-column: 1 / -1; background: linear-gradient(135deg, rgba(64, 158, 255, 0.06), rgba(103, 194, 58, 0.06)); }
.section-tip { margin: -8px 0 16px; color: #909399; font-size: 12px; line-height: 1.6; }
.ai-actions { display: flex; gap: 8px; margin-top: 4px; }
.ai-status { margin-top: 12px; }
.action-grid { display: flex; flex-direction: column; gap: 8px; }
.action-grid .el-button { width: 100%; justify-content: flex-start; }
</style>
