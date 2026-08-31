/* ============================================================
   VENDHAN CRACKERS — PART 2: FUTURE PRODUCT DELETION TEST
   ------------------------------------------------------------
   Verifies the NEW architecture:
   1. Admin deletes ONE product → Product document ONLY is removed.
   2. NO historical/business record is cascade-deleted:
      - Order stays
      - Order item stays (denormalized snapshot)
      - Historical pricing stays
      - Customer order history stays
      - Reports remain intact
   3. Setting status=inactive does NOT delete anything.

   Run: node test-products-deletion.js   (backend must be on :5000)
   ============================================================ */

const BASE = 'http://localhost:5000/api';

let passed = 0;
let failed = 0;
const failures = [];

function log(name, ok, details) {
  if (ok) {
    passed++;
    console.log(`  ✅ ${name}`);
  } else {
    failed++;
    failures.push({ name, details });
    console.log(`  ❌ ${name}${details ? ' — ' + String(details).slice(0, 300) : ''}`);
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
  console.log('========== FUTURE PRODUCT DELETION TEST ==========\n');

  // ---------- Health & auth ----------
  const health = await req('GET', '/health');
  log('API health OK', health.status === 200);

  const adminLogin = await req('POST', '/admin/auth/login', { email: 'admin@vendhancrackers.in', password: 'admin123' });
  const adminToken = adminLogin.data?.data?.token;
  log('Admin login OK', !!adminToken && adminLogin.status === 200);

  const stamp = Date.now();
  const email = `del-test-${stamp}@example.com`;
  const phone = `98${String(stamp).slice(-8)}`;
  const reg = await req('POST', '/auth/register', {
    name: 'Delete Test Customer',
    email,
    phone,
    password: 'Customer123',
    address: '1, Test Street',
    city: 'Chennai',
    state: 'Tamil Nadu',
    pincode: '600001'
  });
  const customerToken = reg.data?.data?.token;
  log('Dedicated test customer registered & logged in', !!customerToken, reg.status);

  /* ---------- Create Product A ---------- */
  const cats = await req('GET', '/admin/categories', null, adminToken);
  const catList = cats.data?.data?.categories || cats.data?.data || [];
  const cat = catList[0];
  const catId = cat?.id || cat?._id;
  const catDiscount = Number(cat?.discount) || 0;
  log('Admin categories available', !!catId);

  const priceA = 600;
  const qtyA = 20;
  const afterCat = qtyA * priceA * (1 - catDiscount / 100);
  log(`Product A pricing clears minimum-order (₹${afterCat.toFixed(0)} >= ₹2000)`, afterCat >= 2000);

  const prodAName = `Product A Deletion Test ${stamp}`;
  const createA = await req('POST', '/admin/products', {
    name: prodAName,
    description: 'Product used to test future deletion behavior',
    price: priceA,
    stock: 100,
    reorderLevel: 5,
    category: catId
  }, adminToken);
  const productA = createA.data?.data?.product || createA.data?.data;
  const productAId = productA?.id || productA?._id;
  log('Product A created', !!productAId, createA.status);

  /* ---------- Customer adds A, then checkout ---------- */
  const addA = await req('POST', '/cart/items', { productId: productAId, quantity: qtyA }, customerToken);
  log('Product A added to cart', addA.status === 200 || addA.status === 201, addA.status);

  const checkout = await req('POST', '/checkout', {
    name: 'Delete Test Customer',
    phone,
    email,
    address: '1, Test Street',
    city: 'Chennai',
    state: 'Tamil Nadu',
    pincode: '600001',
    paymentMethod: 'cod'
  }, customerToken);
const order = checkout.data?.data?.order || checkout.data?.data;
  const orderId = order?.id || order?._id;
  const orderItem = (order?.items || []).find((i) => String(i.product?._id || i.product || '') === String(productAId));
  log('Order created with Product A', !!orderId && !!orderItem, checkout.data?.message || orderId);

  const itemNameSnapshot = orderItem?.productName;
  const itemPriceSnapshot = orderItem?.price;
  const itemQtySnapshot = orderItem?.quantity;
  const orderTotal = order?.pricing?.total;
  log(`Order item snapshot: "${itemNameSnapshot}" @ ₹${itemPriceSnapshot} × ${itemQtySnapshot}`, !!itemNameSnapshot && itemPriceSnapshot > 0);
  log('Historical pricing snapshot present', order?.pricing?.total > 0, JSON.stringify(order?.pricing));

  /* ---------- Verify order exists BEFORE deletion ---------- */
  const customerOrder = await req('GET', `/orders/${orderId}`, null, customerToken);
  log('Customer order exists BEFORE product deletion', customerOrder.status === 200);

  /* ---------- Admin DELETES Product A ---------- */
  const delA = await req('DELETE', `/admin/products/${productAId}`, null, adminToken);
  log('Admin DELETE /admin/products/:id succeeds', delA.status === 200, delA.data?.message);
  log('Delete response says deleted:true', delA.data?.data?.deleted === true, JSON.stringify(delA.data?.data));

  /* ---------- Product A is gone ---------- */
  const getA = await req('GET', `/admin/products/${productAId}`, null, adminToken);
  log('Product A is GONE via admin API (404)', getA.status === 404, getA.status);
  const pub = await req('GET', `/products/${productAId}`);
  log('Product A NOT in public catalogue (404)', pub.status === 404, pub.status);

  /* ---------- Order and history STILL EXIST ---------- */
  const adminOrder = await req('GET', `/admin/orders/${orderId}`, null, adminToken);
  log('Order still exists via ADMIN API', adminOrder.status === 200, adminOrder.status);

  const custOrder = await req('GET', `/orders/${orderId}`, null, customerToken);
  log('Order still exists via CUSTOMER API', custOrder.status === 200, custOrder.status);

  const preservedOrder = custOrder.data?.data?.order || custOrder.data?.data;
  const preservedItem = (preservedOrder?.items || []).find((i) => i.productName === itemNameSnapshot);
  log('Order item STILL EXISTS (productName snapshot)', !!preservedItem, JSON.stringify(preservedItem));

  if (preservedItem) {
    log('Order item historical price snapshot preserved', Number(preservedItem.price) === Number(itemPriceSnapshot), `snapshot=₹${itemPriceSnapshot} now=₹${preservedItem.price}`);
    log('Order item historical quantity preserved', Number(preservedItem.quantity) === Number(itemQtySnapshot), `snapshot=${itemQtySnapshot} now=${preservedItem.quantity}`);
  }
log('Historical order total preserved', Number(preservedOrder?.pricing?.total) === Number(orderTotal), `total=₹${preservedOrder?.pricing?.total}`);
  log('Order line count unchanged', preservedOrder?.items?.length === (order?.items?.length ?? 1));

  /* ---------- Customer order history ---------- */
  const myOrders = await req('GET', '/orders?limit=20', null, customerToken);
  const historyHasOrder = (myOrders.data?.data?.orders || myOrders.data?.data || []).some((o) => (o.id || o._id) === orderId);
  log('Customer order history still contains the order', myOrders.status === 200 && historyHasOrder, myOrders.status);

  /* ---------- Reports ---------- */
  const salesReport = await req('GET', '/admin/reports/sales?period=all', null, adminToken);
  log('Sales report endpoint OK after deletion', salesReport.status === 200, salesReport.status);
  const adminOrdersList = await req('GET', '/admin/orders?limit=20', null, adminToken);
  const orderInAdminList = (adminOrdersList.data?.data?.orders || []).some((o) => (o.id || o._id) === orderId);
  log('Order still appears in admin orders list', orderInAdminList);

  /* ---------- Inactive does NOT delete ---------- */
  const createB = await req('POST', '/admin/products', {
    name: `Inactive-Only Product ${stamp}`,
    price: 100,
    stock: 50,
    category: catId
  }, adminToken);
  const productB = createB.data?.data?.product || createB.data?.data;
  const productBId = productB?.id || productB?._id;
  log('Product B created', !!productBId);

  const ordersBeforeInactive = adminOrdersList.data?.data?.total ?? -1;
  const setB = await req('PUT', `/admin/products/${productBId}`, {
    name: `Inactive-Only Product ${stamp}`,
    price: 100,
    stock: 50,
    category: catId,
    status: 'inactive'
  }, adminToken);
  log('Set Product B status=inactive OK', setB.status === 200, setB.status);

  const getB = await req('GET', `/admin/products/${productBId}`, null, adminToken);
  const bData = getB.data?.data?.product || getB.data?.data;
  log('Product B STILL EXISTS after status=inactive', getB.status === 200 && !!bData && bData.status === 'inactive', getB.status);

  const ordersAfterInactive = await req('GET', '/admin/orders?limit=20', null, adminToken);
  const afterInactiveTotal = ordersAfterInactive.data?.data?.total;
  log('Orders count unchanged after status=inactive', ordersBeforeInactive === -1 || afterInactiveTotal === ordersBeforeInactive, `${ordersBeforeInactive} → ${afterInactiveTotal}`);

  // cleanup: delete the inactive test product B
  const delB = await req('DELETE', `/admin/products/${productBId}`, null, adminToken);
  log('Cleanup: delete Product B', delB.status === 200, delB.status);

  /* ---------- Summary ---------- */
  console.log('\n========================================================');
  console.log('FUTURE DELETE TEST SUMMARY');
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  if (failures.length) failures.forEach((f) => console.log(`  ❌ ${f.name} — ${f.details || ''}`));
  console.log('========================================================');
  process.exit(failed ? 1 : 0);
}

main().catch((e) => { console.error('Test error:', e); process.exit(1); });