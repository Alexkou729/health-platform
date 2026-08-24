const base = 'http://127.0.0.1:3015';
let pass = 0, fail = 0;
function check(name, cond, extra = '') {
  if (cond) { pass++; console.log('OK  ' + name + (extra ? ' => ' + extra : '')); }
  else { fail++; console.log('FAIL ' + name + (extra ? ' => ' + extra : '')); }
}
async function main() {
  // 登录
  const login = await fetch(base + '/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: 'admin', password: 'admin123' }) }).then(r => r.json());
  const token = login.data?.accessToken;
  check('admin 登录', login.code === 0 && !!token);
  const h = { Authorization: 'Bearer ' + token };

  // 健康 + H5
  const health = await fetch(base + '/health');
  check('后端健康', health.status === 200);
  const h5 = await fetch(base + '/');
  check('H5 首页', h5.status === 200);

  // AI 配置
  const ai = await fetch(base + '/api/ai-config', { headers: h }).then(r => r.json());
  check('AI 配置', ai.code === 0 && ai.data?.provider === 'minimax', ai.data?.provider + '/' + ai.data?.model);

  // 核心查询接口
  const gets = [
    ['客户', '/api/customers'], ['报告', '/api/reports'], ['订单', '/api/orders'],
    ['套餐', '/api/packages'], ['设备', '/api/devices'], ['员工', '/api/staff'],
    ['门店', '/api/stores'], ['任务', '/api/tasks'], ['预约', '/api/appointments'],
    ['调理方案', '/api/care-plans'], ['理调项目', '/api/recipes'], ['优惠券', '/api/coupons'],
    ['商品', '/api/products'], ['上门服务', '/api/home-services'], ['结算', '/api/settlements'],
    ['工单', '/api/service-requests'], ['订阅', '/api/subscriptions'], ['账单', '/api/invoices'],
  ];
  for (const [label, ep] of gets) {
    const r = await fetch(base + ep, { headers: h });
    check(label + '接口', r.status === 200, 'HTTP ' + r.status);
  }

  // 客户端电话登录
  const sc = await fetch(base + '/api/client/auth/send-code', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phone: '13800008888' }) }).then(r => r.json());
  const code = sc.data?.code;
  const cl = await fetch(base + '/api/client/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phone: '13800008888', code }) }).then(r => r.json());
  check('客户端电话登录', cl.code === 0 && !!cl.data?.token, cl.data?.customer?.name);
  const ct = cl.data?.token;
  const ch = { Authorization: 'Bearer ' + ct };
  const cp = await fetch(base + '/api/client/products', { headers: ch });
  const chs = await fetch(base + '/api/client/home-services', { headers: ch });
  check('客户端商品/上门服务', cp.status === 200 && chs.status === 200);

  console.log('\n通过 ' + pass + ' 项，失败 ' + fail + ' 项');
}
main().catch(e => { console.error('ERR', e.message); process.exit(1); });
