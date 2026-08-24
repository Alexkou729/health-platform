/** P0 修复冒烟验收：RBAC / 资源隔离 / 报告 isDemo / 订单状态机 */
const base = 'http://127.0.0.1:3015';

async function api(path, opts = {}) {
  const res = await fetch(base + path, {
    ...opts,
    headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) },
  });
  const body = await res.json().catch(() => ({}));
  return { status: res.status, body };
}

async function login(username, password) {
  const r = await api('/api/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) });
  return r.body?.data?.accessToken;
}

async function main() {
  const admin = await login('admin', 'admin123');
  const h = (t) => ({ Authorization: 'Bearer ' + t });
  let pass = 0, fail = 0;
  const check = (name, cond, extra = '') => {
    if (cond) { pass++; console.log('OK  ' + name + (extra ? ' => ' + extra : '')); }
    else { fail++; console.log('FAIL ' + name + (extra ? ' => ' + extra : '')); }
  };

  // 1. 创建第二家门店 + 商家账号
  const store = await api('/api/stores', { method: 'POST', headers: h(admin), body: JSON.stringify({ name: '测试B店', code: 'STORE-B', contactName: '测试', contactPhone: '13000000000', businessLicense: 'TEST-123' }) });
  const storeB = store.body?.data;
  check('创建门店B(含营业执照)', store.status === 201 && !!storeB?.id, JSON.stringify(storeB?.businessLicense));
  const staff = await api('/api/staff', { method: 'POST', headers: h(admin), body: JSON.stringify({ username: 'storeB', password: '123456', name: 'B店店长', role: 'STORE_ADMIN', storeId: storeB?.id }) });
  const staffB = staff.body?.data;
  check('创建B店商家账号', !!staffB?.id, staffB?.username);

  // 2. 给两家店各建一个客户
  const cA = await api('/api/customers', { method: 'POST', headers: h(admin), body: JSON.stringify({ name: 'A店客户', phone: '13100000001', gender: 1 }) });
  const cB = await api('/api/customers', { method: 'POST', headers: h(admin), body: JSON.stringify({ name: 'B店客户', phone: '13100000002', gender: 2, storeId: storeB.id }) });
  check('创建客户A/B', !!cA.body?.data?.id && !!cB.body?.data?.id);

  // 3. B店商家登录，尝试读 A店客户 -> 应 404
  const storeBToken = await login('storeB', '123456');
  const crossRead = await api('/api/customers/' + cA.body.data.id, { headers: h(storeBToken) });
  check('B店读A店客户应404', crossRead.status === 404, 'HTTP ' + crossRead.status);

  // 4. 员工角色权限：B店商家访问 /stores 写接口 -> 应 403（无 stores 权限）
  const storesWrite = await api('/api/stores', { method: 'POST', headers: h(storeBToken), body: JSON.stringify({ name: '越权店', code: 'X' }) });
  check('B店商家新建门店应403', storesWrite.status === 403, 'HTTP ' + storesWrite.status);

  // 5. 订单状态机：对未支付订单退款应报错
  const order = await api('/api/orders', { method: 'POST', headers: h(storeBToken), body: JSON.stringify({ customerId: cB.body.data.id, items: [] }) });
  const oid = order.body?.data?.id;
  const badRefund = await api('/api/orders/' + oid + '/refund', { method: 'POST', headers: h(storeBToken) });
  check('未支付订单退款应400', badRefund.status === 400, 'HTTP ' + badRefund.status);
  const cancel = await api('/api/orders/' + oid + '/cancel', { method: 'POST', headers: h(storeBToken), body: JSON.stringify({ reason: 'test' }) });
  check('未支付订单取消应200', cancel.status === 200 || cancel.status === 201, 'HTTP ' + cancel.status);
  const badCancel2 = await api('/api/orders/' + oid + '/cancel', { method: 'POST', headers: h(storeBToken), body: JSON.stringify({ reason: 'again' }) });
  check('已取消订单再取消应400', badCancel2.status === 400, 'HTTP ' + badCancel2.status);

  // 6. 检测完成 -> 报告 isDemo（无 rawPayload 时为 true）
  const device = await api('/api/devices', { method: 'POST', headers: h(storeBToken), body: JSON.stringify({ deviceNo: 'QA-TEST-001', vendor: 'Quantum', model: 'QA-13' }) });
  const did = device.body?.data?.id;
  const det = await api('/api/detections', { method: 'POST', headers: h(storeBToken), body: JSON.stringify({ customerId: cB.body.data.id, deviceId: did, duration: 60 }) });
  const detId = det.body?.data?.id;
  await api('/api/detections/' + detId + '/complete', { method: 'POST', headers: h(storeBToken), body: JSON.stringify({ rawPayload: null, overallScore: 80, constitution: 'YANG_DEFICIENCY' }) });
  await new Promise(r => setTimeout(r, 1500)); // 等待异步报告生成
  const reports = await api('/api/reports?page=1&pageSize=5&storeId=' + storeB.id, { headers: h(storeBToken) });
  const r0 = reports.body?.data?.items?.[0];
  check('报告 isDemo=true(无真实数据)', r0?.isDemo === true, 'isDemo=' + r0?.isDemo);

  console.log('\n通过 ' + pass + ' 项，失败 ' + fail + ' 项');
}

main().catch(e => { console.error(e); process.exit(1); });
