/* ============================================================
   VENDHAN CRACKERS — Test Fixture Creator
   Creates DISPOSABLE test fixtures used to verify the PART 1
   cleanup script in isolation. Safe to run repeatedly.
   ============================================================ */

const { Product, Category, Combo } = require('../models');

/**
 * Create disposable inactive test products + a test-only combo.
 * Idempotent by unique-name markers.
 */
async function createTestFixtures() {
  const category = await Category.findOne();
  if (!category) {
    throw new Error('No category found to attach test fixtures');
  }

  const stamp = Date.now();
  const created = [];

  // 1. Inactive "Regression Test Product" (matches the automated-test marker)
  const p1 = await Product.create({
    name: `Regression Test Product ${stamp}`,
    slug: `regression-test-product-${stamp}`,
    description: 'Disposable cleanup-test fixture',
    category: category._id,
    price: 129,
    stock: 15,
    reorderLevel: 5,
    status: 'inactive'
  });
  created.push(p1);

  // 2. Inactive "Upload Test Product"
  const p2 = await Product.create({
    name: `Upload Test Product ${stamp}`,
    slug: `upload-test-product-${stamp}`,
    description: 'Disposable cleanup-test fixture',
    category: category._id,
    price: 189,
    stock: 70,
    reorderLevel: 5,
    status: 'inactive'
  });
  created.push(p2);

  // 3. A combo whose ONLY referenced product is one of the test products
  const combo = await Combo.create({
    name: `Regression Test Combo ${stamp}`,
    price: 200,
    description: 'Disposable cleanup-test combo fixture',
    items: [{ product: p1._id, quantity: 1 }],
    discount: 0,
    status: 'inactive'
  });
  created.push(combo);

  console.log(`\n✅ Created ${created.length} test fixtures:`);
  created.forEach((c) => {
    console.log(`  - ${c.constructor.modelName}: ${c._id} | "${c.name}"`);
  });
  console.log('  (use: node scripts/cleanupTestProducts.js plan / run to verify)');

  return { products: [p1, p2], combo };
}

module.exports = { createTestFixtures };