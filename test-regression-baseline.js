/* ============================================================
   VENDHAN CRACKERS — Coupon Restore Regression Baseline
   Requires backend running on port 5000.
   Run: node test-regression-baseline.js
   ============================================================ */

const BASE = 'http://localhost:5000/api';

async function req(method, path, body, token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(BASE + path, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  });
  let data = {};
  try { data = await res.json(); } catch (e) { /* empty */ }
  return { status: res.status, data };
}

function check(name, status, expectOKorStatus) {
  const ok = typeof expectOKorStatus === 'number'
    ? status === expectOKorStatus
    : (status >= 200 && status < 300) === expectOKorStatus;
  console.log(`${ok ? '✅' : '❌'} [${status}] ${name}`);
}

async function main() {
  console.log('========== COUPON RESTORE — REGRESSION BASELINE ==========\n');

  const login = await req('POST', '/auth/login', { email: 'ramesh@example.com', password: 'customer123' });
  const token = login.data?.data?.token || '';
  check('Customer login succeeds', login.status, true);

  const badLogin = await req('POST', '/auth/login', { email: 'ramesh@example.com', password: 'wrongpass1' });
  check('Invalid login rejected (401)', badLogin.status, 401);

  const me = await req('GET', '/auth/me', null, token);
  check('GET /auth/me', me.status, true);

  const products = await req('GET', '/products?limit=3', null, null);
  check('GET /products', products.status, true);

  const categories = await req('GET', '/categories', null, null);
  check('GET /categories', categories.status, true);

  const home = await req('GET', '/home', null, null);
  check('GET /home', home.status, true);

  const cart = await req('GET', '/cart', null, token);
  check('GET /cart (authenticated)', cart.status, true);

  const noTokenCart = await req('GET', '/cart', null, null);
  check('GET /cart (unauthenticated) blocked (401)', noTokenCart.status, 401);

  const badCheckout = await req('POST', '/checkout/validate', {
    name: '', phone: '', email: '', address: '', city: '', state: '', pincode: ''
  }, token);
  // Project convention: express-validator failures return 422 (Unprocessable Entity)
  check('POST /checkout/validate (invalid data rejected 422)', badCheckout.status, 422);

  console.log('\n========== REGRESSION BASELINE COMPLETE ==========');
}

main().catch(err => {
  console.error('Test script error:', err);
  process.exit(1);
});