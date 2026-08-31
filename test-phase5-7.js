/* ============================================================
   VENDHAN CRACKERS — Phase 5-7 Integration Test Script
   Requires the backend server to be running on port 5000.
   Run: node test-phase5-7.js
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
  const data = await res.json();
  return { status: res.status, data };
}

function log(name, status, data) {
  const ok = status >= 200 && status < 300;
  console.log(`${ok ? '✅' : '❌'} [${status}] ${name}`);
  if (!ok) {
    console.log(JSON.stringify(data, null, 2).slice(0, 500));
  }
}

function logExpect(name, status, expected, data) {
  const pass = status === expected;
  console.log(`${pass ? '✅' : '❌'} [${status} (expected ${expected})] ${name} — ${pass ? 'correctly rejected' : 'UNEXPECTED'}`);
}

async function main() {
  console.log('========== PHASE 5-7 INTEGRATION TESTS ==========\n');

  // 1. Login customer
  const login = await req('POST', '/auth/login', { email: 'ramesh@example.com', password: 'customer123' });
  log('Customer login', login.status, login.data);
  const customerToken = login.data.data.token;

  // 2. Get a product with stock
  const products = await req('GET', '/products?limit=50', null);
  log('List products', products.status, products.data);
  const product = products.data.data.products.find((p) => p.stock > 0 && p.status === 'active');
  const productId = product._id;
  console.log('   Testing with product:', product.name, 'stock:', product.stock);

  // 3. Add to cart
  const addCart = await req('POST', '/cart/items', { productId, quantity: 2 }, customerToken);
  log('Add to cart', addCart.status, addCart.data);

  // 4. Get cart
  const cart = await req('GET', '/cart', null, customerToken);
  log('Get cart', cart.status, cart.data);

  // 5. Validate checkout
  const deliveryInfo = {
    name: 'Ramesh Kumar',
    phone: '9840012345',
    email: 'ramesh@example.com',
    address: '12, Gandhi Street, T. Nagar',
    city: 'Chennai',
    state: 'Tamil Nadu',
    pincode: '600017'
  };
  const validate = await req('POST', '/checkout/validate', deliveryInfo, customerToken);
  log('Validate checkout', validate.status, validate.data);
  console.log('   Summary:', JSON.stringify(validate.data?.data?.pricing));

  // 6. Place order
  const orderRes = await req('POST', '/checkout', { ...deliveryInfo, paymentMethod: 'cod' }, customerToken);
  log('Place order', orderRes.status, orderRes.data);
  const orderId = orderRes.data?.data?.order?._id;
  console.log('   Order ID:', orderId);

  // 7. Cart should be cleared
  const cartAfter = await req('GET', '/cart', null, customerToken);
  log('Cart cleared after order', cartAfter.status, cartAfter.data);

  // 8. My orders list
  const myOrders = await req('GET', '/orders', null, customerToken);
  log('My orders list', myOrders.status, myOrders.data);

  // 9. Get order detail
  if (orderId) {
    const orderDetail = await req('GET', `/orders/${orderId}`, null, customerToken);
    log('Get order detail', orderDetail.status, orderDetail.data);

    // 10. Track order
    const track = await req('GET', `/orders/${orderId}/track`, null, customerToken);
    log('Track order', track.status, track.data);

    // 11. Cancel order (should work for pending)
    const cancel = await req('POST', `/orders/${orderId}/cancel`, null, customerToken);
    log('Cancel order', cancel.status, cancel.data);

    // 12. Double cancel should fail
    const cancel2 = await req('POST', `/orders/${orderId}/cancel`, null, customerToken);
    logExpect('Double cancel rejected', cancel2.status, 400, cancel2.data);

    // 13. Another customer cannot access this order
    const login2 = await req('POST', '/auth/login', { email: 'priya@example.com', password: 'customer123' });
    const token2 = login2.data.data.token;
    const unauthorized = await req('GET', `/orders/${orderId}`, null, token2);
    logExpect('Other customer blocked', unauthorized.status, 404, unauthorized.data);
  }

  console.log('\n========== ADMIN TESTS ==========\n');

  // 14. Admin login
  const adminLogin = await req('POST', '/admin/auth/login', { email: 'admin@vendhancrackers.in', password: 'admin123' });
  log('Admin login', adminLogin.status, adminLogin.data);
  const adminToken = adminLogin.data?.data?.token;

  // 15. Customer blocked from admin API
  const blockedAdmin = await req('GET', '/admin/dashboard/summary', null, customerToken);
  logExpect('Customer blocked from admin', blockedAdmin.status, 403, blockedAdmin.data);

  // 16. Admin orders list
  const adminOrders = await req('GET', '/admin/orders', null, adminToken);
  log('Admin orders list', adminOrders.status, adminOrders.data);

  // 17. Admin inventory
  const inventory = await req('GET', '/admin/inventory', null, adminToken);
  log('Admin inventory', inventory.status, inventory.data);

  // 18. Low stock
  const lowStock = await req('GET', '/admin/inventory/low-stock', null, adminToken);
  log('Admin low-stock', lowStock.status, lowStock.data);

  // 19. Out of stock
  const outOfStock = await req('GET', '/admin/inventory/out-of-stock', null, adminToken);
  log('Admin out-of-stock', outOfStock.status, outOfStock.data);

  // 20. Update stock
  const updateStock = await req('PUT', `/admin/inventory/${productId}`, { stock: 5 }, adminToken);
  log('Update stock', updateStock.status, updateStock.data);

  // 21. Negative stock rejected (422 is the project's validation-error convention)
  const negStock = await req('PUT', `/admin/inventory/${productId}`, { stock: -5 }, adminToken);
  logExpect('Negative stock rejected', negStock.status, 422, negStock.data);

  // 22. Dashboard summary
  const summary = await req('GET', '/admin/dashboard/summary', null, adminToken);
  log('Dashboard summary', summary.status, summary.data);

  // 23. Dashboard sales
  const sales = await req('GET', '/admin/dashboard/sales?groupBy=month', null, adminToken);
  log('Dashboard sales', sales.status, sales.data);

  // 24. Order stats
  const orderStats = await req('GET', '/admin/dashboard/orders', null, adminToken);
  log('Dashboard order stats', orderStats.status, orderStats.data);

  // 25. Top products
  const topProducts = await req('GET', '/admin/dashboard/top-products', null, adminToken);
  log('Top products', topProducts.status, topProducts.data);

  // 26. Category sales
  const categorySales = await req('GET', '/admin/dashboard/category-sales', null, adminToken);
  log('Category sales', categorySales.status, categorySales.data);

  // 27. Recent orders
  const recentOrders = await req('GET', '/admin/dashboard/recent-orders', null, adminToken);
  log('Recent orders', recentOrders.status, recentOrders.data);

  // 28. Low stock dashboard
  const dashLowStock = await req('GET', '/admin/dashboard/low-stock', null, adminToken);
  log('Dashboard low stock', dashLowStock.status, dashLowStock.data);

  // 29. Sales report
  const salesReport = await req('GET', '/admin/reports/sales?period=all', null, adminToken);
  log('Sales report', salesReport.status, salesReport.data);

  // 30. Product report
  const productReport = await req('GET', '/admin/reports/products?period=all', null, adminToken);
  log('Product report', productReport.status, productReport.data);

  // 31. Category report
  const categoryReport = await req('GET', '/admin/reports/categories?period=all', null, adminToken);
  log('Category report', categoryReport.status, categoryReport.data);

  // 32. Invalid date range rejected
  const invalidDate = await req('GET', '/admin/reports/sales?startDate=invalid', null, adminToken);
  logExpect('Invalid date rejected', invalidDate.status, 400, invalidDate.data);

  // 33. Huge date range rejected
  const hugeRange = await req('GET', '/admin/reports/sales?startDate=2000-01-01&endDate=2026-01-01', null, adminToken);
  logExpect('Huge date range rejected', hugeRange.status, 400, hugeRange.data);

  // 34. Invalid status transition (delivered -> confirmed)
  if (orderId) {
    const invalidTransition = await req('PUT', `/admin/orders/${orderId}/status`, { status: 'confirmed' }, adminToken);
    logExpect('Invalid status transition', invalidTransition.status, 400, invalidTransition.data);
  }

  console.log('\n========== TESTS COMPLETE ==========');
}

main().catch((err) => {
  console.error('Test script error:', err);
  process.exit(1);
});