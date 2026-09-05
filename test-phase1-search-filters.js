/* ============================================================
   VENDHAN CRACKERS — PHASE 1: Advanced Search + Filters (API)
   Requires backend running on port 5000.
   Run: node test-phase1-search-filters.js
   Read-only — never creates/updates/deletes database data.
   ============================================================ */

const BASE = 'http://localhost:5000/api';

let pass = 0;
let fail = 0;

async function req(path) {
  const res = await fetch(BASE + path);
  let data = {};
  try { data = await res.json(); } catch (e) { /* empty */ }
  // Match the frontend api.js convention: unwrap the backend envelope
  // { success, message, data: ... } so callers work directly with the payload.
  return { status: res.status, data: (data && data.data !== undefined) ? data.data : data };
}

function check(name, cond) {
  if (cond) { pass++; console.log('✅ ' + name); }
  else { fail++; console.log('❌ ' + name); }
}

const qs = (params) => new URLSearchParams(params).toString();
const isNonDecreasing = (arr) => arr.every((v, i) => i === 0 || v >= arr[i - 1]);
const isNonIncreasing = (arr) => arr.every((v, i) => i === 0 || v <= arr[i - 1]);
const matchesSearch = (p, term) =>
  (p.name || '').toLowerCase().includes(term) || (p.description || '').toLowerCase().includes(term);

