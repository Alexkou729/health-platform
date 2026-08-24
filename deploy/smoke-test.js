/**
 * 全接口冒烟测试：登录后逐个调用主要查询/统计接口，捕获 500/异常
 * 运行：node smoke-test.js [baseUrl]
 */
const base = process.argv[2] || 'http://127.0.0.1:3015';

async function main() {
  const login = await fetch(base + '/api/auth/login', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: 'admin123' }),
  }).then(r => r.json());
  const token = login?.data?.accessToken;
  if (!token) { console.log('登录失败', JSON.stringify(login).slice(0, 200)); return; }
  const h = { Authorization: 'Bearer ' + token };

  const gets = [
    '/api/detections?page=1&pageSize=5',
    '/api/devices?page=1&pageSize=5',
    '/api/stores',
    '/api/tasks?page=1&pageSize=5',
    '/api/tasks/my-todos',
    '/api/tasks/my-stats',
    '/api/dashboard/overview',
    '/api/dashboard/constitution',
    '/api/dashboard/trend?days=7',
    '/api/performance/dashboard',
    '/api/performance/staff?period=2026-08',
    '/api/reports/statistics',
    '/api/devices/statistics',
    '/api/customers/statistics',
    '/api/orders/statistics',
    '/api/recipes?page=1&pageSize=20',
    '/api/packages?page=1&pageSize=20',
    '/api/subscriptions',
    '/api/invoices',
    '/api/ai-usage',
    '/api/franchise/dashboard',
    '/api/franchise/applications',
    '/api/ai-config',
  ];

  let fail = 0;
  for (const ep of gets) {
    try {
      const res = await fetch(base + ep, { headers: h });
      const body = await res.json();
      const ok = res.status === 200 && body?.code === 0;
      if (!ok) fail++;
      console.log((ok ? 'OK  ' : 'FAIL') + ' ' + res.status + ' ' + ep + ' => ' + JSON.stringify(body).slice(0, 90));
    } catch (e) {
      fail++;
      console.log('ERR  ' + ep + ' => ' + e.message);
    }
  }

  const posts = [
    ['/api/advice/generate', { constitution: 'YANG_DEFICIENCY' }],
  ];
  for (const [ep, data] of posts) {
    try {
      const res = await fetch(base + ep, { method: 'POST', headers: { ...h, 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
      const body = await res.json();
      const ok = res.status === 200 && body?.code === 0;
      if (!ok) fail++;
      console.log((ok ? 'OK  ' : 'FAIL') + ' ' + res.status + ' ' + ep + ' => ' + JSON.stringify(body).slice(0, 90));
    } catch (e) {
      fail++;
      console.log('ERR  ' + ep + ' => ' + e.message);
    }
  }

  console.log(fail === 0 ? '\n✅ 全部接口冒烟测试通过' : '\n❌ 有 ' + fail + ' 个接口异常');
}

main().catch(e => { console.error(e); process.exit(1); });
