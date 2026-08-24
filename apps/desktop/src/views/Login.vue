<template>
  <div class="login-container">
    <!-- 动态背景 -->
    <div class="bg-animation">
      <div class="grid-bg"></div>
      <div class="glow-orb glow-1"></div>
      <div class="glow-orb glow-2"></div>
      <div class="glow-orb glow-3"></div>
    </div>

    <!-- 登录卡片 -->
    <div class="login-card glass-card fade-in">
      <div class="brand">
        <div class="logo pulse-glow">
          <el-icon :size="40"><FirstAidKit /></el-icon>
        </div>
        <h1 class="gradient-text">健康管理系统</h1>
        <p class="subtitle">智能 · 精准 · 科学</p>
      </div>

      <el-form ref="formRef" :model="form" :rules="rules" class="login-form" @keydown.enter="handleLogin">
        <el-form-item prop="username">
          <el-input
            v-model="form.username"
            placeholder="用户名"
            size="large"
            :prefix-icon="User"
            clearable
          />
        </el-form-item>
        <el-form-item prop="password">
          <el-input
            v-model="form.password"
            type="password"
            placeholder="密码"
            size="large"
            :prefix-icon="Lock"
            show-password
          />
        </el-form-item>
        <el-form-item>
          <el-input
            v-model="form.apiBaseUrl"
            placeholder="服务器地址"
            size="large"
            :prefix-icon="Connection"
          >
            <template #append>
              <el-button @click="showServerConfig = !showServerConfig">配置</el-button>
            </template>
          </el-input>
        </el-form-item>
        <el-button
          type="primary"
          size="large"
          :loading="loading"
          @click="handleLogin"
          class="login-btn"
        >
          {{ loading ? '登录中...' : '登 录' }}
        </el-button>
      </el-form>

      <div class="footer">
        <p class="text-xs" style="margin-bottom: 6px">
          <el-button link type="primary" @click="showApply = true">还没有账号？申请加盟入驻 →</el-button>
        </p>
        <p class="text-xs text-muted">本检测结果仅供参考，不作为诊断结论</p>
      </div>
    </div>

    <!-- 加盟申请（免登录） -->
    <el-dialog v-model="showApply" title="申请加盟入驻" width="560px" class="apply-dialog">
      <el-alert type="info" :closable="false" show-icon title="提交后总部将审核开通，审核通过后您将获得门店管理账号" style="margin-bottom:16px" />
      <el-form :model="applyForm" label-width="90px">
        <el-form-item label="门店名称" required><el-input v-model="applyForm.storeName" placeholder="例如：XX养生馆" /></el-form-item>
        <el-form-item label="联系人" required><el-input v-model="applyForm.contactName" placeholder="您的姓名" /></el-form-item>
        <el-form-item label="联系电话" required><el-input v-model="applyForm.contactPhone" placeholder="手机号" /></el-form-item>
        <el-form-item label="所在省市">
          <div style="display:flex;gap:8px;width:100%">
            <el-input v-model="applyForm.province" placeholder="省份" />
            <el-input v-model="applyForm.city" placeholder="城市" />
          </div>
        </el-form-item>
        <el-form-item label="备注"><el-input v-model="applyForm.remark" type="textarea" :rows="2" placeholder="可填写您的经营情况、需求等" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showApply = false">取消</el-button>
        <el-button type="primary" :loading="applying" @click="submitApply">提交申请</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { User, Lock, Connection, FirstAidKit } from '@element-plus/icons-vue';
import { useAuthStore } from '@/stores/auth';
import { franchiseApi } from '@/api';

const router = useRouter();
const authStore = useAuthStore();

const formRef = ref();
const loading = ref(false);
const showServerConfig = ref(false);
const showApply = ref(false);
const applying = ref(false);

const form = reactive({
  username: localStorage.getItem('last_username') || 'admin',
  password: '',
  apiBaseUrl: authStore.apiBaseUrl,
});

const rules = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }],
};

const applyForm = reactive({ storeName: '', contactName: '', contactPhone: '', province: '', city: '', remark: '' });