async function main() {
  console.log('========== PHASE 1 — SEARCH + FILTERS ==========\n');

  // Baseline: unfiltered catalog (server is the authority)
  const base = await req('/products?limit=50');
  check('GET /products?limit=50 returns 200', base.status === 200);
  check('Response shape { data.products[], data.pagination }',
    Array.isArray(base.data && base.data.products) && !!(base.data && base.data.pagination));
  check('Pagination exposes server total', typeof (base.data && base.data.pagination.total) === 'number');
  const allTotal = base.data.pagination.total;

  const cats = await req('/categories');
  check('GET /categories returns 200', cats.status === 200);
  check('Categories loaded from the API (not hard-coded)',
    Array.isArray(cats.data && cats.data.categories) && cats.data.categories.length > 0);
  const cat = cats.data.categories[0];

  // 1. Search by valid product name
  const s1 = await req('/products?' + qs({ search: 'Sparkler', limit: 12 }));
  check('Search "Sparkler" returns results', s1.status === 200 && s1.data.pagination.total > 0);
  check('Search results actually match the term',
    (s1.data.products || []).every(p => matchesSearch(p, 'sparkler')));

  // 2. Case-insensitive search
  const s2 = await req('/products?' + qs({ search: 'sPaRkLeR', limit: 12 }));
  check('Case-insensitive search returns the same count',
    s2.status === 200 && s2.data.pagination.total === s1.data.pagination.total);

  // 3. Search ignores leading/trailing spaces
  const s3 = await req('/products?' + qs({ search: '  Sparkler  ', limit: 12 }));
  check('Search ignores surrounding spaces',
    s3.status === 200 && s3.data.pagination.total === s1.data.pagination.total);

  // 4. Category filter (single category, from the API)
  const catId = cat.id || cat._id;
  const c1 = await req('/products?' + qs({ category: catId, limit: 50 }));
  check('Category filter returns only products of that category',
    c1.status === 200 && c1.data.pagination.total > 0 &&
    (c1.data.products || []).every(p => (p.category && (p.category.id || p.category._id)) === catId));

  // 5. Price minimum filter (never mutates prices — only filters)
  const pMin = await req('/products?' + qs({ minPrice: 500, limit: 50 }));
  check('minPrice filter keeps only price >= 500',
    pMin.status === 200 && (pMin.data.products || []).every(p => Number(p.price) >= 500));

  // 6. Price maximum filter
  const pMax = await req('/products?' + qs({ maxPrice: 50, limit: 50 }));
  check('maxPrice filter keeps only price <= 50',
    pMax.status === 200 && (pMax.data.products || []).every(p => Number(p.price) <= 50));

  // 7. Availability filter (uses existing stock field — nothing invented)
  const aIn = await req('/products?' + qs({ availability: 'in_stock', limit: 1 }));
  check('availability=in_stock accepted', aIn.status === 200);
  const aOut = await req('/products?' + qs({ availability: 'out_of_stock', limit: 1 }));
  check('availability=out_of_stock accepted (0 results is valid)', aOut.status === 200);
  check('Stock info comes from the real model (stock + stockStatus exposed)',
    (base.data.products || []).every(p => typeof p.stock === 'number' || typeof p.stockStatus === 'string'));

  // 8. Discount filter (discounted = stored discount > 0)
  const dDisc = await req('/products?' + qs({ discount: 'discounted', limit: 50 }));
  check('discount=discounted accepted and returns results',
    dDisc.status === 200 && dDisc.data.pagination.total > 0);
  check('discounted filters to discount > 0',
    (dDisc.data.products || []).every(p => Number(p.discount) > 0 || Number(p.discountPercent) > 0));
  const dNum = await req('/products?' + qs({ discount: 80, limit: 1 }));
  check('Numeric discount (>= 80) still works — backwards compatible', dNum.status === 200);

  // 9-13. Sorting
  const o1 = await req('/products?' + qs({ sort: 'price_asc', limit: 50 }));
  check('sort=price_asc returns non-decreasing prices',
    o1.status === 200 && isNonDecreasing((o1.data.products || []).map(p => Number(p.price))));
  const o2 = await req('/products?' + qs({ sort: 'price_desc', limit: 50 }));
  check('sort=price_desc returns non-increasing prices',
    o2.status === 200 && isNonIncreasing((o2.data.products || []).map(p => Number(p.price))));
  const o3 = await req('/products?' + qs({ sort: 'name_asc', limit: 50 }));
  check('sort=name_asc returns A→Z names',
    o3.status === 200 && !o3.data.products.some((p, i) => i && p.name < o3.data.products[i - 1].name));
  const o4 = await req('/products?' + qs({ sort: 'name_desc', limit: 50 }));
  check('sort=name_desc returns Z→A names (PHASE 1 addition)',
    o4.status === 200 && !o4.data.products.some((p, i) => i && p.name > o4.data.products[i - 1].name));
  const o5 = await req('/products?' + qs({ sort: 'newest', limit: 50 }));
  check('sort=newest returns newest first',
    o5.status === 200 && !o5.data.products.some((p, i) => i && new Date(p.createdAt) > new Date(o5.data.products[i - 1].createdAt)));

  // 14. Search + category combination
  const combo1 = await req('/products?' + qs({ search: 'flower', category: catId, limit: 50 }));
  check('Search + category combination accepted', combo1.status === 200);
  check('Search + category results satisfy BOTH conditions',
    (combo1.data.products || []).every(p => {
      const catMatch = (p.category && (p.category.id || p.category._id)) === catId;
      return matchesSearch(p, 'flower') && catMatch;
    }));

  // 15. Search + price combination
  const combo2 = await req('/products?' + qs({ search: 'bomb', minPrice: 100, maxPrice: 2000, limit: 50 }));
  check('Search + price combination accepted', combo2.status === 200);
  check('Search + price results satisfy BOTH conditions',
    (combo2.data.products || []).every(p =>
      matchesSearch(p, 'bomb') && Number(p.price) >= 100 && Number(p.price) <= 2000));

  // 16. Category + price + availability combination
  const combo3 = await req('/products?' + qs({
    category: catId, minPrice: 0, maxPrice: 100000, availability: 'in_stock', limit: 50
  }));
  check('Category + price + availability combination accepted', combo3.status === 200);
  check('Category + price + availability ALL applied',
    (combo3.data.products || []).every(p => {
      const catMatch = (p.category && (p.category.id || p.category._id)) === catId;
      const priceMatch = Number(p.price) >= 0 && Number(p.price) <= 100000;
      return catMatch && priceMatch && Number(p.stock) > 0 && p.stockStatus !== 'out_of_stock';
    }));

  // 17. All filters together
  const comboAll = await req('/products?' + qs({
    search: 'crackers', category: catId, minPrice: 1, maxPrice: 100000,
    availability: 'in_stock', discount: 'discounted', sort: 'price_asc', page: 1, limit: 50
  }));
  check('ALL filters accepted together', comboAll.status === 200);

  // 18. Clear filters (frontend) — verify an unfiltered request restores the baseline
  const clean = await req('/products?' + qs({ page: 1, limit: 1 }));
  check('Unfiltered request returns the full catalog total (clear-filters baseline)',
    clean.data.pagination.total === allTotal);

  // 19. No-result state — a miss is NOT a server error
  const miss = await req('/products?' + qs({ search: 'zzzz-there-is-no-such-product-42', limit: 12 }));
  check('No-result search returns 200 (not an error)', miss.status === 200);
  check('No-result search returns empty products + total 0',
    miss.data.products.length === 0 && miss.data.pagination.total === 0);

  // 20. Pagination works after filtering
  const pg1 = await req('/products?' + qs({ search: 'sparkler', page: 1, limit: 9 }));
  const pg2 = await req('/products?' + qs({ search: 'sparkler', page: 2, limit: 9 }));
  check('Filtered pagination page 1 accepted', pg1.status === 200);
  check('Filtered pagination page 2 accepted', pg2.status === 200);
  check('Pagination total is consistent across pages of a filtered query',
    pg1.data.pagination.total === pg2.data.pagination.total);
  const ids1 = (pg1.data.products || []).map(p => p.id || p._id).join(',');
  const ids2 = (pg2.data.products || []).map(p => p.id || p._id).join(',');
  check('Different pages return different product sets',
    pg1.data.pagination.total > 9 ? ids1 !== ids2 : true);

  // 21. Invalid query parameters handled safely (400, clean message — never 500)
  check('Invalid sort rejected with 400', (await req('/products?sort=hack')).status === 400);
  check('Negative minPrice rejected with 400', (await req('/products?minPrice=-5')).status === 400);
  check('Malformed category rejected with 400', (await req('/products?category=not-a-mongo-id')).status === 400);
  check('Invalid availability rejected with 400', (await req('/products?availability=banana')).status === 400);
  check('Discount out of range rejected with 400', (await req('/products?discount=999')).status === 400);
  const clamped = await req('/products?page=-1&limit=99999');
  check('Negative page / huge limit clamped safely (200, not 500)', clamped.status === 200);

  // 22. Existing API behaviour remains compatible
  const compat = await req('/products?limit=3');
  check('GET /products?limit=3 still returns exactly 3 items', compat.data.products.length === 3);
  check('Products still expose price/finalPrice/originalPrice',
    (compat.data.products || []).every(p => 'price' in p && 'finalPrice' in p && 'originalPrice' in p));
  check('Filtering never alters the displayed price (price === finalPrice)',
    (compat.data.products || []).every(p => Number(p.price) === Number(p.finalPrice)));

  console.log(`\n========== RESULT: ${pass} passed, ${fail} failed ==========`);
  process.exitCode = fail ? 1 : 0;
}

main().catch(err => { console.error('Test script error:', err); process.exit(1); });