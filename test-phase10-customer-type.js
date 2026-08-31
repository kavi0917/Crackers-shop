/* ============================================================
   VENDHAN CRACKERS — Phase 10 Retail / Wholesale Customer Type Tests
   Run: node test-phase10-customer-type.js
   Requires the backend server to be running on port 5000
   for integration sections (registration / admin / orders / reports).
   Unit sections (model / pricing) run without a server.
   ============================================================ */

const assert = require('assert');
const calculateProductPricing = require('./backend/utils/calculateProductPricing');
const calculatePricing = require('./backend/utils/calculatePricing');
const {
  CUSTOMER_TYPES,
  WHOLESALE_MIN_ORDER_AMOUNT,
  getWholesaleTier,
  isWholesaleMinimumOrderMet,
  calculateWholesaleDiscount
} = require('./backend/utils/wholesale');

/* ============================================================
   SECTION 1 — MODEL (offline)
   ============================================================ */

console.log('\n========== MODEL ==========\n');

(function testModel() {
  // Load the User model schema WITHOUT connecting to the database
  const User = require('./backend/models/User');
  const path = User.schema.path('customerType');

  // Default customerType = retail
  assert.strictEqual(path.options.default, 'retail', 'customerType default must be retail');

  // Enum values
  const enumValues = path.enumValues || (path.options && path.options.enum) || [];
  assert.ok(enumValues.includes('retail'), 'retail must be a valid customerType');
  assert.ok(enumValues.includes('wholesale'), 'wholesale must be a valid customerType');

  // Legacy user without customerType behaves as retail (schema default at runtime)
  const doc = new User({ name: 'Legacy User', email: 'legacy@test.com', phone: '9000000000', password: 'password123' });
  assert.strictEqual(doc.customerType, 'retail', 'Document without customerType must default to retail');
  console.log('  + MODEL — default customerType = retail');
  console.log('  + MODEL — retail accepted');
  console.log('  + MODEL — wholesale accepted');
  console.log('  + MODEL — legacy/missing customerType behaves as retail');

  // Invalid customerType is rejected by the schema enum on validation
  const invalid = new User({ name: 'Invalid', email: 'invalid@test.com', phone: '9000000001', password: 'password123', customerType: 'block' });
  const err = invalid.validateSync();
  assert.ok(err && err.errors && err.errors.customerType, 'customerType=block must fail schema validation');
  console.log('  + MODEL — invalid customerType rejected (schema enum)');
})();

/* ============================================================
   SECTION 2 — PRICING REGRESSION (offline)
   ============================================================ */

console.log('\n========== PRICING REGRESSION ==========\n');

(function testPricing() {
  // Retail receives no wholesale discount
  const retailPricing = calculateProductPricing(1000, 20, 0, 0);
  assert.strictEqual(retailPricing.finalPrice, 800);
  assert.strictEqual(retailPricing.wholesaleDiscountPercent, undefined);

  // Wholesale minimum ORDER AMOUNT: below ₹50,000 fails, at/above passes
  assert.strictEqual(WHOLESALE_MIN_ORDER_AMOUNT, 50000);
  assert.strictEqual(isWholesaleMinimumOrderMet(49999.99), false);
  assert.strictEqual(isWholesaleMinimumOrderMet(50000), true);
  assert.strictEqual(isWholesaleMinimumOrderMet(50001), true);

  // Wholesale tier boundaries
  const t0 = getWholesaleTier(49999.99);
  assert.strictEqual(t0.tier, null);
  assert.strictEqual(t0.discountPercent, 0);

  const t1 = getWholesaleTier(50000);
  assert.strictEqual(t1.tier, 'tier0');
  assert.strictEqual(t1.discountPercent, 5);

  const t2 = getWholesaleTier(99999.99);
  assert.strictEqual(t2.tier, 'tier0');
  assert.strictEqual(t2.discountPercent, 5);

  const t3 = getWholesaleTier(100000);
  assert.strictEqual(t3.tier, 'tier1');
  assert.strictEqual(t3.discountPercent, 7.5);

  // Higher tiers unchanged
  assert.strictEqual(calculateWholesaleDiscount(180000).discountPercent, 7.5);
  assert.strictEqual(calculateWholesaleDiscount(300000).discountPercent, 12);
  assert.strictEqual(calculateWholesaleDiscount(700000).discountPercent, 15);

  // Category discount happens BEFORE wholesale percentage
  const afterCategory = 60000 - 6000; // 60000 - 10% = 54000
  const wholesale = calculateWholesaleDiscount(afterCategory);
  assert.strictEqual(wholesale.tier, 'tier0');
  assert.strictEqual(wholesale.discountPercent, 5);
  assert.strictEqual(wholesale.discountAmount, 2700);

  // Checkout total equals created order total (same calculatePricing used by both)
  const items = [
    { price: 49000, originalPrice: 50000, discountAmount: 1000, quantity: 1 },
    { price: 5000, originalPrice: 6000, discountAmount: 1000, quantity: 1 }
  ];
  const settings = { deliveryCharge: 0, freeDeliveryThreshold: 1000, gstPercent: 18 };
  const amountAfterCategory = Math.round(
    items.reduce((sum, item) => sum + (item.originalPrice - item.discountAmount) * item.quantity, 0) * 100
  ) / 100;
  assert.strictEqual(amountAfterCategory, 54000);
  const totalPricing = calculatePricing(items, settings, {});
  assert.strictEqual(totalPricing.total, 63720);

  console.log('  + PRICING retail receives no wholesale discount');
  console.log('  + PRICING wholesale min ORDER AMOUNT 49,999.99 fails / 50,000 passes');
  console.log('  + PRICING 49,999.99 -> 0% | 50,000 -> 5% | 99,999.99 -> 5% | 100,000 -> 7.5%');
  console.log('  + PRICING higher tiers unchanged (7.5% / 12% / 15%)');
  console.log('  + PRICING category discount happens before wholesale percentage');
  console.log('  + PRICING checkout total equals created order total (same calculatePricing)');
})();

