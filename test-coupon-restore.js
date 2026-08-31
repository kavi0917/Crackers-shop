/* ============================================================
   VENDHAN CRACKERS — Coupon Model Restore Verification
   Requires backend running on port 5000 (with Coupon model).
   Run: node test-coupon-restore.js
   ============================================================ */

const BASE = 'http://localhost:5000/api';
const TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjZhN2RiZWNhNDU3NWVjOTJhNTU2NWJlYyIsImVtYWlsIjoicmFtZXNoQGV4YW1wbGUuY29tIiwicm9sZSI6ImN1c3RvbWVyIiwiaWF0IjoxNzg2ODgxMzE1LCJleHAiOjE3ODc0ODYxMTV9.lh8RpgyRUyWXMRXzeSt_Sl_fo3SRd0c5yixZHLIHbus';

let passed = 0;
let failed = 0;
const failures = [];

function log(name, status, data, expectStatus = null) {
  const ok = expectStatus ? status === expectStatus : status >= 200 && status < 300;
  if (ok) {
    passed++;
    console.log(`✅ [${status}] ${name}`);
  } else {
    failed++;
    failures.push({ name, status, data, expectStatus });
    console.log(`❌ [${status}] ${name}${expectStatus ? ` (expected ${expectStatus})` : ''}`);
    console.log(JSON.stringify(data, null, 2).slice(0, 500));
  }
}

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

async function main() {
  console.log('========== COUPON MODEL RESTORE VERIFICATION ==========\n');

  /* ---------- 1. VALID PERCENTAGE COUPON ---------- */
  console.log('--- 1. VALID PERCENTAGE COUPON (WELCOME10) ---\n');
  const pct = await req('POST', '/coupon/validate', { code: 'WELCOME10', subtotal: 1000 }, TOKEN);
  log('Valid percentage coupon returns 200', pct.status, pct.data, 200);
  console.log(`   discountAmount: ${pct.data?.discountAmount ?? pct.data?.data?.discountAmount ?? '?'}`);
  console.log(`   Expected: ${Math.min(1000 * 0.10, 150)} (10% of 1000 capped at 150)`);
  console.log(`   Coupon info returned: ${pct.data?.coupon ? 'YES' : 'NO'}`);
  console.log(`   success: ${pct.data?.success}`);

  /* ---------- 2. VALID FIXED COUPON ---------- */
  console.log('\n--- 2. VALID FIXED COUPON (SAVE100) ---\n');
  const fixed = await req('POST', '/coupon/validate', { code: 'SAVE100', subtotal: 1000 }, TOKEN);
  log('Valid fixed coupon returns 200', fixed.status, fixed.data, 200);
  console.log(`   discountAmount: ${fixed.data?.discountAmount ?? fixed.data?.data?.discountAmount ?? '?'}`);
  console.log(`   Expected: 100 (fixed)`);

  /* ---------- 3. INVALID COUPON ---------- */
  console.log('\n--- 3. INVALID COUPON ---\n');
  const inv = await req('POST', '/coupon/validate', { code: 'NOTACOUPON', subtotal: 1000 }, TOKEN);
  log('Invalid coupon rejected (404)', inv.status, inv.data, 404);
  const invMsg = JSON.stringify(inv.data || '');
  console.log(`   Friendly error (no 500/internal leak): ${!/findOne|TypeError|undefined/i.test(invMsg) ? '✅' : '❌'}`);
  console.log(`   message: ${inv.data?.message}`);

  /* ---------- 4. MINIMUM-ORDER COUPON ---------- */
  console.log('\n--- 4. MINIMUM-ORDER COUPON (SAVE100 requires min 500) ---\n');
  const minFail = await req('POST', '/coupon/validate', { code: 'SAVE100', subtotal: 300 }, TOKEN);
  log('Below minimum rejected (400)', minFail.status, minFail.data, 400);
  console.log(`   message: ${minFail.data?.message}`);

  const minPass = await req('POST', '/coupon/validate', { code: 'SAVE100', subtotal: 600 }, TOKEN);
  log('Above minimum accepted (200)', minPass.status, minPass.data, 200);
  console.log(`   discountAmount: ${minPass.data?.discountAmount ?? '?'}`);

  /* ---------- 5. USAGE-LIMIT COUPON ---------- */
  console.log('\n--- 5. USAGE-LIMIT COUPON (LIMITED10: usageLimit=1, usedCount=0) ---\n');
  const usage1 = await req('POST', '/coupon/validate', { code: 'LIMITED10', subtotal: 1000 }, TOKEN);
  log('Usage-limited coupon with usedCount < usageLimit accepted (200)', usage1.status, usage1.data, 200);

  // For the "usedCount >= usageLimit → rejected" case, add a second test coupon
  // with usageLimit=1, usedCount=1 to verify rejection without mutating LIMITED10
  const exhausted = await req('POST', '/admin-nonexistent', {}, TOKEN);
  // Test exhausted state via direct DB verification separately — here we test
  // that the route's $expr correctly rejects when usedCount >= usageLimit.
  // We'll insert a dedicated exhausted coupon via mongosh after this script,
  // and test it here if present.
  const exhaustedCode = 'EXHAUSTED10';
  const exhaustedTest = await req('POST', '/coupon/validate', { code: exhaustedCode, subtotal: 1000 }, TOKEN);
  if (exhaustedTest.status === 404) {
    console.log(`⏭  ${exhaustedCode} not present — will be tested via dedicated insert.`);
  } else {
    log('Used-limit-reached coupon rejected (404)', exhaustedTest.status, exhaustedTest.data, 404);
  }

  /* ---------- SUMMARY ---------- */
  console.log('\n========================================================');
  console.log('COUPON RESTORE VERIFICATION SUMMARY');
  console.log('========================================================');
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  if (failures.length > 0) {
    failures.forEach(f => console.log(`  ❌ ${f.name} — status ${f.status}${f.expectStatus ? ` (expected ${f.expectStatus})` : ''}`));
  }
  console.log('========================================================');
}

main().catch(err => {
  console.error('Test script error:', err);
  process.exit(1);
});