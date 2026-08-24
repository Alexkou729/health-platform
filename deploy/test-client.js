const base = 'http://127.0.0.1:3015';
async function main() {
  const login = await fetch(base + '/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: 'admin', password: 'admin123' }) }).then(r => r.json());
  const t = login.data.accessToken;
  const h = { Authorization: 'Bearer ' + t };
  const ps = await fetch(base + '/api/products', { headers: h });
  const hs = await fetch(base + '/api/home-services', { headers: h });
  const st = await fetch(base + '/api/settlements', { headers: h });
  console.log('products:', ps.status, '| home-services:', hs.status, '| settlements:', st.status);

  const sc = await fetch(base + '/api/client/auth/send-code', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phone: '13900009999' }) });
  const scb = await sc.json();
  console.log('send-code:', sc.status, 'code=' + scb.data?.code);

  const lg = await fetch(base + '/api/client/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phone: '13900009999', code: scb.data?.code }) });
  const lgb = await lg.json();
  console.log('client-login:', lg.status, 'token?' + (lgb.data?.token ? 'yes' : 'no'), 'customer:', lgb.data?.customer?.name);
}
main().catch(e => { console.error('ERR', e.message); process.exit(1); });
