/* ============================================================
   VENDHAN CRACKERS — Contact Message Status Update Regression
   Requires backend running on port 5000.
   Run: node test-contact-status.js
   Guards: admin contact list rows must expose an id the frontend
   can use (m._id || m.id) — the frontend previously sent /undefined.
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
    console.log('PASS [' + status + '] ' + name);
  } else {
    failed++;
    failures.push({ name: name, status: status, data: data, expectStatus: expectStatus });
    console.log('FAIL [' + status + '] ' + name + (expectStatus ? ' (expected ' + expectStatus + ')' : ''));
    console.log(JSON.stringify(data, null, 2).slice(0, 400));
  }
}

function logBool(name, ok, data) {
  if (ok) {
    passed++;
    console.log('PASS ' + name);
  } else {
    failed++;
    failures.push({ name: name, status: 'bool', data: data, expectStatus: true });
    console.log('FAIL ' + name);
    console.log(JSON.stringify(data, null, 2).slice(0, 400));
  }
}

async function req(method, path, body, token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = 'Bearer ' + token;
  const res = await fetch(BASE + path, {
    method: method,
    headers: headers,
    body: body ? JSON.stringify(body) : undefined
  });
  let data = {};
  try { data = await res.json(); } catch (e) { /* empty */ }
  return { status: res.status, data: data };
}
async function main() {
  console.log('========== CONTACT MESSAGE STATUS REGRESSION ==========');

  /* 1. Admin login */
  const login = await req('POST', '/admin/auth/login', { email: 'admin@vendhancrackers.in', password: 'admin123' });
  log('Admin login succeeds', login.status, login.data, 200);
  const adminToken = login.data && login.data.data ? login.data.data.token : null;
  if (!adminToken) { console.log('No admin token - aborting'); printSummary(); return; }

  /* 2. Create test contact message */
  const stamp = Date.now();
  const submit = await req('POST', '/contact', {
    name: 'Regression Tester',
    email: 'contact-status-' + stamp + '@regression.test',
    phone: '9876512345',
    subject: 'Contact status regression',
    message: 'Message created by test-contact-status.js for status update verification.'
  });
  log('Create contact message succeeds (201)', submit.status, submit.data, 201);
  const messageId = submit.data && submit.data.data ? submit.data.data.messageId : null;

  /* 3. Admin list exposes an id usable by the frontend */
  const list = await req('GET', '/admin/contact-messages?limit=50', null, adminToken);
  log('Admin contact messages list loads (200)', list.status, list.data, 200);
  const rows = (list.data && list.data.data && list.data.data.messages) || [];
  let row = null;
  for (let i = 0; i < rows.length; i++) {
    if (rows[i].subject === 'Contact status regression') { row = rows[i]; break; }
  }
  if (!row) {
    log('Created message appears in admin list', false, { count: rows.length });
  } else {
    const usableId = row.id || row._id;
    logBool('List row exposes usable id (frontend bug guard)', !!usableId, row);
    logBool('Created message starts as new', row.status === 'new', row);

    /* 4. Update new -> read */
    const up1 = await req('PUT', `/admin/contact-messages/${usableId}`, { status: 'read' }, adminToken);
    log('Update status to read succeeds (200)', up1.status, up1.data, 200);

    const det1 = await req('GET', `/admin/contact-messages/${usableId}`, null, adminToken);
    logBool('Status persisted as read', det1.data && det1.data.data && det1.data.data.message && det1.data.data.message.status === 'read', det1.data);

    /* 5. Reverse: read -> new */
    const up2 = await req('PUT', `/admin/contact-messages/${usableId}`, { status: 'new' }, adminToken);
    log('Reverse update to new succeeds (200)', up2.status, up2.data, 200);

    const det2 = await req('GET', `/admin/contact-messages/${usableId}`, null, adminToken);
    logBool('Status persisted back to new', det2.data && det2.data.data && det2.data.data.message && det2.data.data.message.status === 'new', det2.data);

    /* 6. Other valid statuses */
    const up3 = await req('PUT', `/admin/contact-messages/${usableId}`, { status: 'replied' }, adminToken);
    const up4 = await req('PUT', `/admin/contact-messages/${usableId}`, { status: 'closed' }, adminToken);
    log('replied status accepted (200)', up3.status, up3.data, 200);
    log('closed status accepted (200)', up4.status, up4.data, 200);

    const det3 = await req('GET', `/admin/contact-messages/${usableId}`, null, adminToken);
    logBool('Final status closed persisted', det3.data && det3.data.data && det3.data.data.message && det3.data.data.message.status === 'closed', det3.data);
    logBool('Other fields not overwritten', det3.data && det3.data.data && det3.data.data.message && det3.data.data.message.subject === 'Contact status regression', det3.data);

    /* 8. Invalid status rejected */
    const bad = await req('PUT', `/admin/contact-messages/${usableId}`, { status: 'invalid' }, adminToken);
    log('Invalid status rejected (422)', bad.status, bad.data, 422);
  }

  /* 9. Unknown message id */
  const missing = await req('PUT', '/admin/contact-messages/000000000000000000000000', { status: 'read' }, adminToken);
  log('Unknown message id handled (404)', missing.status, missing.data, 404);

  /* 10. Unauthorized */
  const unauth = await req('PUT', `/admin/contact-messages/${messageId}`, { status: 'read' });
  log('Unauthorized update rejected (401)', unauth.status, unauth.data, 401);

  /* 11. Cleanup */
  if (messageId) {
    const del = await req('DELETE', `/admin/contact-messages/${messageId}`, null, adminToken);
    log('Cleanup deletes test message (200)', del.status, del.data, 200);
  }

  printSummary();
}

function printSummary() {
  console.log('');
  console.log('SUMMARY: ' + (failed === 0 ? 'PASS' : 'FAIL') + ' (' + passed + ' passed, ' + failed + ' failed)');
  for (let i = 0; i < failures.length; i++) {
    console.log('  - ' + failures[i].name + ' (status ' + failures[i].status + ')');
  }
  process.exit(failed ? 1 : 0);
}

main().catch(function (e) {
  console.error('FATAL', e);
  process.exit(2);
});