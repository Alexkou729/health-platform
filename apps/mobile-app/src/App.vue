<script setup>
import { onLaunch } from '@dcloudio/uni-app';
onLaunch(() => { const token = uni.getStorageSync('access_token'); if (!token) uni.reLaunch({ url: '/pages/my/index' }); });
</script>
<style>
page { background: #0f172a; color: #fff; font-family: -apple-system, "PingFang SC", sans-serif; }
.flex { display: flex; } .text-primary { color: #10b981; } .text-secondary { color: #94a3b8; } .text-success { color: #10b981; }
.text-gradient { background: linear-gradient(135deg, #10b981, #0ea5e9); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; }
</style>
