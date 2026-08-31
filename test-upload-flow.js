/* ============================================================
   VENDHAN CRACKERS — Product Image Upload Functional Test
   Requires backend running on port 5000.
   Run: node test-upload-flow.js
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

async function jsonReq(method, path, body, token) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body) headers['Content-Type'] = 'application/json';
  const res = await fetch(BASE + path, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  });
  let data = {};
  try { data = await res.json(); } catch (e) { /* empty */ }
  return { status: res.status, data };
}

async function formReq(method, path, formData, token) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(BASE + path, {
    method,
    headers,
    body: formData
  });
  let data = {};
  try { data = await res.json(); } catch (e) { /* empty */ }
  return { status: res.status, data };
}

// Create a small valid PNG buffer (1x1 transparent pixel)
function makePngBuffer() {
  // Minimal valid PNG: 1x1 transparent
  const b64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
  return Buffer.from(b64, 'base64');
}

// Create a fake non-image file buffer
function makeTextBuffer() {
  return Buffer.from('This is not an image file', 'utf8');
}

// Create an oversized buffer (> 5MB)
function makeOversizedBuffer() {
  return Buffer.alloc(5 * 1024 * 1024 + 1024, 0x61); // 5MB + 1KB of 'a'
}

async function main() {
  console.log('========== PRODUCT IMAGE UPLOAD FUNCTIONAL TEST ==========\n');

  /* ---------- 1. ADMIN LOGIN ---------- */
  console.log('--- 1. ADMIN LOGIN ---\n');

  const login = await jsonReq('POST', '/admin/auth/login', { email: 'admin@vendhancrackers.in', password: 'admin123' });
  log('Admin login succeeds', login.status, login.data);
  const adminToken = login.data?.data?.token;

  if (!adminToken) {
    console.log('❌ No admin token obtained — aborting');
    printSummary();
    return;
  }

  /* ---------- 2. GET CATEGORY ---------- */
  console.log('\n--- 2. GET CATEGORY ---\n');

  const cats = await jsonReq('GET', '/admin/categories', null, adminToken);
  const catList = cats.data?.data?.categories || cats.data?.data || [];
  const catId = catList[0]?.id || catList[0]?._id;
  console.log(`   Using category ID: ${catId}`);

  if (!catId) {
    console.log('❌ No category found — aborting');
    printSummary();
    return;
  }

  /* ---------- 3. A. ADD PRODUCT WITH IMAGE ---------- */
  console.log('\n--- 3. A. ADD PRODUCT WITH IMAGE ---\n');

  const pngBuffer = makePngBuffer();
  const testName = `Upload Test Product ${Date.now()}`;

  const fd1 = new FormData();
  fd1.append('name', testName);
  fd1.append('category', catId);
  fd1.append('status', 'active');
  fd1.append('description', 'Upload functional test product');
  fd1.append('price', '149');
  fd1.append('originalPrice', '199');
  fd1.append('discount', '25');
  fd1.append('stock', '50');
  fd1.append('image', new Blob([pngBuffer], { type: 'image/png' }), 'test-image.png');

  const createRes = await formReq('POST', '/admin/products', fd1, adminToken);
  log('Create product with image succeeds', createRes.status, createRes.data, 201);
  const newProd = createRes.data?.data?.product || createRes.data?.data;
  const newProdId = newProd?.id || newProd?._id;
  const newProdImages = newProd?.images || [];
  console.log(`   New product ID: ${newProdId}`);
  console.log(`   Images array: ${JSON.stringify(newProdImages)}`);
  console.log(`   Image URL/path returned: ${newProdImages.length > 0 ? '✅' : '❌'}`);
  if (newProdImages.length === 0) {
    failed++;
    failures.push({ name: 'Product created without image path', status: 'NO_IMAGE', data: newProd });
  }

  /* ---------- 4. B. ADD PRODUCT WITHOUT IMAGE ---------- */
  console.log('\n--- 4. B. ADD PRODUCT WITHOUT IMAGE ---\n');

  // Requirement discovered during audit: the FRONTEND form (admin.html) requires an
  // image for new products. The BACKEND API must still accept products without an
  // uploaded file because existing products use external Unsplash URLs and the
  // regression test creates products via JSON with external images. Do NOT invent
  // a backend image requirement.
  const fd2 = new FormData();
  fd2.append('name', `No Image Product ${Date.now()}`);
  fd2.append('category', catId);
  fd2.append('status', 'active');
  fd2.append('description', 'Product without image (external URL supported)');
  fd2.append('price', '99');
  fd2.append('stock', '10');

  const noImgRes = await formReq('POST', '/admin/products', fd2, adminToken);
  log('Product without uploaded file accepted (external URL support)', noImgRes.status, noImgRes.data, 201);
  console.log(`   Images: ${JSON.stringify(noImgRes.data?.data?.product?.images || [])}`);

  // Clean up the no-image product
  const noImgProd = noImgRes.data?.data?.product || noImgRes.data?.data;
  const noImgProdId = noImgProd?.id || noImgProd?._id;
  if (noImgProdId) {
    const delNoImg = await jsonReq('DELETE', `/admin/products/${noImgProdId}`, null, adminToken);
    log('Cleanup: delete no-image test product', delNoImg.status, delNoImg.data);
  }

  /* ---------- 5. C. INVALID FILE ---------- */
  console.log('\n--- 5. C. INVALID FILE ---\n');

  const fd3 = new FormData();
  fd3.append('name', `Invalid File Product ${Date.now()}`);
  fd3.append('category', catId);
  fd3.append('status', 'active');
  fd3.append('description', 'Product with invalid file');
  fd3.append('price', '99');
  fd3.append('stock', '10');
  fd3.append('image', new Blob([makeTextBuffer()], { type: 'text/plain' }), 'fake.txt');

  const invalidRes = await formReq('POST', '/admin/products', fd3, adminToken);
  log('Invalid file type rejected (400)', invalidRes.status, invalidRes.data, 400);
  console.log(`   Error message: ${invalidRes.data?.message || invalidRes.data?.error || '?'}`);

  /* ---------- 6. D. OVERSIZED IMAGE ---------- */
  console.log('\n--- 6. D. OVERSIZED IMAGE ---\n');

  const fd4 = new FormData();
  fd4.append('name', `Oversized Product ${Date.now()}`);
  fd4.append('category', catId);
  fd4.append('status', 'active');
  fd4.append('description', 'Product with oversized image');
  fd4.append('price', '99');
  fd4.append('stock', '10');
  fd4.append('image', new Blob([makeOversizedBuffer()], { type: 'image/png' }), 'big.png');

  const oversizedRes = await formReq('POST', '/admin/products', fd4, adminToken);
  log('Oversized image rejected (400)', oversizedRes.status, oversizedRes.data, 400);
  console.log(`   Error message: ${oversizedRes.data?.message || oversizedRes.data?.error || '?'}`);

  /* ---------- 7. E. EDIT WITHOUT NEW IMAGE ---------- */
  console.log('\n--- 7. E. EDIT WITHOUT NEW IMAGE ---\n');

  if (newProdId) {
    const fd5 = new FormData();
    fd5.append('name', testName + ' EDITED');
    fd5.append('category', catId);
    fd5.append('status', 'active');
    fd5.append('description', 'Edited without new image');
    fd5.append('price', '179');
    fd5.append('stock', '60');

    const editRes = await formReq('PUT', `/admin/products/${newProdId}`, fd5, adminToken);
    log('Edit product without new image succeeds', editRes.status, editRes.data);

    // Verify existing image preserved
    const getRes = await jsonReq('GET', `/admin/products/${newProdId}`, null, adminToken);
    const gotProd = getRes.data?.data?.product || getRes.data?.data;
    if (gotProd) {
      const gotImages = gotProd.images || [];
      const imagePreserved = gotImages.length > 0 && gotImages[0] === newProdImages[0];
      console.log(`   Existing image preserved: ${imagePreserved ? '✅' : '❌'}`);
      console.log(`   Original image: ${newProdImages[0]}`);
      console.log(`   Current image: ${gotImages[0]}`);
      if (!imagePreserved) {
        failed++;
        failures.push({ name: 'Existing image erased on edit without new image', status: 'IMAGE_LOST', data: gotProd });
      }
    }
  }

  /* ---------- 8. F. EDIT WITH NEW IMAGE ---------- */
  console.log('\n--- 8. F. EDIT WITH NEW IMAGE ---\n');

  if (newProdId) {
    const fd6 = new FormData();
    fd6.append('name', testName + ' EDITED AGAIN');
    fd6.append('category', catId);
    fd6.append('status', 'active');
    fd6.append('description', 'Edited with new image');
    fd6.append('price', '189');
    fd6.append('stock', '70');
    fd6.append('image', new Blob([pngBuffer], { type: 'image/png' }), 'new-image.png');

    const editRes2 = await formReq('PUT', `/admin/products/${newProdId}`, fd6, adminToken);
    log('Edit product with new image succeeds', editRes2.status, editRes2.data);

    // Verify new image used
    const getRes2 = await jsonReq('GET', `/admin/products/${newProdId}`, null, adminToken);
    const gotProd2 = getRes2.data?.data?.product || getRes2.data?.data;
    if (gotProd2) {
      const gotImages2 = gotProd2.images || [];
      const newImageUsed = gotImages2.length > 0 && gotImages2[0] !== newProdImages[0];
      console.log(`   New image used: ${newImageUsed ? '✅' : '❌'}`);
      console.log(`   Old image: ${newProdImages[0]}`);
      console.log(`   New image: ${gotImages2[0]}`);
      if (!newImageUsed) {
        failed++;
        failures.push({ name: 'New image not applied on edit', status: 'IMAGE_NOT_CHANGED', data: gotProd2 });
      }
    }
  }

  /* ---------- 9. I. AUTHORIZATION ---------- */
  console.log('\n--- 9. I. AUTHORIZATION ---\n');

  const fd7 = new FormData();
  fd7.append('name', 'Unauthorized Product');
  fd7.append('category', catId);
  fd7.append('price', '99');
  fd7.append('stock', '10');

  const unauthRes = await formReq('POST', '/admin/products', fd7, null);
  log('Create product without token → 401', unauthRes.status, unauthRes.data, 401);

  /* ---------- 10. CLEANUP ---------- */
  console.log('\n--- 10. CLEANUP ---\n');

  if (newProdId) {
    const delRes = await jsonReq('DELETE', `/admin/products/${newProdId}`, null, adminToken);
    log('Cleanup: delete test product', delRes.status, delRes.data);
  }

  /* ---------- SUMMARY ---------- */
  printSummary();
}

function printSummary() {
  console.log('\n========================================================');
  console.log('PRODUCT IMAGE UPLOAD FUNCTIONAL TEST SUMMARY');
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