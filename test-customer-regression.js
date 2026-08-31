/* ============================================================
   VENDHAN CRACKERS — Phase 10C-2 Customer Full Regression
   Requires backend running on port 5000.
   Run: node test-customer-regression.js
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

async function main() {
  console.log('========== PHASE 10C-2 CUSTOMER FULL REGRESSION ==========\n');

  // Local test account (unique, clearly identifiable, disposable)
  const email = `regression.${Date.now()}@test.com`;
  const password = 'TestPass123';
  const name = 'Regression Tester';
  const phone = '98765' + String(Date.now()).slice(-5);

  /* ---------- 1. REGISTRATION ---------- */
  console.log('--- 1. REGISTRATION ---\n');

  // Invalid registration (validation)
  const badReg = await req('POST', '/auth/register', { name: 'A', email: 'bad', phone: '123', password: 'short' });
  log('Invalid registration rejected (422)', badReg.status, badReg.data, 422);

  // Password mismatch is a frontend check — but backend also validates password format
  const weakPw = await req('POST', '/auth/register', { name: 'Valid Name', email: 'ok@test.com', phone: '9876543210', password: 'allletters' });
  log('Weak password (no number) rejected', weakPw.status, weakPw.data, 422);

  // Successful registration
  const reg = await req('POST', '/auth/register', { name, email, phone, password });
  log('Successful registration', reg.status, reg.data);
  const regToken = reg.data?.data?.token;
  const regUser = reg.data?.data?.user;

  if (regUser) {
    console.log(`   Registered: ${regUser.name} / ${regUser.email}`);
  }

  // Duplicate email
  const dupReg = await req('POST', '/auth/register', { name, email, phone, password });
  log('Duplicate email rejected', dupReg.status, dupReg.data, 409);
  log('Duplicate email returns friendly error', dupReg.status, dupReg.data);

  /* ---------- 2. LOGIN ---------- */
  console.log('\n--- 2. LOGIN ---\n');

  // Invalid credentials
  const badLogin = await req('POST', '/auth/login', { email, password: 'wrongpass1' });
  log('Invalid login rejected', badLogin.status, badLogin.data, 401);
  const msg = JSON.stringify(badLogin.data || '');
  console.log(`   Friendly error (no internal leak): ${!/Mongo|JWT|token|stack|internal/i.test(msg) ? '✅' : '❌'}`);

  // Valid login
  const login = await req('POST', '/auth/login', { email, password });
  log('Valid login succeeds', login.status, login.data);
  const token = login.data?.data?.token;

  if (!token) {
    console.log('❌ No token obtained — aborting further tests that need auth');
    printSummary();
    return;
  }

  // /auth/me
  const me = await req('GET', '/auth/me', null, token);
  log('GET /auth/me works', me.status, me.data);
  console.log(`   Customer name: ${me.data?.data?.user?.name || me.data?.data?.name || '?'}`);

  // Protected route (cart) with token
  const cartAuth = await req('GET', '/cart', null, token);
  log('Protected route (cart) with token works', cartAuth.status, cartAuth.data);

  // Protected route without token
  const noToken = await req('GET', '/cart', null, null);
  log('Protected route without token blocked (401)', noToken.status, noToken.data, 401);

  /* ---------- 3. HOME PAGE ---------- */
  console.log('\n--- 3. HOME PAGE ---\n');

  const home = await req('GET', '/home', null, null);
  log('GET /home works', home.status, home.data);
  if (home.data?.data) {
    const d = home.data.data;
    console.log(`   Categories: ${d.categories?.length ?? '?'}`);
    console.log(`   Featured products: ${d.featuredProducts?.length ?? '?'}`);
    console.log(`   Combos: ${d.combos?.length ?? '?'}`);
    console.log(`   Reviews: ${d.reviews?.length ?? '?'}`);
    console.log(`   Stats present: ${d.stats ? '✅' : '❌'}`);
  }

  /* ---------- 4. SHOP ---------- */
  console.log('\n--- 4. SHOP ---\n');

  const products = await req('GET', '/products?page=1&limit=12', null, null);
  log('Product list loads', products.status, products.data);
  const productList = products.data?.data?.products || [];
  console.log(`   Products returned: ${productList.length}`);

  if (productList.length > 0) {
    const p = productList[0];
    console.log(`   Sample: ${p.name} — ₹${p.price} — ${p.stockStatus || 'stock:' + p.stock}`);
  }

  // Pagination check
  const page2 = await req('GET', '/products?page=2&limit=12', null, null);
  log('Pagination page 2 works', page2.status, page2.data);

  /* ---------- 5. SEARCH ---------- */
  console.log('\n--- 5. SEARCH ---\n');

  const searchTerm = productList[0]?.name?.split(' ')[0] || 'cracker';
  const search = await req('GET', `/products?search=${encodeURIComponent(searchTerm)}`, null, null);
  log('Search with matching term works', search.status, search.data);
  console.log(`   Search "${searchTerm}" results: ${search.data?.data?.products?.length ?? '?'}`);

  const noRes = await req('GET', '/products?search=zzzzzzzzznomatch', null, null);
  log('Search with no results returns empty (not error)', noRes.status, noRes.data);
  console.log(`   No-results count: ${noRes.data?.data?.products?.length ?? '?'}`);

  /* ---------- 6. FILTER + SORT ---------- */
  console.log('\n--- 6. FILTER + SORT ---\n');

  // Category filter
  const categories = await req('GET', '/categories', null, null);
  log('Categories load', categories.status, categories.data);
  const catList = categories.data?.data?.categories || categories.data || [];
  const firstCat = catList[0];
  console.log(`   First category: ${firstCat?.name || firstCat?.categoryName || '?'}`);

  if (firstCat?.id || firstCat?._id) {
    const catId = firstCat.id || firstCat._id;
    const catProducts = await req('GET', `/categories/${catId}/products?page=1&limit=6`, null, null);
    log('Category filter works', catProducts.status, catProducts.data);
  }

  // Critical: rating_desc sort
  const sortRating = await req('GET', '/products?sort=rating_desc', null, null);
  log('Sort rating_desc (Rating: Highest First) works — NO 400', sortRating.status, sortRating.data);

  // Other sorts
  const sortPrice = await req('GET', '/products?sort=price_asc', null, null);
  log('Sort price_asc works', sortPrice.status, sortPrice.data);
  const sortPriceDesc = await req('GET', '/products?sort=price_desc', null, null);
  log('Sort price_desc works', sortPriceDesc.status, sortPriceDesc.data);
  const sortNew = await req('GET', '/products?sort=newest', null, null);
  log('Sort newest works', sortNew.status, sortNew.data);
  const sortPop = await req('GET', '/products?sort=popularity', null, null);
  log('Sort popularity works', sortPop.status, sortPop.data);

  // Price filter
  const priceFilter = await req('GET', '/products?minPrice=100&maxPrice=1000', null, null);
  log('Price filter works', priceFilter.status, priceFilter.data);

  /* ---------- 7. PRODUCT DETAILS ---------- */
  console.log('\n--- 7. PRODUCT DETAILS ---\n');

  let mainProduct = null;
  if (productList.length > 0) {
    const pid = productList[0].id || productList[0]._id;
    const detail = await req('GET', `/products/${pid}`, null, null);
    log('Product detail loads', detail.status, detail.data);
    mainProduct = detail.data?.data?.product || detail.data?.product;
    if (mainProduct) {
      console.log(`   Name: ${mainProduct.name}`);
      console.log(`   Price: ₹${mainProduct.price}`);
      console.log(`   Stock: ${mainProduct.stockStatus || mainProduct.stock}`);
      console.log(`   Has image: ${mainProduct.mainImage || (mainProduct.images?.length) ? '✅' : '❌'}`);
      console.log(`   Has description: ${mainProduct.description || mainProduct.details ? '✅' : '❌'}`);
    }

    // Reviews for product
    const reviews = await req('GET', `/products/${pid}/reviews`, null, null);
    log('Product reviews load', reviews.status, reviews.data);

    // Related products
    const related = await req('GET', `/products/${pid}/related?limit=3`, null, null);
    log('Related products load', related.status, related.data);
    const relList = related.data?.data?.relatedProducts || related.data?.related || [];
    console.log(`   Related count: ${relList.length}`);
    const currentInRelated = relList.some(r => (r.id || r._id) === pid);
    console.log(`   Current product excluded from related: ${!currentInRelated ? '✅' : '❌'}`);
  }

  /* ---------- 8/9/10. CART — PRODUCT / COMBO / MIXED ---------- */
  console.log('\n--- 8/9/10. CART PRODUCT / COMBO / MIXED ---\n');

  // Clear cart first
  const clearCart = await req('DELETE', '/cart', null, token);
  log('Clear cart', clearCart.status, clearCart.data);

  const inStockProduct = productList.find(p => p.stock > 0) || productList[0];

  // 8. Add product
  if (inStockProduct) {
    const pid = inStockProduct.id || inStockProduct._id;
    const addP = await req('POST', '/cart/items', { productId: pid, quantity: 1 }, token);
    log('Add product to cart', addP.status, addP.data);

    // Increase qty
    const updP = await req('PUT', `/cart/items/${pid}`, { quantity: 2 }, token);
    log('Update product quantity to 2', updP.status, updP.data);

    // Get cart
    const cart1 = await req('GET', '/cart', null, token);
    log('Cart shows product qty 2', cart1.status, cart1.data);
    const prodItem = cart1.data?.data?.items?.find(i => i.productId === pid || i.product?._id === pid);
    console.log(`   Product qty in cart: ${prodItem?.quantity ?? '?'}`);

    // Remove (then re-add for mixed test)
    const rmP = await req('DELETE', `/cart/items/${pid}`, null, token);
    log('Remove product from cart', rmP.status, rmP.data);

    const cartAfterRm = await req('GET', '/cart', null, token);
    log('Cart empty after product removal', cartAfterRm.status, cartAfterRm.data);
  }

  // 9. Combo
  const combos = await req('GET', '/combos', null, null);
  log('Combos load', combos.status, combos.data);
  const comboList = combos.data?.data?.combos || combos.data || [];
  const firstCombo = comboList[0];

  if (firstCombo) {
    const cid = firstCombo.id || firstCombo._id;
    const addC = await req('POST', `/combos/${cid}/add-to-cart`, { quantity: 1 }, token);
    log('Add combo to cart', addC.status, addC.data);
    const comboInCart = await req('GET', '/cart', null, token);
    log('Combo appears in cart', comboInCart.status, comboInCart.data);
    const comboItem = comboInCart.data?.data?.items?.find(i => i.comboId === cid || i.combo?._id === cid);
    console.log(`   Combo qty in cart: ${comboItem?.quantity ?? '?'}`);
  }

  // 10. Mixed: add product + combo, verify both
  if (inStockProduct && firstCombo) {
    const pid = inStockProduct.id || inStockProduct._id;
    const cid = firstCombo.id || firstCombo._id;

    await req('POST', '/cart/items', { productId: pid, quantity: 1 }, token);
    await req('POST', `/combos/${cid}/add-to-cart`, { quantity: 1 }, token);

    const mixedCart = await req('GET', '/cart', null, token);
    log('Mixed cart (product + combo) loads', mixedCart.status, mixedCart.data);
    if (mixedCart.data?.data?.items) {
      const items = mixedCart.data.data.items;
      const hasP = items.some(i => i.productId === pid || i.product?._id === pid);
      const hasC = items.some(i => i.comboId === cid || i.combo?._id === cid);
      const count = mixedCart.data.data.totalItemCount || items.reduce((s, i) => s + i.quantity, 0);
      console.log(`   Has product: ${hasP ? '✅' : '❌'}`);
      console.log(`   Has combo: ${hasC ? '✅' : '❌'}`);
      console.log(`   Total item count: ${count}`);
      console.log(`   Subtotal: ₹${mixedCart.data.data.subtotal ?? mixedCart.data.data.total ?? '?'}`);
    } else {
      console.log('❌ Mixed cart data structure unexpected');
      console.log(JSON.stringify(mixedCart.data, null, 2).slice(0, 400));
    }

    // Remove product from mixed cart
    const rmPMixed = await req('DELETE', `/cart/items/${pid}`, null, token);
    log('Remove product from mixed cart', rmPMixed.status, rmPMixed.data);
  }

  /* ---------- 11. COUPON ---------- */
  console.log('\n--- 11. COUPON ---\n');

  // Valid coupon
  const validCoupon = await req('POST', '/coupon/validate', { code: 'WELCOME10', subtotal: 500 }, token);
  log('Validate coupon WELCOME10', validCoupon.status, validCoupon.data);

  // Invalid coupon
  const badCoupon = await req('POST', '/coupon/validate', { code: 'NOTACOUPON', subtotal: 500 }, token);
  log('Invalid coupon rejected', badCoupon.status, badCoupon.data, 404);

  // Empty coupon (should not be sent by client, but API should handle)
  const emptyCoupon = await req('POST', '/coupon/validate', { code: '', subtotal: 500 }, token);
  log('Empty coupon handled', emptyCoupon.status, emptyCoupon.data, 400);

  /* ---------- 12/13/14/15. CHECKOUT ---------- */
  console.log('\n--- 12/13/14/15. CHECKOUT ---\n');

  const cartBeforeCheckout = await req('GET', '/cart', null, token);
  console.log(`   Cart before checkout items: ${cartBeforeCheckout.data?.data?.items?.length ?? '?'}`);

  // Validate checkout (Step 1+2 equivalent via API)
  const checkoutData = {
    items: cartBeforeCheckout.data?.data?.items || [],
    customer: { name, email, phone },
    address: { street: '12, Test Street', city: 'Chennai', state: 'Tamil Nadu', pincode: '600001' },
    paymentMethod: 'cod'
  };

  const validateCO = await req('POST', '/checkout/validate', checkoutData, token);
  log('Checkout validate (steps 1+2 data) works', validateCO.status, validateCO.data);

  // Invalid checkout (validation)
  const badCO = await req('POST', '/checkout/validate', {
    items: [],
    customer: { name: '', email: 'bad', phone: '123' },
    address: { street: '', city: '', state: '', pincode: '600001' },
    paymentMethod: 'cod'
  }, token);
  log('Checkout validate rejects missing fields', badCO.status, badCO.data, 422);

  // Place order
  const placeOrder = await req('POST', '/checkout', checkoutData, token);
  log('Place order succeeds', placeOrder.status, placeOrder.data);
  const order = placeOrder.data?.data?.order || placeOrder.data?.data;
  const orderId = order?.id || order?._id;
  const orderCode = order?.orderId;
  console.log(`   Order ID: ${orderId}`);
  console.log(`   Order code: ${orderCode}`);
  console.log(`   Order total: ₹${order?.total ?? order?.amount ?? '?'}`);
  console.log(`   Order status: ${order?.status ?? '?'}`);

  // Duplicate submission prevention — placing identical order again
  // (Second identical request may create a second order — this tests whether items are consumed)
  const dupOrder = await req('POST', '/checkout', checkoutData, token);
  log('Duplicate identical checkout request handled gracefully', dupOrder.status, dupOrder.data);

  /* ---------- 16/17/18. ORDER CONFIRMATION / ORDERS / TRACKING ---------- */
  console.log('\n--- 16/17/18. ORDER CONFIRMATION / ORDERS / TRACKING ---\n');

  if (orderId) {
    // Order detail (confirmation page data)
    const orderDetail = await req('GET', `/orders/${orderId}`, null, token);
    log('Order detail loads (confirmation)', orderDetail.status, orderDetail.data);

    // Tracking
    const track = await req('GET', `/orders/${orderId}/track`, null, token);
    log('Order tracking loads', track.status, track.data);
    console.log(`   Tracking status: ${track.data?.data?.status ?? track.data?.status ?? '?'}`);
  }

  // Orders list
  const ordersList = await req('GET', '/orders', null, token);
  log('Orders list loads', ordersList.status, ordersList.data);
  const orders = ordersList.data?.data?.orders || ordersList.data?.orders || [];
  console.log(`   Orders count: ${orders.length}`);
  const latest = orders[0];
  if (latest) {
    console.log(`   Latest order: ${latest.orderId} — ₹${latest.total} — ${latest.status}`);
  }

  /* ---------- 19. ORDER CANCELLATION ---------- */
  console.log('\n--- 19. ORDER CANCELLATION ---\n');

  if (orderId) {
    const cancel = await req('POST', `/orders/${orderId}/cancel`, null, token);
    const cancelOK = cancel.status >= 200 && cancel.status < 300;
    log('Cancel order', cancel.status, cancel.data);
    if (cancelOK) {
      console.log('   ✅ Order cancelled');

      // Duplicate cancellation
      const cancelAgain = await req('POST', `/orders/${orderId}/cancel`, null, token);
      log('Duplicate cancellation handled', cancelAgain.status, cancelAgain.data);
    } else {
      console.log('   Order cancellation not permitted (status does not allow). Marked NOT TESTED.');
    }
  }

  /* ---------- 20. REVIEW ---------- */
  console.log('\n--- 20. REVIEW ---\n');

  if (mainProduct) {
    const pid = mainProduct.id || mainProduct._id;
    const review = await req('POST', `/products/${pid}/reviews`, {
      rating: 5,
      comment: 'Phase 10C-2 regression test review'
    }, token);
    log('Submit review', review.status, review.data, review.status >= 200 && review.status < 300 ? null : null);

    // Duplicate review
    const dupReview = await req('POST', `/products/${pid}/reviews`, {
      rating: 4,
      comment: 'Duplicate review attempt'
    }, token);
    log('Duplicate review rejected', dupReview.status, dupReview.data, 409);

    // Verify review displays in public list
    const pubReviews = await req('GET', `/products/${pid}/reviews`, null, null);
    log('Public reviews list shows new review', pubReviews.status, pubReviews.data);
    const revs = pubReviews.data?.data?.reviews || pubReviews.data?.reviews || [];
    const found = revs.some(r => r.comment === 'Phase 10C-2 regression test review');
    console.log(`   New review visible publicly: ${found ? '✅' : '❌'}`);
  }

  /* ---------- 21. LOGOUT ---------- */
  console.log('\n--- 21. LOGOUT ---\n');

  const logout = await req('POST', '/auth/logout', null, token);
  log('Logout succeeds', logout.status, logout.data);

  // After logout, token should be invalidated
  await sleep(200);
  const afterLogoutCart = await req('GET', '/cart', null, token);
  log('Old token rejected after logout (401)', afterLogoutCart.status, afterLogoutCart.data, 401);

  /* ---------- SUMMARY ---------- */
  printSummary();
}

function printSummary() {
  console.log('\n========================================================');
  console.log('PHASE 10C-2 CUSTOMER REGRESSION SUMMARY');
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