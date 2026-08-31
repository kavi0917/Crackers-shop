/* ============================================================
   VENDHAN CRACKERS — Phase 9 Sales Analytics & Reporting Tests
   Requires the backend server to be running on port 5000.
   Run: node test-phase9-reports.js
   ============================================================ */

const BASE = 'http://localhost:5000/api';

let passed = 0;
let failed = 0;
const failures = [];

function log(name, status, data, expectStatus = null) {
  const ok = expectStatus
    ? status === expectStatus
    : typeof status === 'boolean'
      ? status === true
      : status >= 200 && status < 300;
  if (ok) {
    passed++;
    console.log(`✅ ${name}`);
  } else {
    failed++;
    failures.push({ name, status, data, expectStatus });
    console.log(`❌ ${name}${expectStatus ? ` (expected ${expectStatus})` : ''}`);
    if (data !== undefined && data !== null) {
      console.log(JSON.stringify(data, null, 2).slice(0, 500));
    }
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
  console.log('========== PHASE 9 SALES ANALYTICS & REPORTING TESTS ==========\n');

  // ---------- ADMIN LOGIN ----------
  const login = await req('POST', '/admin/auth/login', { email: 'admin@vendhancrackers.in', password: 'admin123' });
  log('Admin login', login.status, login.data);
  const adminToken = login.data?.data?.token;

  if (!adminToken) {
    console.log('❌ No admin token obtained — aborting');
    printSummary();
    return;
  }

  // ---------- 1. UNAUTHORIZED ACCESS REJECTION ----------
  console.log('\n--- 1. Unauthorized Access ---\n');
  const noAuth = await req('GET', '/admin/reports/sales');
  log('Report without auth rejected (401)', noAuth.status, noAuth.data, 401);

  // ---------- 2. EMPTY SALES PERIOD ----------
  console.log('\n--- 2. Empty Sales Period ---\n');
  const emptyReport = await req('GET', '/admin/reports/sales?period=this_month', null, adminToken);
  log('Empty period report loads', emptyReport.status, emptyReport.data);
  const emptySummary = emptyReport.data?.data?.summary;
  if (emptySummary) {
    log('Report structure has summary object', !!emptySummary, emptySummary);
    log('Report has valid totalOrders field', typeof emptySummary.totalOrders === 'number', emptySummary);
    log('Average order value is safe (0 or number)', typeof emptySummary.averageOrderValue === 'number' && !isNaN(emptySummary.averageOrderValue), emptySummary.averageOrderValue);
  }

  // ---------- 3. VALIDATION ----------
  console.log('\n--- 3. Validation ---\n');
  const badDate = await req('GET', '/admin/reports/sales?from=invalid-date', null, adminToken);
  log('Invalid from date rejected (400)', badDate.status, badDate.data, 400);

  const badRange = await req('GET', '/admin/reports/sales?from=2026-12-31&to=2026-01-01', null, adminToken);
  log('from > to rejected (400)', badRange.status, badRange.data, 400);

  const badType = await req('GET', '/admin/reports/sales?customerType=invalid', null, adminToken);
  log('Invalid customerType rejected (400)', badType.status, badType.data, 400);

  const badCategory = await req('GET', '/admin/reports/sales?category=invalid', null, adminToken);
  log('Invalid category ID rejected (400)', badCategory.status, badCategory.data, 400);

  // ---------- 4. MAIN REPORT STRUCTURE ----------
  console.log('\n--- 4. Main Report Structure ---\n');
  const report = await req('GET', '/admin/reports/sales?period=all', null, adminToken);
  log('Full report loads', report.status, report.data);
  const r = report.data?.data;
  if (r) {
    log('Has summary object', !!r.summary && typeof r.summary.totalSales === 'number', r.summary);
    log('Has monthly array', Array.isArray(r.monthly), r.monthly);
    log('Has categories array', Array.isArray(r.categories), r.categories);
    log('Has retailWholesale object', !!r.retailWholesale, r.retailWholesale);
    log('Has reseller object', !!r.reseller, r.reseller);
    log('Has topProducts array', Array.isArray(r.topProducts), r.topProducts);
    log('Has orderStatus array', Array.isArray(r.orderStatus), r.orderStatus);
    log('Has discountAnalysis object', !!r.discountAnalysis, r.discountAnalysis);
  }

  // ---------- 5. DATE FILTERING ----------
  console.log('\n--- 5. Date Filtering ---\n');
  const customRange = await req('GET', '/admin/reports/sales?from=2026-01-01&to=2026-12-31', null, adminToken);
  log('Custom date range works', customRange.status, customRange.data);

  const yearFilter = await req('GET', '/admin/reports/sales?year=2026', null, adminToken);
  log('Year filter works', yearFilter.status, yearFilter.data);

  // ---------- 6. CUSTOMER TYPE FILTER ----------
  console.log('\n--- 6. Customer Type Filter ---\n');
  const retailOnly = await req('GET', '/admin/reports/sales?customerType=retail', null, adminToken);
  log('Retail filter works', retailOnly.status, retailOnly.data);

  const wholesaleOnly = await req('GET', '/admin/reports/sales?customerType=wholesale', null, adminToken);
  log('Wholesale filter works', wholesaleOnly.status, wholesaleOnly.data);

  // ---------- 7. PRODUCTS REPORT ----------
  console.log('\n--- 7. Products Report ---\n');
  const productsReport = await req('GET', '/admin/reports/products?period=all', null, adminToken);
  log('Products report loads', productsReport.status, productsReport.data);

  // ---------- 8. CATEGORIES REPORT ----------
  console.log('\n--- 8. Categories Report ---\n');
  const categoriesReport = await req('GET', '/admin/reports/categories?period=all', null, adminToken);
  log('Categories report loads', categoriesReport.status, categoriesReport.data);

  // ---------- 9. CSV EXPORT ----------
  console.log('\n--- 9. CSV Export ---\n');
  const csvRes = await fetch(BASE + '/admin/reports/export/csv?period=all', {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  const csvText = await csvRes.text();
  log('CSV export returns 200', csvRes.status, { text: csvText.slice(0, 100) });
  if (csvRes.status === 200) {
    log('CSV contains report header', csvText.includes('VENDHAN CRACKERS'), { hasHeader: csvText.includes('VENDHAN CRACKERS') });
    log('CSV contains summary section', csvText.includes('SUMMARY'), { hasSummary: csvText.includes('SUMMARY') });
  }

  // ---------- 10. PDF EXPORT ----------
  console.log('\n--- 10. PDF Export ---\n');
  const pdfRes = await fetch(BASE + '/admin/reports/export/pdf?period=all', {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  const pdfBuffer = await pdfRes.arrayBuffer();
  log('PDF export returns 200', pdfRes.status, { size: pdfBuffer.byteLength });
  if (pdfRes.status === 200) {
    const header = new Uint8Array(pdfBuffer.slice(0, 5));
    const isPdf = header[0] === 0x25 && header[1] === 0x50 && header[2] === 0x44 && header[3] === 0x46;
    log('PDF has valid %PDF header', isPdf, { header: Array.from(header) });
  }

  // ---------- 11. CLIENT QUERY MANIPULATION PROTECTION ----------
  console.log('\n--- 11. Client Query Manipulation Protection ---\n');
  const manipulated = await req('GET', '/admin/reports/sales?period=all&from=2020-01-01&to=2030-12-31', null, adminToken);
  log('Large date range rejected (400)', manipulated.status, manipulated.data, 400);

  // ---------- 12. ZERO-ORDER / DIVISION-BY-ZERO ----------
  console.log('\n--- 12. Zero-Order Handling ---\n');
  const zeroOrder = await req('GET', '/admin/reports/sales?from=1990-01-01&to=1990-12-31', null, adminToken);
  log('Zero-order period loads', zeroOrder.status, zeroOrder.data);
  const zeroSummary = zeroOrder.data?.data?.summary;
  if (zeroSummary) {
    log('Zero-order report has summary', !!zeroSummary, zeroSummary);
    log('Average order value is 0 (no div by zero)', zeroSummary.averageOrderValue === 0, zeroSummary.averageOrderValue);
    log('Total sales is 0', zeroSummary.totalSales === 0, zeroSummary.totalSales);
    log('Total orders is 0', zeroSummary.totalOrders === 0, zeroSummary.totalOrders);
  }

  printSummary();
}

function printSummary() {
  console.log(`\n========== SUMMARY ==========`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  if (failures.length > 0) {
    console.log('\nFailures:');
    failures.forEach((f, i) => {
      console.log(`  ${i + 1}. ${f.name} [${f.status}]${f.expectStatus ? ` (expected ${f.expectStatus})` : ''}`);
    });
  }
  console.log(`\n${failed === 0 ? 'ALL PHASE 9 TESTS PASSED' : 'SOME PHASE 9 TESTS FAILED'}`);
}

main().catch((e) => {
  console.error('Test runner error:', e);
  process.exit(1);
});