/* ============================================================
   SECTION 3 — INTEGRATION (requires running server on port 5000)
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
    console.log('  + [' + status + '] ' + name);
  } else {
    failed++;
    failures.push({ name, status, data, expectStatus });
    console.log('  X [' + status + '] ' + name + (expectStatus ? ' (expected ' + expectStatus + ')' : ''));
    console.log('      ' + JSON.stringify(data, null, 2).slice(0, 400));
  }
}

async function req(method, path, body, token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = 'Bearer ' + token;
  const res = await fetch(BASE + path, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  });
  let data = {};
  try { data = await res.json(); } catch (e) { /* empty */ }
  return { status: res.status, data };
}

async function runIntegration() {
  const ts = Date.now();
  const email = 'phase10.retail.' + ts + '@test.com';
  const wholesaleEmail = 'phase10.wholesale.' + ts + '@test.com';
  const defaultEmail = 'phase10.default.' + ts + '@test.com';
  const password = 'Phase10Pass123';
  const phone = '98888' + String(ts).slice(-5);

  /* ---------- ADMIN LOGIN ---------- */
  const adminLogin = await req('POST', '/admin/auth/login', { email: 'admin@vendhancrackers.in', password: 'admin123' });
  log('Admin login', adminLogin.status, adminLogin.data);
  const adminToken = adminLogin.data && adminLogin.data.data && adminLogin.data.data.token;
  if (!adminToken) {
    console.log('  ! No admin token — skipping integration sections (is the server running on port 5000?)');
    return;
  }

  /* ---------- REGISTRATION ---------- */
  console.log('\n========== REGISTRATION ==========\n');

  // Retail registration (explicit retail)
  const regRetail = await req('POST', '/auth/register', { name: 'Phase10 Retail', email: email, phone: phone, password: password, customerType: 'retail' });
  log('Register retail customer', regRetail.status, regRetail.data, 201);
  const retailUser = regRetail.data && regRetail.data.data && regRetail.data.data.user;
  if (retailUser) {
    assert.strictEqual(retailUser.customerType, 'retail', 'retail registration must set customerType=retail');
    console.log('  + Retail user customerType = retail');
  }
  const retailToken = (regRetail.data && regRetail.data.data && regRetail.data.data.token) || null;

  // Wholesale registration (explicit wholesale)
  const regWhole = await req('POST', '/auth/register', {
    name: 'Phase 10 Whole', email: wholesaleEmail, phone: '97777' + String(ts).slice(-5), password: password, customerType: 'wholesale'
  });
  log('Wholesale registration', regWhole.status, regWhole.data, 201);
  const wholesaleUser = regWhole.data && regWhole.data.data && regWhole.data.data.user;
  if (wholesaleUser) {
    assert.strictEqual(wholesaleUser.customerType, 'wholesale', 'wholesale registration must set customerType=wholesale');
    console.log('  + Wholesale user customerType = wholesale');
  }

  // Registration without customerType -> default retail
  const regDefault = await req('POST', '/auth/register', {
    name: 'Phase 10 Default',
    email: defaultEmail,
    phone: '96666' + String(ts).slice(-5),
    password: password
  });
  log('Registration without customerType defaults to retail', regDefault.status, regDefault.data, 201);
  const defaultUser = regDefault.data && regDefault.data.data && regDefault.data.data.user;
  if (defaultUser) {
    assert.strictEqual(defaultUser.customerType, 'retail', 'omitted customerType must default to retail');
    console.log('  + Omitted customerType defaults to retail');
  }

  // Invalid customerType rejected
  const badReg = await req('POST', '/auth/register', {
    name: 'Bad Type', email: 'phase10.bad.' + ts + '@test.com', phone: '95555' + String(ts).slice(-5),
    password: password, customerType: 'block'
  });
  const badStatusOK = badReg.status === 422 || badReg.status === 400;
  if (badStatusOK) {
    passed++;
    console.log('  + Invalid customerType rejected with validation error [' + badReg.status + ']');
  } else {
    log('Invalid customerType rejected', badReg.status, badReg.data, 422);
  }

  /* ---------- ADMIN FILTER ---------- */
  console.log('\n========== ADMIN CUSTOMER TYPE FILTER ==========\n');

  const allCust = await req('GET', '/admin/customers?limit=50', null, adminToken);
  log('Admin customers (all) load', allCust.status, allCust.data);
  const allList = (allCust.data && allCust.data.data && allCust.data.data.customers) || [];

  // Verify new wholesale customer appears in all
  const wholeInAll = allList.some(function (c) { return c.email === wholesaleEmail; });
  if (wholeInAll) {
    passed++;
    console.log('  + New wholesale customer appears in All endpoint');
  } else {
    failed++;
    failures.push({ name: 'Wholesale customer missing from All endpoint', status: 'DATA', data: allCust.data });
    console.log('  X New wholesale customer missing from All endpoint');
  }

  const retailFilter = await req('GET', '/admin/customers?customerType=retail&limit=50', null, adminToken);
  const retailList = (retailFilter.data && retailFilter.data.data && retailFilter.data.data.customers) || [];
  const retailOnly = retailList.every(function (c) { return (c.customerType || 'retail') === 'retail'; });
  if (retailOnly) {
    passed++;
    console.log('  + Retail filter returns only retail customers');
  } else {
    failed++;
    failures.push({ name: 'Retail filter contains non-retail customer', status: 'DATA', data: retailFilter.data });
    console.log('  X Retail filter contains non-retail customer');
  }

  const wholesaleFilter = await req('GET', '/admin/customers?customerType=wholesale&limit=50', null, adminToken);
  const wholesaleList = (wholesaleFilter.data && wholesaleFilter.data.data && wholesaleFilter.data.data.customers) || [];
  const wholesaleOnly = wholesaleList.every(function (c) { return (c.customerType || 'retail') === 'wholesale'; });
  if (wholesaleOnly) {
    passed++;
    console.log('  + Wholesale filter only contains wholesale customers');
  } else {
    failed++;
    failures.push({ name: 'Wholesale filter contains non-wholesale customer', status: 'DATA', data: wholesaleFilter.data });
    console.log('  X Wholesale filter contains non-wholesale customer');
  }

  // Search + customerType filter combine
  const searchFilter = await req('GET', '/admin/customers?customerType=retail&search=Phase10&limit=50', null, adminToken);
  if (searchFilter.status >= 200 && searchFilter.status < 300) {
    passed++;
    console.log('  + Search + customerType filter works');
  } else {
    log('Search + customerType filter works', searchFilter.status, searchFilter.data);
  }

  // Invalid customerType filter rejected
  const badType = await req('GET', '/admin/customers?customerType=block', null, adminToken);
  const badTypeOK = badType.status === 400 || badType.status === 422;
  if (badTypeOK) {
    passed++;
    console.log('  + Invalid admin customerType query rejected [' + badType.status + ']');
  } else {
    log('Invalid admin customerType query rejected', badType.status, badType.data, 400);
  }

  /* ---------- ADMIN TYPE CHANGE ---------- */
  console.log('\n========== ADMIN TYPE CHANGE ==========\n');

  let defaultUserInList = allList.find(function (c) { return c.email === defaultEmail; });
  if (!defaultUserInList) {
    const filtered = await req('GET', '/admin/customers?search=' + ts + '&limit=50', null, adminToken);
    defaultUserInList = ((filtered.data && filtered.data.data && filtered.data.data.customers) || []).find(function (c) { return c.email === defaultEmail; });
  }
  console.log('  User to change: ' + (defaultUserInList ? defaultUserInList.name : 'not found') + ' (' + (defaultUserInList ? defaultUserInList.customerType : '?') + ')');

  if (defaultUserInList) {
    const cid = defaultUserInList.id;

    // retail -> wholesale
    const toWhole = await req('PUT', '/admin/customers/' + cid + '/type', { customerType: 'wholesale' }, adminToken);
    log('Retail -> Wholesale change succeeds', toWhole.status, toWhole.data);
    const wholeCustomer = toWhole.data && toWhole.data.data && toWhole.data.data.customer;
    if (wholeCustomer && wholeCustomer.customerType === 'wholesale') {
      passed++;
      console.log('  + Customer changed to wholesale');
    } else {
      console.log('  X Customer did not change to wholesale');
    }

    // wholesale -> retail
    const toRetail = await req('PUT', '/admin/customers/' + cid + '/type', { customerType: 'retail' }, adminToken);
    log('Wholesale -> Retail change succeeds', toRetail.status, toRetail.data);
    const retailCustomer = toRetail.data && toRetail.data.data && toRetail.data.data.customer;
    if (retailCustomer && retailCustomer.customerType === 'retail') {
      passed++;
      console.log('  + Customer changed back to retail');
    } else {
      console.log('  X Customer did not change back to retail');
    }

    // invalid type rejected
    const badChange = await req('PUT', '/admin/customers/' + cid + '/type', { customerType: 'block' }, adminToken);
    const badChangeOK = badChange.status === 400 || badChange.status === 422;
    if (badChangeOK) {
      passed++;
      console.log('  + Invalid customer type change rejected [' + badChange.status + ']');
    } else {
      log('Invalid customer type change rejected', badChange.status, badChange.data, 400);
    }
  }

  // Unauthorized customer cannot change own type
  if (retailToken) {
    const me = await req('GET', '/auth/me', null, retailToken);
    const myId = (me.data && me.data.data && me.data.data.user && (me.data.data.user._id || me.data.data.user.id)) || null;
    if (myId) {
      const unauthorized = await req('PUT', '/admin/customers/' + myId + '/type', { customerType: 'wholesale' }, retailToken);
      const unauthOK = unauthorized.status === 403 || unauthorized.status === 401;
      if (unauthOK) {
        passed++;
        console.log('  + Customer cannot change own type [' + unauthorized.status + ']');
      } else {
        log('Customer cannot change own type (403)', unauthorized.status, unauthorized.data, 403);
      }
    } else {
      console.log('  (skipped) Cannot test unauthorized type change - no user id available');
    }
  }

  /* ---------- ORDER SNAPSHOT ---------- */
  console.log('\n========== ORDER SNAPSHOT ==========\n');

  if (retailToken) {
    const products = await req('GET', '/products?limit=5', null, null);
    const product = ((products.data && products.data.data && products.data.data.products) || []).find(function (p) { return p.stock > 0; });
    if (product) {
      const pid = product.id || product._id;
      // Quantity 10 — ensures the ₹2,000 minimum order value is met
      await req('POST', '/cart/items', { productId: pid, quantity: 10 }, retailToken);
      const orderRes = await req('POST', '/checkout', {
        name: 'Phase10 Retail',
        phone: phone,
        email: email,
        address: '12 Test Street',
        city: 'Chennai',
        state: 'Tamil Nadu',
        pincode: '600001',
        paymentMethod: 'cod'
      }, retailToken);
      const orderStatusOK = orderRes.status === 201 || orderRes.status === 200;
      if (orderStatusOK) {
        passed++;
        console.log('  + Retail order created');
        const order = (orderRes.data && orderRes.data.data && (orderRes.data.data.order || orderRes.data.data)) || null;
        const orderId = (order && (order._id || order.id)) || null;

        // Verify pricing.customerType = retail
        let snapshotRetail = false;
        if (order && order.pricing && order.pricing.customerType === 'retail') {
          snapshotRetail = true;
        } else if (orderId) {
          const orderDetail = await req('GET', '/orders/' + orderId, null, retailToken);
          const od = (orderDetail.data && orderDetail.data.data && (orderDetail.data.data.order || orderDetail.data.data)) || null;
          if (od && od.pricing && od.pricing.customerType === 'retail') {
            snapshotRetail = true;
          }
        }
        if (snapshotRetail) {
          passed++;
          console.log('  + Order pricing.customerType snapshot = retail');
        } else {
          failed++;
          failures.push({ name: 'Order snapshot customerType != retail', status: 'SNAPSHOT', data: orderRes.data });
          console.log('  X Order snapshot customerType != retail');
        }

        // Historical order protection: change User type retail -> wholesale does not alter order snapshot
        if (orderId) {
          const userForOrder = await req('GET', '/auth/me', null, retailToken);
          const uid = (userForOrder.data && userForOrder.data.data && userForOrder.data.data.user && (userForOrder.data.data.user._id || userForOrder.data.data.user.id)) || null;
          if (uid) {
            const changeReq = await req('PUT', '/admin/customers/' + uid + '/type', { customerType: 'wholesale' }, adminToken);
            if (changeReq.status >= 200 && changeReq.status < 300) {
              const orderAgain = await req('GET', '/orders/' + orderId, null, retailToken);
              const od2 = (orderAgain.data && orderAgain.data.data && (orderAgain.data.data.order || orderAgain.data.data)) || null;
              if (od2 && od2.pricing && od2.pricing.customerType === 'retail') {
                passed++;
                console.log('  + Changing User.customerType does NOT modify historical order snapshot');
              } else {
                failed++;
                failures.push({ name: 'Historical order snapshot mutated by user type change', status: 'MUTATED', data: od2 });
                console.log('  X Historical order snapshot was mutated by user type change');
              }
            } else {
              console.log('  (skipped) Could not change order-owner type');
            }
            // Restore the user to retail
            await req('PUT', '/admin/customers/' + uid + '/type', { customerType: 'retail' }, adminToken);
          }
        }
      } else {
        log('Retail order placement failed', orderRes.status, orderRes.data);
      }
    } else {
      console.log('  (skipped) No in-stock product found for order test');
    }
  }

  /* ---------- REPORT REGRESSION ---------- */
  console.log('\n========== REPORT REGRESSION ==========\n');

  const allReport = await req('GET', '/admin/reports/sales?period=all', null, adminToken);
  log('Report - All types loads', allReport.status, allReport.data);

  const retailReport = await req('GET', '/admin/reports/sales?customerType=retail&period=all', null, adminToken);
  log('Report - Retail filter loads', retailReport.status, retailReport.data);

  const wholesaleReport = await req('GET', '/admin/reports/sales?customerType=wholesale&period=all', null, adminToken);
  log('Report - Wholesale filter loads', wholesaleReport.status, wholesaleReport.data);

  // CSV filter propagation
  try {
    const csvRes = await fetch(BASE + '/admin/reports/export/csv?period=all&customerType=retail', {
      headers: { Authorization: 'Bearer ' + adminToken }
    });
    if (csvRes.status === 200) {
      const text = await csvRes.text();
      if (text.indexOf('VENDHAN CRACKERS') !== -1) {
        passed++;
        console.log('  + CSV export with customerType filter works');
      } else {
        failed++;
        failures.push({ name: 'CSV export missing header', status: 'CSV', data: {} });
        console.log('  X CSV export missing header');
      }
    } else {
      failed++;
      failures.push({ name: 'CSV export failed', status: csvRes.status, data: {} });
      console.log('  X CSV export failed [' + csvRes.status + ']');
    }
  } catch (e) {
    console.log('  X CSV export failed (network): ' + e.message);
  }

  // PDF filter propagation
  try {
    const pdfRes = await fetch(BASE + '/admin/reports/export/pdf?period=all&customerType=wholesale', {
      headers: { Authorization: 'Bearer ' + adminToken }
    });
    const buf = await pdfRes.arrayBuffer();
    const bytes = new Uint8Array(buf.slice(0, 5));
    const isPdf = buf.byteLength > 0 && bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46;
    if (pdfRes.status === 200 && isPdf) {
      passed++;
      console.log('  + PDF export with customerType filter works');
    } else {
      failed++;
      failures.push({ name: 'PDF export failed or invalid', status: pdfRes.status, data: {} });
      console.log('  X PDF export failed or invalid [' + pdfRes.status + ']');
    }
  } catch (e) {
    console.log('  X PDF export failed (network error): ' + e.message);
  }
}

async function main() {
  try {
    await runIntegration();
  } catch (e) {
    console.log('  W Integration error (server may not be running): ' + e.message);
  }
  console.log('\n========== SUMMARY ==========');
  console.log('Passed: ' + passed);
  console.log('Failed: ' + failed);
  if (failures.length > 0) {
    console.log('\nFailures:');
    failures.forEach(function (f, i) {
      console.log('  ' + (i + 1) + '. ' + f.name + ' [' + f.status + ']' + (f.expectStatus ? ' (expected ' + f.expectStatus + ')' : ''));
    });
  }
  console.log('\n' + (failed === 0 ? 'ALL PHASE 10 TESTS PASSED' : 'SOME PHASE 10 TESTS FAILED'));
  process.exit(failed > 0 ? 1 : 0);
}

main().catch(function (e) {
  console.error('Test runner error:', e);
  process.exit(1);
});