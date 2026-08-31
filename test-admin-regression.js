/* ============================================================
   VENDHAN CRACKERS — Phase 10C-3 Admin Full Regression
   Requires backend running on port 5000.
   Run: node test-admin-regression.js
   ============================================================ */

const BASE = 'http://localhost:5000/api';

let passed = 0;
let failed = 0;
const failures = [];

function log(name, status, data, expectStatus = null) {
  const ok = expectStatus
    ? status === expectStatus
    : status >= 200 && status < 300;
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

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// Check for internal error leaks
function checkNoLeak(data, label) {
  const msg = JSON.stringify(data || '');
  const leaked = /MongoServerError|MongoError|E11000|JWT|stack trace|TypeError|ReferenceError|at\s+\w+\.js/i.test(msg);
  console.log(`   ${label} — no internal leak: ${!leaked ? '✅' : '❌'}`);
  if (leaked) {
    failed++;
    failures.push({ name: `${label} — internal leak detected`, status: 'LEAK', data });
  }
}

async function main() {
  console.log('========== PHASE 10C-3 ADMIN FULL REGRESSION ==========\n');

  /* ---------- 1. HEALTH ---------- */
  console.log('--- 1. HEALTH ---\n');

  const health = await req('GET', '/health', null, null);
  log('GET /api/health → 200', health.status, health.data, 200);
  console.log(`   Message: ${health.data?.message ?? '?'}`);

  /* ---------- 2. ADMIN LOGIN ---------- */
  console.log('\n--- 2. ADMIN LOGIN ---\n');

  // Invalid credentials
  const badLogin = await req('POST', '/admin/auth/login', { email: 'admin@vendhancrackers.in', password: 'wrongpass' });
  log('Invalid admin credentials rejected', badLogin.status, badLogin.data, 401);
  checkNoLeak(badLogin.data, 'Invalid login error');

  // Valid login
  const login = await req('POST', '/admin/auth/login', { email: 'admin@vendhancrackers.in', password: 'admin123' });
  log('Valid admin login succeeds', login.status, login.data);
  const adminToken = login.data?.data?.token;
  const adminObj = login.data?.data?.admin;

  if (!adminToken) {
    console.log('❌ No admin token obtained — aborting further tests that need auth');
    printSummary();
    return;
  }

  if (adminObj) {
    console.log(`   Admin name: ${adminObj.name}`);
    console.log(`   Admin email: ${adminObj.email}`);
    console.log(`   Admin role: ${adminObj.role}`);
    console.log(`   Password exposed in response: ${adminObj.password ? '❌ YES' : '✅ NO'}`);
    if (adminObj.password) {
      failed++;
      failures.push({ name: 'Admin password exposed in login response', status: 'LEAK', data: adminObj });
    }
  }

  // Validation error (missing fields)
  const noFields = await req('POST', '/admin/auth/login', {});
  log('Login with missing fields rejected (422)', noFields.status, noFields.data, 422);
  checkNoLeak(noFields.data, 'Validation error');

  /* ---------- 3. ADMIN SESSION ---------- */
  console.log('\n--- 3. ADMIN SESSION ---\n');

  const me = await req('GET', '/admin/auth/me', null, adminToken);
  log('GET /admin/auth/me with token → 200', me.status, me.data, 200);
  const meAdmin = me.data?.data?.admin;
  if (meAdmin) {
    console.log(`   Admin name: ${meAdmin.name}`);
    console.log(`   Admin email: ${meAdmin.email}`);
    console.log(`   Password exposed: ${meAdmin.password ? '❌ YES' : '✅ NO'}`);
    if (meAdmin.password) {
      failed++;
      failures.push({ name: 'Admin password exposed in /me response', status: 'LEAK', data: meAdmin });
    }
  }

  // Unauthorized without token
  const noToken = await req('GET', '/admin/auth/me', null, null);
  log('GET /admin/auth/me without token → 401', noToken.status, noToken.data, 401);
  checkNoLeak(noToken.data, 'Unauthorized error');

  /* ---------- 4. ADMIN DASHBOARD ---------- */
  console.log('\n--- 4. ADMIN DASHBOARD ---\n');

  // Summary
  const summary = await req('GET', '/admin/dashboard/summary', null, adminToken);
  log('Dashboard summary loads', summary.status, summary.data);
  const sumData = summary.data?.data;
  if (sumData) {
    console.log(`   Total revenue: ${sumData.totalRevenue ?? sumData.revenue ?? '?'}`);
    console.log(`   Total orders: ${sumData.totalOrders ?? '?'}`);
    console.log(`   Total products: ${sumData.totalProducts ?? '?'}`);
    console.log(`   Total customers: ${sumData.totalCustomers ?? '?'}`);
    // Check for NaN
    const sumStr = JSON.stringify(sumData);
    console.log(`   No NaN values: ${!/NaN/.test(sumStr) ? '✅' : '❌'}`);
    if (/NaN/.test(sumStr)) {
      failed++;
      failures.push({ name: 'NaN in dashboard summary', status: 'NAN', data: sumData });
    }
  }

  // Sales
  const sales = await req('GET', '/admin/dashboard/sales', null, adminToken);
  log('Dashboard sales loads', sales.status, sales.data);
  const salesData = sales.data?.data;
  if (salesData) {
    const salesStr = JSON.stringify(salesData);
    console.log(`   No NaN values: ${!/NaN/.test(salesStr) ? '✅' : '❌'}`);
    if (/NaN/.test(salesStr)) {
      failed++;
      failures.push({ name: 'NaN in dashboard sales', status: 'NAN', data: salesData });
    }
    // Check labels
    const labels = salesData.labels || salesData.dates || salesData.periods || [];
    console.log(`   Labels present: ${labels.length > 0 ? '✅' : '❌'}`);
    const undefinedLabels = labels.some(l => l === undefined || l === null || l === 'undefined');
    console.log(`   No undefined labels: ${!undefinedLabels ? '✅' : '❌'}`);
    if (undefinedLabels) {
      failed++;
      failures.push({ name: 'Undefined labels in sales chart', status: 'UNDEFINED', data: salesData });
    }
  }

  // Sales with period filter
  const salesToday = await req('GET', '/admin/dashboard/sales?period=today', null, adminToken);
  log('Sales period=today works', salesToday.status, salesToday.data);
  const salesWeek = await req('GET', '/admin/dashboard/sales?period=week', null, adminToken);
  log('Sales period=week works', salesWeek.status, salesWeek.data);
  const salesMonth = await req('GET', '/admin/dashboard/sales?period=month', null, adminToken);
  log('Sales period=month works', salesMonth.status, salesMonth.data);
  const salesYear = await req('GET', '/admin/dashboard/sales?period=year', null, adminToken);
  log('Sales period=year works', salesYear.status, salesYear.data);
  const salesAll = await req('GET', '/admin/dashboard/sales?period=all', null, adminToken);
  log('Sales period=all works', salesAll.status, salesAll.data);

  // Order stats (donut)
  const orderStats = await req('GET', '/admin/dashboard/orders', null, adminToken);
  log('Order status donut loads', orderStats.status, orderStats.data);
  const osData = orderStats.data?.data;
  if (osData) {
    const osStr = JSON.stringify(osData);
    console.log(`   No NaN values: ${!/NaN/.test(osStr) ? '✅' : '❌'}`);
    if (/NaN/.test(osStr)) {
      failed++;
      failures.push({ name: 'NaN in order status donut', status: 'NAN', data: osData });
    }
    // Check statuses
    const statuses = osData.statuses || osData.byStatus || osData;
    console.log(`   Status data: ${JSON.stringify(statuses).slice(0, 200)}`);
  }

  // Category sales donut
  const catSales = await req('GET', '/admin/dashboard/category-sales', null, adminToken);
  log('Category sales donut loads', catSales.status, catSales.data);
  const csData = catSales.data?.data;
  if (csData) {
    const csStr = JSON.stringify(csData);
    console.log(`   No NaN values: ${!/NaN/.test(csStr) ? '✅' : '❌'}`);
    if (/NaN/.test(csStr)) {
      failed++;
      failures.push({ name: 'NaN in category sales donut', status: 'NAN', data: csData });
    }
    const cats = csData.categories || csData.items || csData.data || [];
    if (Array.isArray(cats)) {
      console.log(`   Categories count: ${cats.length}`);
      const undefinedNames = cats.some(c => !c.category && !c.name && !c.categoryName);
      console.log(`   No undefined category names: ${!undefinedNames ? '✅' : '❌'}`);
      if (undefinedNames) {
        failed++;
        failures.push({ name: 'Undefined category names in donut', status: 'UNDEFINED', data: csData });
      }
      const firstCat = cats[0];
      if (firstCat) {
        console.log(`   Sample category: ${firstCat.category || firstCat.name || firstCat.categoryName} — ₹${firstCat.revenue}`);
      }
    }
  }

  // Top products
  const topProducts = await req('GET', '/admin/dashboard/top-products', null, adminToken);
  log('Top products loads', topProducts.status, topProducts.data);
  const tpData = topProducts.data?.data;
  if (tpData) {
    const tpList = tpData.products || tpData.items || tpData.topProducts || [];
    if (Array.isArray(tpList)) {
      console.log(`   Top products count: ${tpList.length}`);
      const blankNames = tpList.some(p => !p.productName && !p.name || p.productName === 'undefined');
      console.log(`   No blank product names: ${!blankNames ? '✅' : '❌'}`);
      if (blankNames) {
        failed++;
        failures.push({ name: 'Blank product name in top products', status: 'BLANK', data: tpData });
      }
      const noImage = tpList.some(p => !p.image && !p.mainImage && !(p.images && p.images.length));
      console.log(`   Products have images: ${!noImage ? '✅' : '❌'}`);
      const firstTp = tpList[0];
      if (firstTp) {
        console.log(`   Sample: ${firstTp.productName || firstTp.name} — qty: ${firstTp.quantitySold} — ₹${firstTp.revenue}`);
      }
    }
  }

  // Recent orders
  const recentOrders = await req('GET', '/admin/dashboard/recent-orders', null, adminToken);
  log('Recent orders loads', recentOrders.status, recentOrders.data);
  const roData = recentOrders.data?.data;
  if (roData) {
    const roList = roData.orders || roData.recentOrders || roData.items || [];
    if (Array.isArray(roList)) {
      console.log(`   Recent orders count: ${roList.length}`);
      const objObj = roList.some(o => {
        const name = o.customerName || o.customer?.name || o.user?.name || '';
        return name === '[object Object]';
      });
      console.log(`   No [object Object] customer names: ${!objObj ? '✅' : '❌'}`);
      if (objObj) {
        failed++;
        failures.push({ name: '[object Object] customer name in recent orders', status: 'OBJECT', data: roData });
      }
      const blankNames = roList.some(o => !o.customerName && !o.customer?.name && !o.user?.name);
      console.log(`   Customer names present: ${!blankNames ? '✅' : '❌'}`);
    }
  }

  // Low stock
  const lowStock = await req('GET', '/admin/dashboard/low-stock', null, adminToken);
  log('Low stock loads', lowStock.status, lowStock.data);
  const lsData = lowStock.data?.data;
  if (lsData) {
    const lsList = lsData.products || lsData.items || lsData.lowStock || [];
    if (Array.isArray(lsList)) {
      console.log(`   Low stock count: ${lsList.length}`);
      const undefinedStatus = lsList.some(p => !p.status && !p.stockStatus);
      console.log(`   No undefined stock status: ${!undefinedStatus ? '✅' : '❌'}`);
      if (undefinedStatus) {
        failed++;
        failures.push({ name: 'Undefined stock status in low stock', status: 'UNDEFINED', data: lsData });
      }
      const firstLs = lsList[0];
      if (firstLs) {
        console.log(`   Sample: ${firstLs.name} — stock: ${firstLs.stock} — status: ${firstLs.status || firstLs.stockStatus}`);
      }
    }
  }

  /* ---------- 5. ADMIN PRODUCTS ---------- */
  console.log('\n--- 5. ADMIN PRODUCTS ---\n');

  const products = await req('GET', '/admin/products', null, adminToken);
  log('Admin products list loads', products.status, products.data);
  const prodList = products.data?.data?.products || products.data?.data || [];
  console.log(`   Products count: ${Array.isArray(prodList) ? prodList.length : '?'}`);

  // Get a valid category ID for product creation
  const catForProd = await req('GET', '/admin/categories', null, adminToken);
  const catForProdList = catForProd.data?.data?.categories || catForProd.data?.data || [];
  const catForProdId = catForProdList[0]?.id || catForProdList[0]?._id;
  console.log(`   Using category ID for product: ${catForProdId}`);

  // Create test product (disposable)
  const testProductName = `Regression Test Product ${Date.now()}`;
  const createProd = await req('POST', '/admin/products', {
    name: testProductName,
    description: 'Disposable regression test product',
    price: 99,
    stock: 10,
    reorderLevel: 5,
    category: catForProdId,
    images: ['https://images.unsplash.com/photo-1513151233558-d860c5398176?w=500&q=80']
  }, adminToken);
  log('Create product succeeds', createProd.status, createProd.data);
  const newProd = createProd.data?.data?.product || createProd.data?.data;
  const newProdId = newProd?.id || newProd?._id;
  console.log(`   New product ID: ${newProdId}`);

  // Validation error
  const badProd = await req('POST', '/admin/products', { name: '', price: -5 }, adminToken);
  log('Invalid product rejected (422)', badProd.status, badProd.data, 422);
  checkNoLeak(badProd.data, 'Product validation error');

  // Edit test product
  if (newProdId) {
    const editProd = await req('PUT', `/admin/products/${newProdId}`, {
      name: testProductName + ' EDITED',
      description: 'Edited regression test product',
      price: 129,
      stock: 15,
      reorderLevel: 5,
      category: catForProdId
    }, adminToken);
    log('Edit product succeeds', editProd.status, editProd.data);

    // Verify persistence
    const getProd = await req('GET', `/admin/products/${newProdId}`, null, adminToken);
    log('Get edited product', getProd.status, getProd.data);
    const gotProd = getProd.data?.data?.product || getProd.data?.data;
    if (gotProd) {
      console.log(`   Product name after edit: ${gotProd.name}`);
      console.log(`   Price after edit: ₹${gotProd.price}`);
      console.log(`   Stock after edit: ${gotProd.stock}`);
    }

    // Delete test product (Part 2 architecture: hard-delete the Product document ONLY)
    const delProd = await req('DELETE', `/admin/products/${newProdId}`, null, adminToken);
    log('Delete test product succeeds', delProd.status, delProd.data);
    console.log(`   Delete message: ${delProd.data?.data?.message ?? delProd.data?.message ?? '?'}`);

    // Verify product is HARD-DELETED (not deactivated). Historical/business
    // records are NEVER cascade-deleted by product deletion.
    const getDel = await req('GET', `/admin/products/${newProdId}`, null, adminToken);
    log('Deleted product is gone via admin API (404 expected)', getDel.status, getDel.data, 404);
    if (getDel.status === 404) {
      console.log('   Product hard-deleted (not soft-deactivated): ✅');
    } else {
      const delProdData = getDel.data?.data?.product || getDel.data?.data;
      console.log(`   Product status after delete: ${delProdData && delProdData.status}`);
      failed++;
      failures.push({ name: 'Product not hard-deleted after delete', status: getDel.status, data: getDel.data });
    }
  }

  /* ---------- 6. ADMIN CATEGORIES ---------- */
  console.log('\n--- 6. ADMIN CATEGORIES ---\n');

  const categories = await req('GET', '/admin/categories', null, adminToken);
  log('Admin categories list loads', categories.status, categories.data);
  const catList = categories.data?.data?.categories || categories.data?.data || [];
  console.log(`   Categories count: ${Array.isArray(catList) ? catList.length : '?'}`);

  // Create test category (disposable)
  const testCatName = `Regression Test Cat ${Date.now()}`;
  const createCat = await req('POST', '/admin/categories', {
    name: testCatName,
    description: 'Disposable regression test category'
  }, adminToken);
  log('Create category succeeds', createCat.status, createCat.data);
  const newCat = createCat.data?.data?.category || createCat.data?.data;
  const newCatId = newCat?.id || newCat?._id;
  console.log(`   New category ID: ${newCatId}`);

  // Validation error
  const badCat = await req('POST', '/admin/categories', { name: '' }, adminToken);
  log('Invalid category rejected (422)', badCat.status, badCat.data, 422);
  checkNoLeak(badCat.data, 'Category validation error');

  // Edit test category
  if (newCatId) {
    const editCat = await req('PUT', `/admin/categories/${newCatId}`, {
      name: testCatName + ' EDITED',
      description: 'Edited regression test category'
    }, adminToken);
    log('Edit category succeeds', editCat.status, editCat.data);

    // Delete test category
    const delCat = await req('DELETE', `/admin/categories/${newCatId}`, null, adminToken);
    log('Delete test category succeeds', delCat.status, delCat.data);
  }

  /* ---------- 7. ADMIN ORDERS ---------- */
  console.log('\n--- 7. ADMIN ORDERS ---\n');

  const orders = await req('GET', '/admin/orders', null, adminToken);
  log('Admin orders list loads', orders.status, orders.data);
  const orderList = orders.data?.data?.orders || orders.data?.data || [];
  console.log(`   Orders count: ${Array.isArray(orderList) ? orderList.length : '?'}`);

  if (Array.isArray(orderList) && orderList.length > 0) {
    const firstOrder = orderList[0];
    const oid = firstOrder.id || firstOrder._id;
    console.log(`   First order: ${firstOrder.orderId} — ₹${firstOrder.total ?? firstOrder.amount} — ${firstOrder.status}`);
    const custName = firstOrder.customerName || firstOrder.customer?.name || firstOrder.user?.name;
    console.log(`   Customer name: ${custName}`);
    console.log(`   [object Object] check: ${custName === '[object Object]' ? '❌' : '✅'}`);

    // Order detail
    const orderDetail = await req('GET', `/admin/orders/${oid}`, null, adminToken);
    log('Order detail loads', orderDetail.status, orderDetail.data);

    // Status update on a test order (use a pending or confirmed order to avoid modifying production)
    // Find a test order if available, otherwise use a pending/confirmed order
    const testOrder = orderList.find(o => o.orderId && o.orderId.includes('REGRESSION')) || 
                      orderList.find(o => o.status === 'pending') ||
                      orderList.find(o => o.status === 'confirmed');
    if (testOrder) {
      const toid = testOrder.id || testOrder._id;
      const statusUpdate = await req('PUT', `/admin/orders/${toid}/status`, { status: 'confirmed' }, adminToken);
      log('Order status update succeeds', statusUpdate.status, statusUpdate.data);
    } else {
      console.log('   No suitable test order found for status update — SKIPPED (safe)');
    }

    // Invalid status
    const badStatus = await req('PUT', `/admin/orders/${oid}/status`, { status: 'invalid_status' }, adminToken);
    log('Invalid order status rejected (422)', badStatus.status, badStatus.data, 422);
    checkNoLeak(badStatus.data, 'Order status validation error');
  }

  /* ---------- 8. ADMIN CUSTOMERS ---------- */
  console.log('\n--- 8. ADMIN CUSTOMERS ---\n');

  const customers = await req('GET', '/admin/customers', null, adminToken);
  log('Admin customers list loads', customers.status, customers.data);
  const custList = customers.data?.data?.customers || customers.data?.data || [];
  console.log(`   Customers count: ${Array.isArray(custList) ? custList.length : '?'}`);

  if (Array.isArray(custList) && custList.length > 0) {
    const firstCust = custList[0];
    const cid = firstCust.id || firstCust._id;
    console.log(`   Customer name: ${firstCust.name}`);
    console.log(`   Customer email: ${firstCust.email}`);
    console.log(`   Customer phone: ${firstCust.phone}`);
    console.log(`   Customer status: ${firstCust.status}`);
    console.log(`   Name from canonical field: ${firstCust.name ? '✅' : '❌'}`);

    // Customer detail
    const custDetail = await req('GET', `/admin/customers/${cid}`, null, adminToken);
    log('Customer detail loads', custDetail.status, custDetail.data);

    // Customer orders
    const custOrders = await req('GET', `/admin/customers/${cid}/orders`, null, adminToken);
    log('Customer orders load', custOrders.status, custOrders.data);

    // Status update (safe — only on test/regression customer)
    const testCust = custList.find(c => c.email && c.email.includes('regression'));
    if (testCust) {
      const tcId = testCust.id || testCust._id;
      const statusUpd = await req('PUT', `/admin/customers/${tcId}/status`, { status: 'active' }, adminToken);
      log('Customer status update succeeds', statusUpd.status, statusUpd.data);
    } else {
      console.log('   No regression test customer found — status update SKIPPED (safe)');
    }

    // Invalid status
    const badCustStatus = await req('PUT', `/admin/customers/${cid}/status`, { status: 'invalid' }, adminToken);
    log('Invalid customer status rejected (422)', badCustStatus.status, badCustStatus.data, 422);
    checkNoLeak(badCustStatus.data, 'Customer status validation error');
  }

  /* ---------- 9. ADMIN INVENTORY ---------- */
  console.log('\n--- 9. ADMIN INVENTORY ---\n');

  const inventory = await req('GET', '/admin/inventory', null, adminToken);
  log('Admin inventory list loads', inventory.status, inventory.data);
  const invList = inventory.data?.data?.inventory || inventory.data?.data?.products || inventory.data?.data?.items || inventory.data?.data || [];
  console.log(`   Inventory count: ${Array.isArray(invList) ? invList.length : '?'}`);

  // Low stock
  const invLow = await req('GET', '/admin/inventory/low-stock', null, adminToken);
  log('Inventory low-stock loads', invLow.status, invLow.data);

  // Out of stock
  const invOut = await req('GET', '/admin/inventory/out-of-stock', null, adminToken);
  log('Inventory out-of-stock loads', invOut.status, invOut.data);

  if (Array.isArray(invList) && invList.length > 0) {
    const firstInv = invList[0];
    const pid = firstInv.id || firstInv._id || firstInv.productId;
    console.log(`   First inventory item: ${firstInv.name} — stock: ${firstInv.stock} — status: ${firstInv.stockStatus}`);

    // Inventory history
    if (pid) {
      const history = await req('GET', `/admin/inventory/${pid}/history`, null, adminToken);
      log('Inventory history loads', history.status, history.data);
    }

    // Stock update (safe — use a test product or a product with reasonable stock)
    // Use a product with stock > 0 to avoid unrealistic values
    const safeProd = invList.find(p => p.stock > 0 && p.stock < 500) || firstInv;
    const spid = safeProd.id || safeProd._id || safeProd.productId;
    if (spid) {
      const currentStock = safeProd.stock || 0;
      const newStock = Math.max(1, currentStock); // Keep same or reasonable value
      const stockUpd = await req('PUT', `/admin/inventory/${spid}`, { stock: newStock }, adminToken);
      log('Stock update succeeds', stockUpd.status, stockUpd.data);
      console.log(`   Updated stock for ${safeProd.name}: ${newStock}`);
    }

    // Invalid stock
    if (pid) {
      const badStock = await req('PUT', `/admin/inventory/${pid}`, { stock: -5 }, adminToken);
      log('Invalid stock rejected (422)', badStock.status, badStock.data, 422);
      checkNoLeak(badStock.data, 'Stock validation error');
    }
  }

  /* ---------- 10. ADMIN REPORTS ---------- */
  console.log('\n--- 10. ADMIN REPORTS ---\n');

  const salesReport = await req('GET', '/admin/reports/sales', null, adminToken);
  log('Sales report loads', salesReport.status, salesReport.data);
  const srData = salesReport.data?.data;
  if (srData) {
    const srStr = JSON.stringify(srData);
    console.log(`   No NaN values: ${!/NaN/.test(srStr) ? '✅' : '❌'}`);
    if (/NaN/.test(srStr)) {
      failed++;
      failures.push({ name: 'NaN in sales report', status: 'NAN', data: srData });
    }
  }

  const productsReport = await req('GET', '/admin/reports/products', null, adminToken);
  log('Products report loads', productsReport.status, productsReport.data);
  const prData = productsReport.data?.data;
  if (prData) {
    const prStr = JSON.stringify(prData);
    console.log(`   No NaN values: ${!/NaN/.test(prStr) ? '✅' : '❌'}`);
    if (/NaN/.test(prStr)) {
      failed++;
      failures.push({ name: 'NaN in products report', status: 'NAN', data: prData });
    }
  }

  const categoriesReport = await req('GET', '/admin/reports/categories', null, adminToken);
  log('Categories report loads', categoriesReport.status, categoriesReport.data);
  const crData = categoriesReport.data?.data;
  if (crData) {
    const crStr = JSON.stringify(crData);
    console.log(`   No NaN values: ${!/NaN/.test(crStr) ? '✅' : '❌'}`);
    if (/NaN/.test(crStr)) {
      failed++;
      failures.push({ name: 'NaN in categories report', status: 'NAN', data: crData });
    }
  }

  // Reports with date filters
  const salesReportFiltered = await req('GET', '/admin/reports/sales?from=2026-01-01&to=2026-12-31', null, adminToken);
  log('Sales report with date filter works', salesReportFiltered.status, salesReportFiltered.data);

  /* ---------- 11. ADMIN REVIEWS ---------- */
  console.log('\n--- 11. ADMIN REVIEWS ---\n');

  const reviews = await req('GET', '/admin/reviews', null, adminToken);
  log('Admin reviews list loads', reviews.status, reviews.data);
  const revList = reviews.data?.data?.reviews || reviews.data?.data || [];
  console.log(`   Reviews count: ${Array.isArray(revList) ? revList.length : '?'}`);

  if (Array.isArray(revList) && revList.length > 0) {
    const firstRev = revList[0];
    const rid = firstRev.id || firstRev._id;
    console.log(`   Review: rating ${firstRev.rating} — ${firstRev.comment?.slice(0, 50)}`);
    console.log(`   Customer name: ${firstRev.userName || firstRev.user?.name || firstRev.customerName || '?'}`);
    console.log(`   Product: ${firstRev.productName || firstRev.product?.name || '?'}`);

    // Review detail
    const revDetail = await req('GET', `/admin/reviews/${rid}`, null, adminToken);
    log('Review detail loads', revDetail.status, revDetail.data);

    // Delete only if it's a regression test review
    const isTestReview = firstRev.comment && firstRev.comment.includes('regression');
    if (isTestReview) {
      const delRev = await req('DELETE', `/admin/reviews/${rid}`, null, adminToken);
      log('Delete test review succeeds', delRev.status, delRev.data);
    } else {
      console.log('   No regression test review found — delete SKIPPED (safe)');
    }
  }

  /* ---------- 12. ADMIN CONTACT MESSAGES ---------- */
  console.log('\n--- 12. ADMIN CONTACT MESSAGES ---\n');

  const contacts = await req('GET', '/admin/contact-messages', null, adminToken);
  log('Admin contact messages list loads', contacts.status, contacts.data);
  const contactList = contacts.data?.data?.messages || contacts.data?.data?.contacts || contacts.data?.data || [];
  console.log(`   Contact messages count: ${Array.isArray(contactList) ? contactList.length : '?'}`);

  if (Array.isArray(contactList) && contactList.length > 0) {
    const firstContact = contactList[0];
    const cid = firstContact.id || firstContact._id;
    console.log(`   Message: ${firstContact.subject} — from ${firstContact.name} (${firstContact.email})`);
    console.log(`   Status: ${firstContact.status}`);

    // Detail
    const contactDetail = await req('GET', `/admin/contact-messages/${cid}`, null, adminToken);
    log('Contact message detail loads', contactDetail.status, contactDetail.data);

    // Status update (safe — only on test message)
    const testContact = contactList.find(c => c.email && c.email.includes('regression'));
    if (testContact) {
      const tcId = testContact.id || testContact._id;
      const statusUpd = await req('PUT', `/admin/contact-messages/${tcId}`, { status: 'read' }, adminToken);
      log('Contact message status update succeeds', statusUpd.status, statusUpd.data);
    } else {
      console.log('   No regression test contact message found — status update SKIPPED (safe)');
    }

    // Invalid status
    const badContactStatus = await req('PUT', `/admin/contact-messages/${cid}`, { status: 'invalid' }, adminToken);
    log('Invalid contact status rejected (422)', badContactStatus.status, badContactStatus.data, 422);
    checkNoLeak(badContactStatus.data, 'Contact status validation error');
  }

  /* ---------- 13. ADMIN COMBOS ---------- */
  console.log('\n--- 13. ADMIN COMBOS ---\n');

  const combos = await req('GET', '/admin/combos', null, adminToken);
  log('Admin combos list loads', combos.status, combos.data);
  const comboList = combos.data?.data?.combos || combos.data?.data || [];
  console.log(`   Combos count: ${Array.isArray(comboList) ? comboList.length : '?'}`);

  // Get a valid product ID for combo creation
  const prodForCombo = prodList[0];
  const prodForComboId = prodForCombo?.id || prodForCombo?._id;

  // Create test combo (disposable)
  const testComboName = `Regression Test Combo ${Date.now()}`;
  const createCombo = await req('POST', '/admin/combos', {
    name: testComboName,
    description: 'Disposable regression test combo',
    price: 199,
    items: prodForComboId ? [{ product: prodForComboId, quantity: 1 }] : [],
    discount: 10
  }, adminToken);
  log('Create combo succeeds', createCombo.status, createCombo.data);
  const newCombo = createCombo.data?.data?.combo || createCombo.data?.data;
  const newComboId = newCombo?.id || newCombo?._id;
  console.log(`   New combo ID: ${newComboId}`);

  // Validation error
  const badCombo = await req('POST', '/admin/combos', { name: '', price: -1 }, adminToken);
  log('Invalid combo rejected (422)', badCombo.status, badCombo.data, 422);
  checkNoLeak(badCombo.data, 'Combo validation error');

  // Edit test combo
  if (newComboId) {
    const editCombo = await req('PUT', `/admin/combos/${newComboId}`, {
      name: testComboName + ' EDITED',
      description: 'Edited regression test combo',
      price: 249,
      discount: 15
    }, adminToken);
    log('Edit combo succeeds', editCombo.status, editCombo.data);

    // Delete test combo
    const delCombo = await req('DELETE', `/admin/combos/${newComboId}`, null, adminToken);
    log('Delete test combo succeeds', delCombo.status, delCombo.data);
  }

  /* ---------- 14. ADMIN SETTINGS ---------- */
  console.log('\n--- 14. ADMIN SETTINGS ---\n');

  const settings = await req('GET', '/admin/settings', null, adminToken);
  log('Admin settings loads', settings.status, settings.data);
  const settingsData = settings.data?.data?.settings || settings.data?.data;
  if (settingsData) {
    console.log(`   phone: ${settingsData.phone}`);
    console.log(`   address: ${settingsData.address}`);
    console.log(`   Uses canonical phone field: ${settingsData.phone !== undefined ? '✅' : '❌'}`);
    console.log(`   Uses canonical address field: ${settingsData.address !== undefined ? '✅' : '❌'}`);
    console.log(`   Uses shopPhone (wrong): ${settingsData.shopPhone !== undefined ? '❌' : '✅'}`);
    console.log(`   Uses shopAddress (wrong): ${settingsData.shopAddress !== undefined ? '❌' : '✅'}`);
    if (settingsData.shopPhone !== undefined || settingsData.shopAddress !== undefined) {
      failed++;
      failures.push({ name: 'Settings uses non-canonical shopPhone/shopAddress', status: 'WRONG_FIELD', data: settingsData });
    }
  }

  // Update settings (safe — preserve original values)
  if (settingsData) {
    const origPhone = settingsData.phone;
    const origAddress = settingsData.address;
    const testPhone = origPhone || '+91 98400 12345';
    const testAddress = origAddress || '42, Festival Street, Chennai';

    const updSettings = await req('PUT', '/admin/settings', {
      phone: testPhone,
      address: testAddress
    }, adminToken);
    log('Update settings succeeds', updSettings.status, updSettings.data);

    // Verify persistence
    const settingsAgain = await req('GET', '/admin/settings', null, adminToken);
    log('Settings persist after update', settingsAgain.status, settingsAgain.data);
    const settingsAgainData = settingsAgain.data?.data?.settings || settingsAgain.data?.data;
    if (settingsAgainData) {
      console.log(`   phone after update: ${settingsAgainData.phone}`);
      console.log(`   address after update: ${settingsAgainData.address}`);
      console.log(`   Persistence verified: ${settingsAgainData.phone === testPhone ? '✅' : '❌'}`);
    }
  }

  /* ---------- 15. ERROR HANDLING ---------- */
  console.log('\n--- 15. ERROR HANDLING ---\n');

  // Nonexistent admin route
  const badRoute = await req('GET', '/admin/nonexistent-route', null, adminToken);
  log('Nonexistent admin route → 404', badRoute.status, badRoute.data, 404);
  checkNoLeak(badRoute.data, '404 error');

  // Invalid product ID
  const badProdId = await req('GET', '/admin/products/invalid-id', null, adminToken);
  log('Invalid product ID handled (422 validation)', badProdId.status, badProdId.data, 422);
  checkNoLeak(badProdId.data, 'Invalid ID error');

  // Unauthorized access to admin route
  const unauthAdmin = await req('GET', '/admin/dashboard/summary', null, null);
  log('Admin route without token → 401', unauthAdmin.status, unauthAdmin.data, 401);
  checkNoLeak(unauthAdmin.data, 'Unauthorized admin error');

  /* ---------- 16. ADMIN LOGOUT ---------- */
  console.log('\n--- 16. ADMIN LOGOUT ---\n');

  // Admin logout is typically client-side (token removal)
  // Verify the token still works (it's a JWT — no server-side invalidation expected)
  const meAfter = await req('GET', '/admin/auth/me', null, adminToken);
  log('Admin token still valid (JWT stateless)', meAfter.status, meAfter.data);

  // Verify customer auth is NOT affected by admin logout
  // Login as customer
  const custLogin = await req('POST', '/auth/login', { email: 'ramesh@example.com', password: 'customer123' });
  log('Customer login unaffected by admin session', custLogin.status, custLogin.data);
  const custToken = custLogin.data?.data?.token;
  if (custToken) {
    const custMe = await req('GET', '/auth/me', null, custToken);
    log('Customer /me works after admin logout', custMe.status, custMe.data);
  }

  /* ---------- SUMMARY ---------- */
  printSummary();
}

function printSummary() {
  console.log('\n========================================================');
  console.log('PHASE 10C-3 ADMIN REGRESSION SUMMARY');
  console.log('========================================================');
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  if (failures.length > 0) {
    console.log('\nFailures:');
    failures.forEach(f => {
      console.log(`  ❌ ${f.name} — status ${f.status}${f.expectStatus ? ` (expected ${f.expectStatus})` : ''}`);
    });
  }
  console.log('\n========================================================');
}

main().catch(err => {
  console.error('Test script error:', err);
  process.exit(1);
});