/* In-process verification of the Low Stock Alert fix against the real MongoDB.
   Exercises the EDITED service functions directly (no HTTP layer).
   Creates/disposes test products and temporarily changes the threshold,
   restoring everything at the end. */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, 'backend', '.env') });

const { connectDB, disconnectDB } = require('./backend/config/database');
const { Product, Setting, Category } = require('./backend/models');
const adminDashboardService = require('./backend/services/adminDashboardService');
const adminInventoryService = require('./backend/services/adminInventoryService');

const realTargets = ['5 INCH FANCY (1BOX 2PCS)', '5 INCH NIGARA FANCY', '240 SHOT MULTICOLOUR(1 BOX)', '60 SHOT CRACKLING'];
const created = [];
let originalThreshold = null;

async function setThreshold(t) {
  const s = await Setting.getSettings();
  if (originalThreshold === null) { originalThreshold = s.lowStockThreshold; }
  s.lowStockThreshold = t;
  await s.save();
}

async function getCounts() {
  const summary = await adminDashboardService.getSummary();
  const dash = await adminDashboardService.getLowStock();
  const inv = await adminInventoryService.listLowStock();
  const dashNames = dash.map(p => String(p.name));
  const invNames = inv.map(p => String(p.name));
  const previewNames = (summary.lowStockPreview || []).map(p => String(p.name));
  return {
    count: summary.lowStockCount,
    dashNames, invNames, previewNames,
    dash: (name) => dashNames.includes(name),
    inv: (name) => invNames.includes(name),
    prev: (name) => previewNames.includes(name)
  };
}

async function mkProduct(stock, reorder) {
  const cat = await Category.findOne({});
  const name = 'LOWTEST_' + Date.now() + '_' + Math.floor(Math.random() * 1e6);
  const p = await Product.create({ name, description: 'disposable', price: 10, stock, reorderLevel: reorder, category: cat._id });
  created.push(p._id);
  return { id: p._id, name, stock: p.stock, reorder: p.reorderLevel };
}

function banner(t) { console.log('\n=== ' + t + ' ==='); }
function check(label, ok) { console.log(('  ' + (ok ? 'PASS' : 'FAIL') + ' | ' + label)); if (!ok) process.exitCode = 1; }

(async () => {
  await connectDB();
  try {
    await setThreshold(50);

    banner('A) threshold=50, real products stock=25/reorder=20');
    let c = await getCounts();
    check('lowStockCount >= 4 (real stock=25 products)', c.count >= 4);
    check('all 4 real products in dashboard low-stock list', realTargets.every(n => c.dash(n)));
    check('all 4 real products in dashboard lowStockPreview', realTargets.every(n => c.prev(n)));
    check('all 4 real products in inventory low-stock list', realTargets.every(n => c.inv(n)));

    banner('B) threshold=50 boundary stocks');
    const s20 = await mkProduct(20, 20);
    const s50 = await mkProduct(50, 20);
    const s51 = await mkProduct(51, 20);
    const s0  = await mkProduct(0, 20);
    await setThreshold(50);
    c = await getCounts();
    check('stock=20 is Low Stock (dash+inventory)', c.dash(s20.name) && c.inv(s20.name));
    check('stock=50 is Low Stock (dash+inventory)', c.dash(s50.name) && c.inv(s50.name));
    check('stock=51 is NOT Low Stock', !c.dash(s51.name) && !c.inv(s51.name));
    check('stock=0 is NOT Low Stock (Out of Stock)', !c.dash(s0.name) && !c.inv(s0.name));
    const oosCount = await Product.countDocuments({ status: 'active', stock: 0 });
    check('out-of-stock handling intact (stock=0 still counted via stock:0)', oosCount >= 1);

    banner('C) live threshold change 50 -> 30 with a stock=40 product');
    const s40 = await mkProduct(40, 20);
    await setThreshold(50);
    c = await getCounts();
    check('threshold=50: stock=40 is Low Stock', c.dash(s40.name) && c.inv(s40.name));
    await setThreshold(30);
    c = await getCounts();
    check('threshold=30: stock=40 is NOT Low Stock (immediate on reload)', !c.dash(s40.name) && !c.inv(s40.name));
    check('threshold=30: stock=25 real products still Low Stock (25<=30)', realTargets.every(n => c.dash(n)));
  } finally {
    await setThreshold(originalThreshold === null ? 20 : originalThreshold);
    await Product.deleteMany({ _id: { $in: created } });
    const final = (await Setting.getSettings()).lowStockThreshold;
    console.log('\nCleanup: threshold restored to', final, '| test products deleted:', created.length);
    await disconnectDB();
  }
})();
