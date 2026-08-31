/* ============================================================
   VENDHAN CRACKERS — Phase 8 Integration Test Script
   Requires the backend server to be running on port 5000.
   Run: node test-phase8.js
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
    console.log(JSON.stringify(data, null, 2).slice(0, 400));
  }
}

function logExpect(name, status, expected, data) {
  const pass = status === expected;
  console.log(`${pass ? '✅' : '❌'} [${status} (expected ${expected})] ${name} — ${pass ? 'correctly rejected' : 'UNEXPECTED'}`);
}

async function main() {
  console.log('========== PHASE 8 INTEGRATION TESTS ==========\n');

  // ---------- LOGINS ----------
  const customerLogin = await req('POST', '/auth/login', { email: 'ramesh@example.com', password: 'customer123' });
  log('Customer login (ramesh)', customerLogin.status, customerLogin.data);
  const customerToken = customerLogin.data?.data?.token;

  const customer2Login = await req('POST', '/auth/login', { email: 'priya@example.com', password: 'customer123' });
  log('Customer login (priya)', customer2Login.status, customer2Login.data);
  const customer2Token = customer2Login.data?.data?.token;

  const adminLogin = await req('POST', '/admin/auth/login', { email: 'admin@vendhancrackers.in', password: 'admin123' });
  log('Admin login', adminLogin.status, adminLogin.data);
  const adminToken = adminLogin.data?.data?.token;

  // ---------- PRODUCTS FOR CONTEXT ----------
  const products = await req('GET', '/products?limit=50', null);
  const activeProducts = products.data?.data?.products || [];
  const inStockProduct = activeProducts.find((p) => p.stock > 0);
  const outOfStockProduct = activeProducts.find((p) => p.stock === 0);

  console.log('\n--- FESTIVAL COMBOS ---\n');

  // 1. Get combos
  const combos = await req('GET', '/combos', null);
  log('Get active combos', combos.status, combos.data);
  const comboId = combos.data?.data?.combos?.[0]?._id;
  console.log('   Testing with combo:', combos.data?.data?.combos?.[0]?.name);

  // 2. Get combo details
  if (comboId) {
    const comboDetail = await req('GET', `/combos/${comboId}`, null);
    log('Get combo details', comboDetail.status, comboDetail.data);
  }

  // 3. Add combo to cart
  if (comboId) {
    const addCombo = await req('POST', `/combos/${comboId}/add-to-cart`, {}, customerToken);
    log('Add combo to cart', addCombo.status, addCombo.data);
  }

  // 4. Invalid combo ID (non-ObjectId) — 422 is the project's validation convention
  const invalidCombo = await req('GET', '/combos/invalid-id', null);
  logExpect('Invalid combo ID rejected', invalidCombo.status, 422, invalidCombo.data);

  // 5. Unauthenticated add to cart
  if (comboId) {
    const noAuth = await req('POST', `/combos/${comboId}/add-to-cart`, {}, null);
    logExpect('Unauthenticated combo add blocked', noAuth.status, 401, noAuth.data);
  }

  // 6. Admin create combo
  const newCombo = await req('POST', '/admin/combos', {
    name: 'Test Combo',
    price: 350,
    description: 'A test combo',
    discount: 10,
    items: [{ product: inStockProduct?._id, quantity: 2 }]
  }, adminToken);
  log('Admin create combo', newCombo.status, newCombo.data);
  const newComboId = newCombo.data?.data?.combo?._id;

  // 7. Admin update combo
  if (newComboId) {
    const updateCombo = await req('PUT', `/admin/combos/${newComboId}`, { price: 400, discount: 15 }, adminToken);
    log('Admin update combo', updateCombo.status, updateCombo.data);
  }

  // 8. Invalid product in combo (non-existent ObjectId)
  const badCombo = await req('POST', '/admin/combos', {
    name: 'Bad Combo',
    price: 100,
    items: [{ product: '507f1f77bcf86cd799439011', quantity: 1 }]
  }, adminToken);
  logExpect('Invalid product in combo rejected', badCombo.status, 400, badCombo.data);

  // 9. Duplicate product in combo
  const dupCombo = await req('POST', '/admin/combos', {
    name: 'Dup Combo',
    price: 100,
    items: [
      { product: inStockProduct?._id, quantity: 1 },
      { product: inStockProduct?._id, quantity: 2 }
    ]
  }, adminToken);
  logExpect('Duplicate product in combo rejected', dupCombo.status, 400, dupCombo.data);

  // 10. Admin deactivate combo
  if (newComboId) {
    const deactivate = await req('DELETE', `/admin/combos/${newComboId}`, null, adminToken);
    log('Admin deactivate combo (delete)', deactivate.status, deactivate.data);
  }

  console.log('\n--- CUSTOMER REVIEWS ---\n');

  // 11. Create review
  const newReview = await req('POST', `/products/${inStockProduct?._id}/reviews`, { rating: 5, comment: 'Phase 8 test review' }, customerToken);
  log('Create review', newReview.status, newReview.data);
  const reviewId = newReview.data?.data?.review?._id;

  // 12. Invalid rating
  const badRating = await req('POST', `/products/${inStockProduct?._id}/reviews`, { rating: 6, comment: 'Too high' }, customerToken);
  logExpect('Invalid rating (6) rejected', badRating.status, 422, badRating.data);

  // 13. Duplicate review
  const dupReview = await req('POST', `/products/${inStockProduct?._id}/reviews`, { rating: 4, comment: 'Duplicate attempt' }, customerToken);
  logExpect('Duplicate review rejected', dupReview.status, 409, dupReview.data);

  // 14. List public reviews
  const listReviews = await req('GET', `/products/${inStockProduct?._id}/reviews`, null);
  log('List product reviews', listReviews.status, listReviews.data);

  // 15. Update own review
  if (reviewId) {
    const updateOwn = await req('PUT', `/reviews/${reviewId}`, { rating: 4, comment: 'Updated review' }, customerToken);
    log('Update own review', updateOwn.status, updateOwn.data);
  }

  // 16. Attempt to update another user's review
  if (reviewId) {
    const updateOther = await req('PUT', `/reviews/${reviewId}`, { rating: 1 }, customer2Token);
    logExpect('Cannot update other user review', updateOther.status, 403, updateOther.data);
  }

  // 17. Delete own review
  if (reviewId) {
    const delOwn = await req('DELETE', `/reviews/${reviewId}`, null, customerToken);
    log('Delete own review', delOwn.status, delOwn.data);
  }

  // 18. Admin hide review
  const adminReviewList = await req('GET', '/admin/reviews', null, adminToken);
  log('Admin list reviews', adminReviewList.status, adminReviewList.data);
  const existingReviewId = adminReviewList.data?.data?.reviews?.[0]?._id;
  if (existingReviewId) {
    const hideReview = await req('DELETE', `/admin/reviews/${existingReviewId}`, null, adminToken);
    log('Admin hide review', hideReview.status, hideReview.data);

    // Verify it's hidden
    const getHidden = await req('GET', `/admin/reviews/${existingReviewId}`, null, adminToken);
    log('Hidden review status check', getHidden.status, getHidden.data);
    const status = getHidden.data?.data?.review?.status;
    console.log(`   Hidden review status: ${status}`);
  }

  // 19. Product rating recalculated
  const productAfter = await req('GET', `/products/${inStockProduct?._id}`, null);
  log('Product rating after review changes', productAfter.status, productAfter.data);
  console.log(`   Product rating: ${productAfter.data?.data?.product?.rating}, reviewCount: ${productAfter.data?.data?.product?.reviewCount}`);

  console.log('\n--- CONTACT MESSAGES ---\n');

  // 20. Submit contact message
  const contactSubmit = await req('POST', '/contact', {
    name: 'Test User',
    email: 'test@example.com',
    phone: '9840012345',
    subject: 'Test enquiry',
    message: 'This is a test message for the contact form.'
  });
  log('Submit contact message', contactSubmit.status, contactSubmit.data);
  const contactId = contactSubmit.data?.data?.messageId;

  // 21. Invalid email
  const badEmail = await req('POST', '/contact', {
    name: 'Test User',
    email: 'invalid-email',
    subject: 'Test',
    message: 'This is a test message.'
  });
  logExpect('Invalid email rejected', badEmail.status, 422, badEmail.data);

  // 22. Missing required fields
  const missingFields = await req('POST', '/contact', { name: 'Test' });
  logExpect('Missing required fields rejected', missingFields.status, 422, missingFields.data);

  // 23. Admin list messages
  const adminMessages = await req('GET', '/admin/contact-messages', null, adminToken);
  log('Admin list contact messages', adminMessages.status, adminMessages.data);

  // 24. Search messages
  const searchMessages = await req('GET', '/admin/contact-messages?search=Test', null, adminToken);
  log('Search contact messages', searchMessages.status, searchMessages.data);

  // 25. Filter by status
  const filterMessages = await req('GET', '/admin/contact-messages?status=new', null, adminToken);
  log('Filter contact messages by status', filterMessages.status, filterMessages.data);

  // 26. Update message status
  if (contactId) {
    const updateStatus = await req('PUT', `/admin/contact-messages/${contactId}`, { status: 'read' }, adminToken);
    log('Update contact message status', updateStatus.status, updateStatus.data);
  }

  // 27. Customer blocked from admin contact
  const customerBlockedContact = await req('GET', '/admin/contact-messages', null, customerToken);
  logExpect('Customer blocked from admin contact', customerBlockedContact.status, 403, customerBlockedContact.data);

  console.log('\n--- ADMIN SETTINGS ---\n');

  // 28. Admin gets settings
  const getSettings = await req('GET', '/admin/settings', null, adminToken);
  log('Admin get settings', getSettings.status, getSettings.data);

  // 29. Admin updates settings
  const updateSettings = await req('PUT', '/admin/settings', { deliveryCharge: 59, gst: 18 }, adminToken);
  log('Admin update settings', updateSettings.status, updateSettings.data);

  // 30. Invalid GST
  const badGst = await req('PUT', '/admin/settings', { gst: 150 }, adminToken);
  logExpect('Invalid GST rejected', badGst.status, 422, badGst.data);

  // 31. Invalid delivery charge
  const badDelivery = await req('PUT', '/admin/settings', { deliveryCharge: -5 }, adminToken);
  logExpect('Invalid delivery charge rejected', badDelivery.status, 422, badDelivery.data);

  // 32. Customer cannot update settings
  const customerSettings = await req('PUT', '/admin/settings', { shopName: 'Hacked' }, customerToken);
  logExpect('Customer blocked from settings', customerSettings.status, 403, customerSettings.data);

  console.log('\n--- CUSTOMER MANAGEMENT ---\n');

  // 33. Admin lists customers
  const listCustomers = await req('GET', '/admin/customers', null, adminToken);
  log('Admin list customers', listCustomers.status, listCustomers.data);

  // 34. Search customers
  const searchCustomers = await req('GET', '/admin/customers?search=ramesh', null, adminToken);
  log('Search customers', searchCustomers.status, searchCustomers.data);

  // 35. View customer
  const customerId = listCustomers.data?.data?.customers?.[0]?.id;
  if (customerId) {
    const viewCustomer = await req('GET', `/admin/customers/${customerId}`, null, adminToken);
    log('View customer', viewCustomer.status, viewCustomer.data);
    // Ensure no password field
    const hasPassword = 'password' in (viewCustomer.data?.data?.customer || {});
    console.log(`${!hasPassword ? '✅' : '❌'} Customer response has no password field`);
  }

  // 36. Customer orders
  if (customerId) {
    const customerOrders = await req('GET', `/admin/customers/${customerId}/orders`, null, adminToken);
    log('View customer orders', customerOrders.status, customerOrders.data);
  }

  // 37. Update customer status
  if (customerId) {
    const updateStatus = await req('PUT', `/admin/customers/${customerId}/status`, { status: 'inactive' }, adminToken);
    log('Update customer status', updateStatus.status, updateStatus.data);

    // Restore status
    const restoreStatus = await req('PUT', `/admin/customers/${customerId}/status`, { status: 'active' }, adminToken);
    log('Restore customer status', restoreStatus.status, restoreStatus.data);
  }

  // 38. Customer cannot access admin customer APIs
  const customerBlocked = await req('GET', '/admin/customers', null, customerToken);
  logExpect('Customer blocked from admin customers', customerBlocked.status, 403, customerBlocked.data);

  // 39. Invalid customer status
  const badStatus = await req('PUT', `/admin/customers/${customerId}/status`, { status: 'banned' }, adminToken);
  logExpect('Invalid customer status rejected', badStatus.status, 422, badStatus.data);

  console.log('\n--- ADMIN USER MANAGEMENT ---\n');

  // 40. Super admin lists admin users
  const listAdmins = await req('GET', '/admin/users', null, adminToken);
  log('Admin list users (super_admin)', listAdmins.status, listAdmins.data);

  // 41. Create admin (unique email with timestamp)
  const uniqueEmail = `manager${Date.now()}@vendhancrackers.in`;
  const createAdmin = await req('POST', '/admin/users', {
    name: 'New Manager',
    email: uniqueEmail,
    password: 'manager123',
    role: 'manager'
  }, adminToken);
  log('Admin create user', createAdmin.status, createAdmin.data);
  const newAdminId = createAdmin.data?.data?.admin?._id;

  // 42. Duplicate admin email
  const dupAdmin = await req('POST', '/admin/users', {
    name: 'Another Manager',
    email: uniqueEmail,
    password: 'manager123',
    role: 'manager'
  }, adminToken);
  logExpect('Duplicate admin email rejected', dupAdmin.status, 409, dupAdmin.data);

  // 43. Update admin status
  if (newAdminId) {
    const updateAdminStatus = await req('PUT', `/admin/users/${newAdminId}/status`, { status: 'inactive' }, adminToken);
    log('Update admin user status', updateAdminStatus.status, updateAdminStatus.data);
  }

  // 44. Cleanup: delete test combo and admin
  if (newComboId) {
    await req('DELETE', `/admin/combos/${newComboId}`, null, adminToken);
  }
  if (contactId) {
    await req('DELETE', `/admin/contact-messages/${contactId}`, null, adminToken);
  }

  console.log('\n========== PHASE 8 TESTS COMPLETE ==========');
}

main().catch((err) => {
  console.error('Test script error:', err);
  process.exit(1);
});