async function submitApply() {
  if (!applyForm.storeName || !applyForm.contactName || !applyForm.contactPhone) {
    ElMessage.warning('请填写门店名称、联系人和联系电话');
    return;
  }
  applying.value = true;
  try {
    await franchiseApi.applyFranchise({ ...applyForm });
    ElMessage.success('加盟申请已提交，请等待总部审核');
    showApply.value = false;
    Object.assign(applyForm, { storeName: '', contactName: '', contactPhone: '', province: '', city: '', remark: '' });
  } catch (e: any) {
    ElMessage.error(e?.message || '提交失败，请稍后再试');
  } finally {
    applying.value = false;
  }
}

async function handleLogin() {
  if (!formRef.value) return;
  await formRef.value.validate(async (valid: boolean) => {
    if (!valid) return;
    loading.value = true;
    try {
      authStore.setApiBaseUrl(form.apiBaseUrl);
      await authStore.login(form.username, form.password);
      localStorage.setItem('last_username', form.username);
      // 保存到本地配置
      if (window.electronAPI) {
        await window.electronAPI.writeConfig({ apiBaseUrl: form.apiBaseUrl });
      }
      ElMessage.success('登录成功');
      router.push('/dashboard');
    } catch (e: any) {
      ElMessage.error(e?.message || '登录失败');
    } finally {
      loading.value = false;
    }
  });
}
</script>

<style lang="scss" scoped>
.login-container {
  width: 100vw;
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
  background: linear-gradient(135deg, #eef7f2 0%, #d1fae5 50%, #ffffff 100%);
}

.bg-animation {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.grid-bg {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgba(5, 150, 105, 0.05) 1px, transparent 1px),
    linear-gradient(90deg, rgba(5, 150, 105, 0.05) 1px, transparent 1px);
  background-size: 60px 60px;
  mask: radial-gradient(ellipse at center, black 0%, transparent 80%);
}

.glow-orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(80px);
  opacity: 0.35;
  animation: float 8s ease-in-out infinite;
}
.glow-1 { width: 400px; height: 400px; background: #059669; top: -100px; left: -100px; }
.glow-2 { width: 500px; height: 500px; background: #0ea5e9; bottom: -150px; right: -150px; animation-delay: -2s; }
.glow-3 { width: 300px; height: 300px; background: #06b6d4; top: 50%; left: 50%; animation-delay: -4s; }

@keyframes float {
  0%, 100% { transform: translate(0, 0); }
  33% { transform: translate(40px, -30px); }
  66% { transform: translate(-30px, 40px); }
}

.login-card {
  position: relative;
  z-index: 1;
  width: 420px;
  padding: 40px;
  background: rgba(255, 255, 255, 0.94);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(5, 150, 105, 0.18);
  box-shadow: 0 16px 48px rgba(15, 118, 110, 0.14);
}

.brand {
  text-align: center;
  margin-bottom: 32px;
}

.logo {
  width: 72px;
  height: 72px;
  margin: 0 auto 16px;
  background: linear-gradient(135deg, #059669 0%, #0ea5e9 100%);
  border-radius: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  box-shadow: 0 8px 24px rgba(5, 150, 105, 0.35);
}

.brand h1 {
  font-size: 28px;
  font-weight: 700;
  margin: 0 0 4px;
}

.subtitle {
  color: var(--text-tertiary);
  font-size: 13px;
  letter-spacing: 4px;
  margin: 0;
}

.login-form {
  margin-top: 24px;
}

.login-btn {
  width: 100%;
  height: 44px;
  font-size: 15px;
  font-weight: 600;
  letter-spacing: 4px;
  background: linear-gradient(135deg, #059669 0%, #0ea5e9 100%) !important;
  border: none !important;
  box-shadow: 0 4px 16px rgba(5, 150, 105, 0.35);
  transition: all 0.3s;
}
.login-btn:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(5, 150, 105, 0.4); }

.footer {
  text-align: center;
  margin-top: 24px;
}
</style>
