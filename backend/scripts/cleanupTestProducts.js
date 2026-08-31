/* ============================================================
   VENDHAN CRACKERS — ONE-TIME PRODUCT CLEANUP SCRIPT (PART 1)
   ⚠️ DESTRUCTIVE. READ FULLY BEFORE RUNNING.

   Removes ONLY the inactive test/duplicate products created by
   automated regression/upload/E2E test runs, plus their confirmed
   unwanted test records (combos whose ONLY referenced products are
   those test products).

   Real business data is NEVER deleted: orders, order items, pricing
   snapshots, customer history, commissions, referrals, reseller
   history, inventory audit logs, carts, reviews, users, categories,
   and every active product.

   USAGE:
     node scripts/cleanupTestProducts.js plan   # show plans, no changes
     node scripts/cleanupTestProducts.js run    # execute deletions
     node scripts/cleanupTestProducts.js create-fixtures  # test fixtures
   ============================================================ */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const { Product, Order, Cart, Combo, InventoryTransaction, Review } = require('../models');
const categoryService = require('../services/categoryService');

const TEST_PRODUCT_PATTERN = /(Regression Test|Upload Test|No Image Product|E2E Product|Test Product)/i;

const isTestName = (name) => TEST_PRODUCT_PATTERN.test(name || '');

async function connect() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/vendhan_crackers');
  console.log(`✅ Connected to MongoDB: ${mongoose.connection.name}\n`);
}

/* Load confirmed targets: inactive test products + combos referencing ONLY them. */
async function loadTargets() {
  const all = await Product.find();
  const confirmedProducts = all.filter((p) => p.status === 'inactive' && isTestName(p.name));
  const confirmedIds = new Set(confirmedProducts.map((p) => p._id.toString()));
  const activeIds = new Set(all.filter((p) => p.status === 'active').map((p) => p._id.toString()));

  const combos = await Combo.find();
  const testOnlyCombos = combos.filter((c) => {
    const refs = (c.items || []).map((i) => (i.product ? i.product.toString() : null)).filter(Boolean);
    if (refs.length === 0) return false;
    if (refs.some((r) => activeIds.has(r))) return false;
    return refs.every((r) => confirmedIds.has(r));
  });

  return { confirmedProducts, testOnlyCombos };
}

async function snapshot() {
  const orderItems = await Order.aggregate([{ $unwind: '$items' }, { $count: 'n' }]);
  const cartItems = await Cart.aggregate([{ $unwind: '$items' }, { $count: 'n' }]);
  return {
    products: await Product.countDocuments(),
    orders: await Order.countDocuments(),
    orderItems: orderItems.length ? orderItems[0].n : 0,
    cartItems: cartItems.length ? cartItems[0].n : 0,
    combos: await Combo.countDocuments(),
    inventoryTx: await InventoryTransaction.countDocuments(),
    reviews: await Review.countDocuments()
  };
}

const fmt = (s) => `${s.products} products | ${s.orders} orders | ${s.orderItems} orderItems | ${s.cartItems} cartItems | ${s.combos} combos | ${s.inventoryTx} invTx | ${s.reviews} reviews`;

/* ---------- PLAN (dry run) ---------- */
async function plan() {
  await connect();
  const before = await snapshot();
  const { confirmedProducts, testOnlyCombos } = await loadTargets();

  console.log('=== BEFORE ===');
  console.log('  ' + fmt(before));

  console.log('\n=== CONFIRMED TEST PRODUCTS TO DELETE ===');
  for (const p of confirmedProducts) {
    const o = await Order.countDocuments({ 'items.product': p._id });
    const c = await Cart.countDocuments({ 'items.product': p._id });
    const cm = await Combo.countDocuments({ 'items.product': p._id });
    const iv = await InventoryTransaction.countDocuments({ product: p._id });
    const rv = await Review.countDocuments({ product: p._id });
    console.log(`  ${p._id} | "${p.name}" | orders=${o} carts=${c} combos=${cm} invTx=${iv} reviews=${rv}`);
  }

  console.log('\n=== TEST-ONLY COMBOS TO DELETE ===');
  for (const c of testOnlyCombos) {
    console.log(`  ${c._id} | "${c.name}"`);
  }

  console.log('\n✅ Plan complete — no changes made.');
  await mongoose.disconnect();
}

/* ---------- RUN (execute) ---------- */
async function run() {
  await connect();
  const before = await snapshot();
  const { confirmedProducts, testOnlyCombos } = await loadTargets();

  console.log('=== RUNNING CLEANUP ===');

  // 1. Delete test-only combos (their only referenced products are being removed)
  let deletedCombos = [];
  for (const c of testOnlyCombos) {
    await Combo.findByIdAndDelete(c._id);
    deletedCombos.push(`${c._id} | "${c.name}"`);
  }
  console.log(`\nDeleted combos: ${deletedCombos.length}`);
  deletedCombos.forEach((d) => console.log('  - ' + d));

  // 2. Delete ONLY the confirmed inactive test products.
  //    Historical/business records are NEVER touched.
  let deletedProducts = [];
  for (const p of confirmedProducts) {
    await Product.findByIdAndDelete(p._id);
    deletedProducts.push(`${p._id} | "${p.name}"`);
  }
  console.log(`Deleted products: ${deletedProducts.length}`);
  deletedProducts.forEach((d) => console.log('  - ' + d));

  // 3. Refresh category product counts
  const catIds = new Set(confirmedProducts.filter((p) => p.category).map((p) => p.category.toString()));
  for (const cid of catIds) {
    await categoryService.refreshCategoryProductCount(cid);
  }

  const after = await snapshot();
  console.log('\n=== AFTER ===');
  console.log('  ' + fmt(after));

  console.log('\n=== DELETED ONLY ===');
  console.log(`  products: ${deletedProducts.length}  combos: ${deletedCombos.length}`);
  console.log('\n=== PRESERVED (unchanged counts) ===');
  console.log(`  orders: ${before.orders} → ${after.orders}`);
  console.log(`  orderItems: ${before.orderItems} → ${after.orderItems}`);
  console.log(`  inventoryTx: ${before.inventoryTx} → ${after.inventoryTx}`);
  console.log(`  reviews: ${before.reviews} → ${after.reviews}`);

  await mongoose.disconnect();
}

/* ---------- COMMAND DISPATCH ---------- */
(async () => {
  const cmd = process.argv[2] || 'help';
  try {
    if (cmd === 'plan') await plan();
    else if (cmd === 'run') await run();
    else if (cmd === 'create-fixtures') {
      await connect();
      const { createTestFixtures } = require('./createTestFixtures');
      await createTestFixtures();
      await mongoose.disconnect();
    } else {
      console.log('\nUsage: node scripts/cleanupTestProducts.js <command>');
      console.log('  plan              Show planned deletions (no changes)');
      console.log('  run               Execute the deletions');
      console.log('  create-fixtures   Create disposable test fixtures');
      console.log(`\nClassifies only INACTIVE products whose name matches:`);
      console.log(`  /${TEST_PRODUCT_PATTERN.source}/`);
      console.log('Real business data and active products are ALWAYS preserved.');
    }
    process.exit(0);
  } catch (e) {
    console.error('❌ Cleanup failed:', e);
    process.exit(1);
  }
})();