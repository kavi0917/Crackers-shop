/* ============================================================
   VENDHAN CRACKERS — Page-Specific API Integration
   ============================================================ */

/* ---------- Local safe HTML escape fallback ---------- */
function localEscapeHTML(str) {
  if (str === undefined || str === null) return '';
  const AMP = String.fromCharCode(38);
  const LT = String.fromCharCode(60);
  const GT = String.fromCharCode(62);
  const QUOT = String.fromCharCode(34);
  const APOS = String.fromCharCode(39);
  const map = {
    [AMP]: AMP + 'amp;',
    [LT]: AMP + 'lt;',
    [GT]: AMP + 'gt;',
    [QUOT]: AMP + 'quot;',
    [APOS]: AMP + '#039;'
  };
  return String(str).replace(/[&<>"']/g, c => map[c]);
}
/* ---------- Homepage category card image mapping ----------
   The category records in the DB reference unrelated stock photos
   (buildings, books, banana, mountains, confetti...). The project ships
   curated, category-specific local assets under public/assets/. Prefer
   those so every homepage category card shows the correct fireworks type.
   Falls back to the DB imageUrl for any unmapped category. */
const HOME_CATEGORY_IMAGES = {
  'Fancy Flower pots': 'public/assets/Fancy Flower pots.png',
  'Flower Pots': 'public/assets/Flower Pots.png',
  'Gift Boxes': 'public/assets/Gift Boxes.png',
  'Ground Chakkars': 'public/assets/Ground Chakkaras.png',
  'Rockets': 'public/assets/Rockets.png',
  'Sparklers': 'public/assets/Sparklers.png'
};

/* ---------- Homepage featured categories (Shop by Category) ----------
   These are the SIX curated categories displayed on the Home page only.
   They are matched by DB name so their real IDs come from the Categories
   API (nothing hard-coded), and each card links to shop.html?category=<id>.
   The Shop page filter is NOT limited to this list — it loads every
   category from the database dynamically. */
const HOME_FEATURED_CATEGORY_NAMES = [
  'Fancy Flower pots',
  'Flower Pots',
  'Gift Boxes',
  'Ground Chakkars',
  'Rockets',
  'Sparklers'
];

/* ---------- Confirmation Modal (replaces confirm()) ---------- */
function showConfirm(message, onConfirm) {
  let overlay = document.getElementById('vc-confirm-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'vc-confirm-overlay';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:9999;display:flex;align-items:center;justify-content:center;';
    const box = document.createElement('div');
    box.style.cssText = 'background:#fff;border-radius:12px;padding:28px 32px;max-width:380px;width:90%;box-shadow:0 8px 32px rgba(0,0,0,0.18);';
    const msgEl = document.createElement('p');
    msgEl.id = 'vc-confirm-msg';
    msgEl.style.cssText = 'margin:0 0 20px;font-size:1rem;color:#1f2937;line-height:1.5;';
    const btnRow = document.createElement('div');
    btnRow.style.cssText = 'display:flex;gap:12px;justify-content:flex-end;';
    const cancelBtn = document.createElement('button');
    cancelBtn.id = 'vc-confirm-cancel';
    cancelBtn.className = 'btn btn-ghost';
    cancelBtn.textContent = 'Cancel';
    const okBtn = document.createElement('button');
    okBtn.id = 'vc-confirm-ok';
    okBtn.className = 'btn btn-danger';
    okBtn.textContent = 'Confirm';
    btnRow.appendChild(cancelBtn);
    btnRow.appendChild(okBtn);
    box.appendChild(msgEl);
    box.appendChild(btnRow);
    overlay.appendChild(box);
    document.body.appendChild(overlay);
  }
  document.getElementById('vc-confirm-msg').textContent = message;
  overlay.style.display = 'flex';
  const ok = document.getElementById('vc-confirm-ok');
  const cancel = document.getElementById('vc-confirm-cancel');
  const close = () => { overlay.style.display = 'none'; };
  const newOk = ok.cloneNode(true);
  const newCancel = cancel.cloneNode(true);
  ok.parentNode.replaceChild(newOk, ok);
  cancel.parentNode.replaceChild(newCancel, cancel);
  newOk.addEventListener('click', () => { close(); onConfirm(); });
  newCancel.addEventListener('click', close);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
}

/* ---------- Safe error message for user display ---------- */
function safeError(err) {
  if (!err) return 'Something went wrong. Please try again.';
  let msg = (err && err.message) ? String(err.message) : String(err);
  // Strip common backend/internal prefixes and map to user-friendly text
  const clean = msg
    .replace(/^MongoServerError:\s*/i, '')
    .replace(/^MongoError:\s*/i, '')
    .replace(/^ValidationError:\s*/i, '')
    .replace(/^CastError:\s*/i, '')
    .replace(/^Error:\s*/i, '')
    .replace(/^TypeError:\s*/i, '')
    .replace(/^ReferenceError:\s*/i, '')
    .replace(/^JsonWebTokenError:\s*/i, '')
    .replace(/^TokenExpiredError:\s*/i, '')
    .replace(/^UnauthorizedError:\s*/i, '')
    .replace(/^ForbiddenError:\s*/i, '')
    .replace(/^NotFoundError:\s*/i, '')
    .replace(/^ConflictError:\s*/i, '')
    .replace(/^UnprocessableEntityError:\s*/i, '')
    .replace(/^RateLimitError:\s*/i, '')
    .replace(/^InternalServerError:\s*/i, '')
    .replace(/^AxiosError:\s*/i, '')
    .replace(/^FetchError:\s*/i, '')
    .replace(/^NetworkError:\s*/i, '')
    .replace(/^Failed to fetch/i, 'Network error. Please check your connection and try again.')
    .replace(/^Network request failed/i, 'Network error. Please check your connection and try again.')
    .replace(/^Load failed/i, 'Network error. Please check your connection and try again.')
    .replace(/^Cannot read properties of undefined/i, 'Something went wrong. Please try again.')
    .replace(/^Unexpected token/i, 'Something went wrong. Please try again.')
    .replace(/^E11000 duplicate key error/i, 'This record already exists.')
    .replace(/^duplicate key error/i, 'This record already exists.')
    .replace(/^Path `([^`]+)` is required\./i, 'Please fill in all required fields.')
    .replace(/^Invalid ObjectId/i, 'The requested item was not found.')
    .replace(/^jwt expired/i, 'Your session has expired. Please login again.')
    .replace(/^jwt malformed/i, 'Your session is invalid. Please login again.')
    .replace(/^invalid signature/i, 'Your session is invalid. Please login again.')
    .replace(/^No token provided/i, 'Please login to continue.')
    .replace(/^Email already registered/i, 'This email is already registered.')
    .replace(/^Phone already registered/i, 'This phone number is already registered.')
    .replace(/^User already exists/i, 'This account already exists.')
    .replace(/^Invalid credentials/i, 'Invalid email/phone or password.')
    .replace(/^Incorrect password/i, 'Invalid email/phone or password.')
    .replace(/^Insufficient stock/i, 'Sorry, this item is out of stock.')
    .replace(/^Stock insufficient/i, 'Sorry, this item is out of stock.')
    .replace(/^Review already exists/i, 'You have already reviewed this product.')
    .replace(/^Cannot cancel order/i, 'This order cannot be cancelled at this stage.')
    .replace(/^Order already cancelled/i, 'This order has already been cancelled.')
    .replace(/^Cart is empty/i, 'Your cart is empty.')
    .replace(/^No products/i, 'No products found.')
    .replace(/^No orders/i, 'No orders found.')
    .replace(/^No customers/i, 'No customers found.')
    .replace(/^No reviews/i, 'No reviews found.')
    .replace(/^No messages/i, 'No messages found.')
    .replace(/^No combos/i, 'No combos found.')
    .replace(/^No categories/i, 'No categories found.')
    .replace(/^No inventory/i, 'No inventory found.')
    .replace(/^No sales/i, 'No sales data found.')
    .replace(/^Product not found/i, 'Product not found.')
    .replace(/^Category not found/i, 'Category not found.')
    .replace(/^Order not found/i, 'Order not found.')
    .replace(/^Combo not found/i, 'Combo not found.')
    .replace(/^Review not found/i, 'Review not found.')
    .replace(/^Customer not found/i, 'Customer not found.')
    .replace(/^Settings not found/i, 'Settings not found.')
    .replace(/^Contact message not found/i, 'Message not found.')
    .replace(/^Cart not found/i, 'Your cart could not be found.')
    .replace(/^Cart item not found/i, 'This item is no longer in your cart.')
    .replace(/^Product is out of stock/i, 'Sorry, this product is out of stock.')
    .replace(/^Product is inactive/i, 'Sorry, this product is currently unavailable.')
    .replace(/^Category has products/i, 'This category has products and cannot be deleted.')
    .replace(/^Cannot delete/i, 'This item cannot be deleted.')
    .replace(/^Invalid pincode/i, 'Please enter a valid 6-digit pincode.')
    .replace(/^Invalid email/i, 'Please enter a valid email address.')
    .replace(/^Invalid phone/i, 'Please enter a valid phone number.')
    .replace(/^Invalid password/i, 'Password must meet the required format.')
    .replace(/^Password too short/i, 'Password must be at least 8 characters long.')
    .replace(/^Password must/i, 'Password must meet the required format.')
    .replace(/^Unauthorized/i, 'Your session has expired. Please login again.')
    .replace(/^Forbidden/i, 'You do not have permission to perform this action.')
    .replace(/^Not Found/i, 'The requested item was not found.')
    .replace(/^Conflict/i, 'This action conflicts with existing data.')
    .replace(/^Unprocessable Entity/i, 'Please check your input and try again.')
    .replace(/^Too Many Requests/i, 'Too many requests. Please wait a moment and try again.')
    .replace(/^Internal Server Error/i, 'Something went wrong on our end. Please try again later.')
    .replace(/^Service Unavailable/i, 'Our service is temporarily unavailable. Please try again later.')
    .replace(/^Bad Gateway/i, 'Our service is temporarily unavailable. Please try again later.')
    .replace(/^Gateway Timeout/i, 'The request timed out. Please try again.')
    .replace(/^Request Timeout/i, 'The request timed out. Please try again.')
    .replace(/^Validation failed/i, 'Please check your input and try again.')
    .replace(/^Validation error/i, 'Please check your input and try again.')
    .replace(/^Invalid status/i, 'Invalid status selected.')
    .replace(/^Access denied/i, 'You do not have permission to perform this action.')
    .replace(/^Admin access required/i, 'Please login as admin to continue.')
    .replace(/^Login required/i, 'Please login to continue.')
    .replace(/^Session expired/i, 'Your session has expired. Please login again.')
    .replace(/^Session invalid/i, 'Your session is invalid. Please login again.')
    .replace(/^Invalid operation/i, 'This operation is not allowed.')
    .replace(/^Operation not allowed/i, 'This operation is not allowed.')
    .replace(/^Action not allowed/i, 'This action is not allowed.')
    .replace(/^Not permitted/i, 'This action is not permitted.')
    .replace(/^Not authorized/i, 'You are not authorized to perform this action.')
    .replace(/^Not authenticated/i, 'Please login to continue.');
  return clean || 'Something went wrong. Please try again.';
}


/* ---------- Safe image src setter (breaks XSS taint chain) ---------- */
function safeSetImgSrc(imgEl, rawSrc) {
  var allowed = resolveImg(rawSrc || '');
  if (!allowed) return;
  var proto = allowed.substring(0, 8).toLowerCase();
  if (proto.indexOf('http') !== 0) return;
  imgEl.src = allowed;
}
/* ============ HOME PAGE ============ */
/* Format a whole number with Indian digit grouping (e.g. 125680 -> 1,25,680). */
function formatCount(n) {
  return Number(n || 0).toLocaleString('en-IN');
}

/* ---------- Service years (reusable anywhere the shop's service-years
   statistic is shown) ----------
   currentYear - trustedSinceYear ends at >= 1 (never negative/invalid).
   Returns null when the setting is missing/invalid so callers keep their
   static fallback text. */
function getServiceYears(trustedSinceYear) {
  const y = Number(trustedSinceYear);
  if (!Number.isFinite(y) || y < 1) return null;
  const years = new Date().getFullYear() - Math.floor(y);
  return years >= 1 ? years : 1;
}

/* Spelled-out decade phrase used by the About hero heading, computed from
   the dynamic service years (e.g. 41 -> "Four Decades", 26 -> "Two Decades"). */
const DECADE_WORDS = ['One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen', 'Twenty'];
function formatDecadePhrase(years) {
  const n = Math.max(1, Math.floor((Number(years) || 0) / 10));
  if (n <= DECADE_WORDS.length) return DECADE_WORDS[n - 1] + (n > 1 ? ' Decades' : ' Decade');
  return n + '+ Decades';
}

async function initHomePage() {
  const featuredGrid = document.querySelector('#featured-products-grid');
  const catGrid = document.querySelector('#categories-grid');
  const comboGrid = document.querySelector('#combos-grid');
  const reviewGrid = document.querySelector('#reviews-grid');
  const emptyState = (title, msg) => `
    <div class="empty-state" style="grid-column:1/-1; background:transparent; border:none;">
      <div class="empty-icon"><i class="fas fa-box-open"></i></div>
      <h3>${title}</h3>
      <p>${msg}</p>
    </div>`;

  try {
    const data = await PublicAPI.home();

    // Featured products
    if (featuredGrid) {
      if (data.featuredProducts && data.featuredProducts.length > 0) {
        renderProductCards(featuredGrid, data.featuredProducts);
      } else {
        featuredGrid.innerHTML = emptyState('No featured products yet', 'Check back soon for our latest collection.');
      }
    }

    // Categories
    if (catGrid) {
      catGrid.textContent = '';
      // Keep only the SIX curated homepage featured categories, in the
      // curated order. IDs come from the API (nothing hard-coded).
      const featuredList = (data.categories || [])
        .filter(c => c.name && HOME_FEATURED_CATEGORY_NAMES.includes(c.name))
        .sort((a, b) => HOME_FEATURED_CATEGORY_NAMES.indexOf(a.name) - HOME_FEATURED_CATEGORY_NAMES.indexOf(b.name));

      if (featuredList.length > 0) {
        featuredList.forEach(c => {
          const link = document.createElement('a');
          link.href = 'shop.html?category=' + encodeURIComponent(c.id || '');
          link.className = 'cat-card';
          const bg = document.createElement('div');
          bg.className = 'cat-bg';
          const localAsset = c.name && HOME_CATEGORY_IMAGES[c.name];
          if (localAsset) {
            bg.style.backgroundImage = 'url(\'' + localAsset.replace(/ /g, '%20') + '\')';
          } else if (c.imageUrl) {
            bg.style.backgroundImage = 'url(\'' + resolveImg(c.imageUrl) + '\')';
          }
          const content = document.createElement('div');
          content.className = 'cat-content';
          const h3 = document.createElement('h3');
          h3.textContent = c.name || '';
          const span = document.createElement('span');
          span.className = 'cat-link';
          span.textContent = 'Explore ';
          const icon = document.createElement('i');
          icon.className = 'fas fa-arrow-right';
          span.appendChild(icon);
          content.appendChild(h3);
          content.appendChild(span);
          link.appendChild(bg);
          link.appendChild(content);
          catGrid.appendChild(link);
        });
      } else {
        catGrid.innerHTML = emptyState('No categories yet', 'Categories will appear here once added.');
      }
    }

    // Combos
    if (comboGrid) {
      comboGrid.textContent = '';
      if (data.combos && data.combos.length > 0) {
        const comboIcons = ['🎆', '🎇', '🌠'];
        data.combos.forEach((combo, i) => {
          const card = document.createElement('div');
          card.className = 'combo-card' + (combo.tag ? ' featured' : '');
          if (combo.tag) {
            const tagSpan = document.createElement('span');
            tagSpan.className = 'combo-tag';
            tagSpan.textContent = combo.tag;
            card.appendChild(tagSpan);
          }
          const iconDiv = document.createElement('div');
          iconDiv.className = 'combo-icon';
          // Use the stored Combo image when available; otherwise fall back to
          // the existing emoji icon (never a broken image).
          const comboImgSrc = combo.image ? (typeof resolveImg === 'function' ? resolveImg(combo.image) : combo.image) : '';
          if (comboImgSrc) {
            const img = document.createElement('img');
            img.src = comboImgSrc;
            img.alt = combo.name || 'Combo';
            img.loading = 'lazy';
            iconDiv.appendChild(img);
          } else {
            iconDiv.textContent = comboIcons[i] || '🎆';
          }
          card.appendChild(iconDiv);
          const h3 = document.createElement('h3');
          h3.textContent = combo.name || '';
          card.appendChild(h3);
          const priceDiv = document.createElement('div');
          priceDiv.className = 'combo-price';
          priceDiv.textContent = formatINR(combo.price);
          card.appendChild(priceDiv);
          const ul = document.createElement('ul');
          (combo.items || []).slice(0, 4).forEach(item => {
            const li = document.createElement('li');
            const checkIcon = document.createElement('i');
            checkIcon.className = 'fas fa-check';
            li.appendChild(checkIcon);
            li.appendChild(document.createTextNode(' ' + (item.quantity || 1) + ' × ' + (item.name || '')));
            ul.appendChild(li);
          });
          card.appendChild(ul);
          const addBtn = document.createElement('button');
          addBtn.className = 'btn btn-primary btn-block';
          addBtn.dataset.comboAdd = combo.id || '';
          const fireIcon = document.createElement('i');
          fireIcon.className = 'fas fa-fire';
          addBtn.appendChild(fireIcon);
          addBtn.appendChild(document.createTextNode(' Build My Combo'));
          card.appendChild(addBtn);
          comboGrid.appendChild(card);
        });

        // Combo "Build My Combo" handlers (only bind once). Opens the
        // customization modal instead of directly adding to cart.
        comboGrid.querySelectorAll('[data-combo-add]').forEach(btn => {
          if (btn.dataset.bound) return;
          btn.dataset.bound = '1';
          btn.addEventListener('click', () => {
            if (btn.disabled) return;
            if (!isLoggedIn()) {
              showToast('Login required', 'Please login to build a festival combo.', 'warning');
              window.location.href = 'login.html?redirect=index.html';
              return;
            }
            openComboCustomizer(btn.dataset.comboAdd);
          });
        });
      } else {
        comboGrid.innerHTML = emptyState('No combos yet', 'Festival combos will appear here soon.');
      }
    }

    // Reviews
    if (reviewGrid) {
      reviewGrid.textContent = '';
      if (data.testimonials && data.testimonials.length > 0) {
        data.testimonials.forEach(t => {
          const initials = (t.full_name || 'A').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
          const stars = '★'.repeat(Math.min(Math.max(t.rating || 0, 1), 5)) + '☆'.repeat(5 - Math.min(Math.max(t.rating || 0, 1), 5));
          const card = document.createElement('div');
          card.className = 'review-card';
          const starsDiv = document.createElement('div');
          starsDiv.className = 'review-stars';
          starsDiv.textContent = stars;
          const textP = document.createElement('p');
          textP.className = 'review-text';
          textP.textContent = '"' + (t.reviewText || '') + '"';
          const authorDiv = document.createElement('div');
          authorDiv.className = 'review-author';
          const avatarDiv = document.createElement('div');
          avatarDiv.className = 'avatar';
          avatarDiv.textContent = initials;
          const infoDiv = document.createElement('div');
          const nameB = document.createElement('b');
          nameB.textContent = t.full_name || 'Anonymous';
          const verifiedSpan = document.createElement('span');
          verifiedSpan.textContent = 'Verified Customer';
          infoDiv.appendChild(nameB);
          infoDiv.appendChild(verifiedSpan);
          authorDiv.appendChild(avatarDiv);
          authorDiv.appendChild(infoDiv);
          card.appendChild(starsDiv);
          card.appendChild(textP);
          card.appendChild(authorDiv);
          reviewGrid.appendChild(card);
        });
      } else {
        reviewGrid.innerHTML = emptyState('No reviews yet', 'Customer reviews will appear here.');
      }
    }

    // Trusted Since Year — from Admin Settings
    if (data.settings && data.settings.trustedSinceYear != null) {
      const year = data.settings.trustedSinceYear;
      const heroYearEl = document.querySelector('[data-trusted-year]');
      if (heroYearEl) heroYearEl.textContent = year;
      const cardYearEl = document.querySelector('[data-trusted-year-card]');
      if (cardYearEl) cardYearEl.textContent = year;
    }

    // Customer Count — from Admin Settings (single source for Hero + Trusted Service)
    if (data.settings && data.settings.customerCount != null) {
      const customerCount = data.settings.customerCount;
      const heroCustomersEl = document.querySelector('[data-hero-customers]');
      if (heroCustomersEl) heroCustomersEl.textContent = formatCount(customerCount) + '+';
      const trustedCustomersEl = document.querySelector('[data-trusted-customers]');
      if (trustedCustomersEl) trustedCustomersEl.textContent = formatCount(customerCount) + '+';
    }

    // Affordable Prices — lowest active Combo price (from actual combo data)
    const priceCombos = (data.combos || []).filter(c => c.price != null);
    if (priceCombos.length > 0) {
      const minPrice = Math.min.apply(null, priceCombos.map(c => Number(c.price) || 0));
      const startEl = document.querySelector('[data-starting-price]');
      if (startEl) startEl.textContent = formatINR(minPrice);
    }

    // Hero stats
    if (data.stats) {
      const statEls = document.querySelectorAll('.hero-stats .stat b');
      if (statEls.length >= 3) {
        // Years of service = current year - trustedSinceYear (from Admin Settings)
        const heroTrustedYear = data.settings && data.settings.trustedSinceYear != null ? data.settings.trustedSinceYear : null;
        const heroYears = getServiceYears(heroTrustedYear);
        if (heroYears != null) statEls[0].textContent = heroYears + '+';
        statEls[1].textContent = (data.stats.total_products || 0) + '+';
        // Customers value comes from Admin Settings (applied above); fall back to the
        // real customer count only if the setting is unavailable.
        if (!data.settings || data.settings.customerCount == null) {
          const customers = data.stats.total_customers || 0;
          statEls[2].textContent = customers >= 1000 ? (customers / 1000).toFixed(1) + 'K+' : customers + '+';
        }
      }
    }
  } catch (e) {
    console.error('Home load error:', e.message);
    const sections = [featuredGrid, catGrid, comboGrid, reviewGrid];
    const retryHtml = (title, msg) => `
      <div class="empty-state" style="grid-column:1/-1; background:transparent; border:none;">
        <div class="empty-icon"><i class="fas fa-exclamation-triangle"></i></div>
        <h3>${title}</h3>
        <p>${msg}</p>
        <button type="button" class="btn btn-primary" data-home-retry><i class="fas fa-redo"></i> Try Again</button>
      </div>`;
    sections.forEach(el => {
      if (el) el.innerHTML = retryHtml('Failed to load', 'Unable to load. Please try again.');
    });
    // Retry re-runs the whole home data load (single button per section).
    document.querySelectorAll('[data-home-retry]').forEach(btn => {
      btn.addEventListener('click', () => initHomePage());
    });
  }
}
/* ============ BUILD MY FESTIVAL COMBO - CUSTOMIZATION ============ */
/* Customer may change PRODUCT SELECTION ONLY. Combo name, price, slot count and
   per-slot quantities are always admin-controlled and shown read-only. */
let comboCustomizeCtx = null;

function openComboCustomizer(comboId) {
  const modal = document.getElementById('combo-customize-modal');
  if (!modal || !comboId) return;
  const body = modal.querySelector('#combo-customize-body');
  const title = modal.querySelector('#combo-customize-title');
  const addBtn = modal.querySelector('#combo-customize-add');
  comboCustomizeCtx = null;
  addBtn.style.display = 'none';
  title.textContent = 'Build Your Combo';
  body.textContent = '';
  const spinner = document.createElement('div');
  spinner.className = 'empty-state';
  spinner.style.cssText = 'background:transparent; border:none;';
  spinner.innerHTML = '<div class="empty-icon"><i class="fas fa-spinner fa-spin"></i></div><h3>Loading combo...</h3>';
  body.appendChild(spinner);
  modal.classList.add('open');
  modal.setAttribute('aria-hidden', 'false');
  let combo;
  PublicAPI.combo(comboId)
    .then((c) => {
      combo = c && c.combo ? c.combo : c;
      comboCustomizeCtx = { comboId, combo, comboItems: combo.items || [], products: [] };
      // Fail-soft: if the product catalog can't be loaded, still render the
      // combo slots (defaults shown as unavailable) rather than a false error.
      return PublicAPI.products({ limit: 100 }).catch(() => ({ products: [] }));
    })
    .then((data) => {
      if (!comboCustomizeCtx) return;
      comboCustomizeCtx.products = (data.products || []);
      renderComboCustomizer(modal);
    })
    .catch(() => { showUnavailableCombo(modal); });
}

function showUnavailableCombo(modal) {
  if (!modal) return;
  const body = modal.querySelector('#combo-customize-body');
  const title = modal.querySelector('#combo-customize-title');
  const addBtn = modal.querySelector('#combo-customize-add');
  title.textContent = 'Combo currently not available';
  body.textContent = '';
  const msg = document.createElement('div');
  msg.className = 'empty-state';
  msg.style.cssText = 'grid-template-columns:1fr; text-align:center;';
  const icon = document.createElement('div');
  icon.className = 'empty-icon';
  icon.innerHTML = '<i class="fas fa-ban"></i>';
  const h = document.createElement('h3');
  h.textContent = 'Combo currently not available.';
  const p = document.createElement('p');
  p.textContent = 'Please choose another combo.';
  msg.appendChild(icon); msg.appendChild(h); msg.appendChild(p);
  body.appendChild(msg);
  addBtn.style.display = 'none';
}

function renderComboCustomizer(modal) {
  const ctx = comboCustomizeCtx;
  if (!ctx) return;
  const body = modal.querySelector('#combo-customize-body');
  const title = modal.querySelector('#combo-customize-title');
  const addBtn = modal.querySelector('#combo-customize-add');
  const combo = ctx.combo;
  const items = ctx.comboItems || [];

  if (items.length === 0) {
    body.textContent = '';
    const msg = document.createElement('div');
    msg.className = 'empty-state';
    msg.innerHTML = '<div class="empty-icon"><i class="fas fa-box-open"></i></div><h3>This combo has no products yet.</h3>';
    body.appendChild(msg);
    addBtn.style.display = 'none';
    return;
  }

  title.textContent = combo.name || 'Build Your Combo';
  body.textContent = '';

  const header = document.createElement('div');
  header.style.cssText = 'margin-bottom:14px;';
  const priceP = document.createElement('p');
  priceP.className = 'combo-price';
  priceP.style.cssText = 'margin:0 0 4px; font-size:1.4rem;';
  priceP.textContent = formatINR(combo.price);
  const note = document.createElement('p');
  note.style.cssText = 'font-size:0.8rem; color:var(--text-muted); margin:0; line-height:1.4;';
  note.textContent = 'Choose your products. Combo price and slot quantities are fixed — you can only change which product is in each slot.';
  header.appendChild(priceP);
  header.appendChild(note);
  body.appendChild(header);

  items.forEach((slot, i) => {
    const row = document.createElement('div');
    row.className = 'combo-slot-row';
    const labelWrap = document.createElement('div');
    labelWrap.className = 'combo-slot-label';
    const label = document.createElement('b');
    label.textContent = 'Slot ' + (i + 1);
    const qty = document.createElement('span');
    qty.className = 'combo-slot-qty';
    qty.textContent = 'Qty: ' + (slot.quantity || 1);
    labelWrap.appendChild(label);
    labelWrap.appendChild(qty);
    const select = buildComboProductSelect(slot, ctx.products);
    row.appendChild(labelWrap);
    row.appendChild(select);
    body.appendChild(row);
  });

  const anySelectable = Array.from(body.querySelectorAll('select[data-combo-slot]'))
    .some((s) => s.options.length > 0);
  if (!anySelectable) {
    body.textContent = '';
    const msg = document.createElement('div');
    msg.className = 'empty-state';
    msg.innerHTML = '<div class="empty-icon"><i class="fas fa-box-open"></i></div><h3>No products available to customize this combo.</h3>';
    body.appendChild(msg);
    addBtn.style.display = 'none';
    return;
  }

  addBtn.style.display = '';
  addBtn.onclick = () => submitCustomCombo(modal);
}

function buildComboProductSelect(slot, products) {
  const select = document.createElement('select');
  select.className = 'form-control';
  select.dataset.comboSlot = '1';
  const defaultId = slot.productId || slot.product || '';
  let defaultSet = false;
  (products || []).forEach((p) => {
    const id = p.id || p._id;
    if (!id) return;
    const active = p.status ? p.status === 'active' : true;
    if (!active) return; // inactive products are never offered
    const opt = document.createElement('option');
    opt.value = String(id);
    opt.textContent = (p.name || 'Product') + (Number(p.stock) === 0 ? ' (Out of stock)' : '');
    if (defaultId && String(defaultId) === String(id)) {
      opt.selected = true;
      defaultSet = true;
    }
    if (Number(p.stock) === 0) opt.disabled = true; // out-of-stock not selectable
    select.appendChild(opt);
  });
  if (defaultId && !defaultSet) {
    const opt = document.createElement('option');
    opt.value = String(defaultId);
    opt.textContent = 'Default product (currently unavailable)';
    opt.disabled = true;
    select.insertBefore(opt, select.firstChild);
  }
  return select;
}

async function submitCustomCombo(modal) {
  const ctx = comboCustomizeCtx;
  if (!ctx) return;
  const addBtn = modal.querySelector('#combo-customize-add');
  const selects = Array.from(modal.querySelectorAll('select[data-combo-slot]'));
  const selectedIds = selects.map((s) => s.value);
  if (selectedIds.some((id) => !id)) {
    showToast('Incomplete', 'Please choose a product for every slot.', 'warning');
    return;
  }
  addBtn.disabled = true;
  addBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Adding...';
  try {
    await CustomerAPI.addComboToCart(ctx.comboId, selectedIds);
    showToast('Combo added!', 'Your custom festival combo has been added to your cart.');
    if (typeof syncCartCount === 'function') syncCartCount();
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
  } catch (e) {
    showToast('Error', safeError(e), 'error');
  } finally {
    addBtn.disabled = false;
    addBtn.innerHTML = '<i class="fas fa-cart-plus"></i> Add to Cart';
  }
}

/* ============ SHOP PAGE ============ */
async function initShopPage() {
  const grid = document.querySelector('.product-grid');
  const pagination = document.querySelector('.pagination');
  const searchInput = document.querySelector('.search-box input');
  const sortSelect = document.querySelector('.select');
  const filterPanel = document.querySelector('.filter-panel');

  if (!grid) return;

  let currentPage = 1;

  // ---- Build API params from current filter state ----
  function buildParams() {
    const params = { page: currentPage, limit: 9 };

    // Search
    const q = searchInput ? searchInput.value.trim() : '';
    if (q) params.search = q;

    // Sort
    if (sortSelect) {
      const sortMap = {
        'Price: Low to High': 'price_asc',
        'Price: High to Low': 'price_desc',
        'Rating: Highest First': 'rating_desc',
        'Newest Arrivals': 'newest'
      };
      if (sortMap[sortSelect.value]) params.sort = sortMap[sortSelect.value];
    }

    if (!filterPanel) return params;

    // Category — single-select dropdown; empty value means "All Categories"
    const catSelect = document.getElementById('category-select');
    if (catSelect && catSelect.value) {
      params.category = catSelect.value;
    }

    // Price — min/max number inputs
    const minInput = document.getElementById('price-min');
    const maxInput = document.getElementById('price-max');
    const minVal = minInput ? parseFloat(minInput.value) : NaN;
    const maxVal = maxInput ? parseFloat(maxInput.value) : NaN;
    if (!isNaN(minVal) && minVal >= 0) params.minPrice = minVal;
    if (!isNaN(maxVal) && maxVal >= 0) params.maxPrice = maxVal;

    // Availability
    const checkedAvail = filterPanel.querySelector('input[name="avail"]:checked');
    if (checkedAvail && checkedAvail.value && checkedAvail.value !== 'all') {
      params.availability = checkedAvail.value;
    }

    // Discount — single-select radio
    const checkedDiscount = filterPanel.querySelector('input[name="discount"]:checked');
    if (checkedDiscount && checkedDiscount.value) {
      params.discount = checkedDiscount.value;
    }

    return params;
  }

  // ---- Central filter + render pipeline ----
  async function applyShopFilters() {
    try {
      grid.textContent = '';
      const spinner = document.createElement('div');
      spinner.className = 'empty-state';
      spinner.style.cssText = 'grid-column:1/-1;';
      spinner.innerHTML = '<div class="empty-icon"><i class="fas fa-spinner fa-spin"></i></div><h3>Loading products...</h3>';
      grid.appendChild(spinner);

      const data = await PublicAPI.products(buildParams());

      grid.textContent = '';
      if (!data.products || data.products.length === 0) {
        const empty = document.createElement('div');
        empty.className = 'empty-state';
        empty.style.cssText = 'grid-column:1/-1;';
        const icon = document.createElement('div');
        icon.className = 'empty-icon';
        const i = document.createElement('i');
        i.className = 'fas fa-search';
        icon.appendChild(i);
        const h3 = document.createElement('h3');
        h3.textContent = 'No products found';
        const p = document.createElement('p');
        p.textContent = 'Try adjusting your filters or search terms.';
        empty.appendChild(icon);
        empty.appendChild(h3);
        empty.appendChild(p);
        grid.appendChild(empty);
      } else {
        renderProductCards(grid, data.products);
      }

      // Pagination
      if (pagination) {
        const totalPages = (data.pagination && data.pagination.totalPages) || 1;
        pagination.textContent = '';

        const prevBtn = document.createElement('button');
        prevBtn.className = 'page-btn';
        prevBtn.dataset.page = String(currentPage - 1);
        if (currentPage <= 1) prevBtn.disabled = true;
        const prevIcon = document.createElement('i');
        prevIcon.className = 'fas fa-chevron-left';
        prevBtn.appendChild(prevIcon);
        pagination.appendChild(prevBtn);

        for (let i = 1; i <= totalPages; i++) {
          if (i === 1 || i === totalPages || Math.abs(i - currentPage) <= 1) {
            const btn = document.createElement('button');
            btn.className = 'page-btn' + (i === currentPage ? ' active' : '');
            btn.dataset.page = String(i);
            btn.textContent = String(i);
            pagination.appendChild(btn);
          } else if (Math.abs(i - currentPage) === 2) {
            const ellipsis = document.createElement('button');
            ellipsis.className = 'page-btn';
            ellipsis.disabled = true;
            ellipsis.textContent = '...';
            pagination.appendChild(ellipsis);
          }
        }

        const nextBtn = document.createElement('button');
        nextBtn.className = 'page-btn';
        nextBtn.dataset.page = String(currentPage + 1);
        if (currentPage >= totalPages) nextBtn.disabled = true;
        const nextIcon = document.createElement('i');
        nextIcon.className = 'fas fa-chevron-right';
        nextBtn.appendChild(nextIcon);
        pagination.appendChild(nextBtn);

        pagination.querySelectorAll('[data-page]').forEach(btn => {
          btn.addEventListener('click', () => {
            const page = parseInt(btn.dataset.page);
            if (!isNaN(page) && page >= 1 && page <= totalPages) {
              currentPage = page;
              applyShopFilters();
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }
          });
        });
      }
    } catch (e) {
      grid.textContent = '';
      const errDiv = document.createElement('div');
      errDiv.className = 'empty-state';
      errDiv.style.cssText = 'grid-column:1/-1;';
      const icon = document.createElement('div');
      icon.className = 'empty-icon';
      const i = document.createElement('i');
      i.className = 'fas fa-exclamation-triangle';
      icon.appendChild(i);
      const h3 = document.createElement('h3');
      h3.textContent = 'Failed to load products';
      const p = document.createElement('p');
      p.textContent = safeError(e);
      const retryBtn = document.createElement('button');
      retryBtn.className = 'btn btn-primary';
      retryBtn.addEventListener('click', () => location.reload());
      const retryIcon = document.createElement('i');
      retryIcon.className = 'fas fa-redo';
      retryBtn.appendChild(retryIcon);
      retryBtn.appendChild(document.createTextNode(' Try Again'));
      errDiv.appendChild(icon);
      errDiv.appendChild(h3);
      errDiv.appendChild(p);
      errDiv.appendChild(retryBtn);
      grid.appendChild(errDiv);
    }
  }

  // ---- Load all categories dynamically into the single category dropdown ----
  const catSelect = document.getElementById('category-select');
  if (catSelect) {
    try {
      const catData = await PublicAPI.categories();
      const cats = catData.categories || [];

      // "All Categories" option already exists; append EVERY category from the DB
      // (the Shop dropdown is NOT limited to the Home page's 6 featured categories).
      cats.forEach(cat => {
        const catId = cat.id || cat._id || '';
        const opt = document.createElement('option');
        opt.value = catId;
        opt.textContent = cat.name || '';
        catSelect.appendChild(opt);
      });

      // shop.html?category=<id> selects the matching category automatically
      const urlParams = new URLSearchParams(window.location.search);
      const urlCat = urlParams.get('category') || '';
      if (urlCat && cats.some(cat => (cat.id || cat._id || '') === urlCat)) {
        catSelect.value = urlCat;
      }

      // Category change — re-apply the product listing (buildParams reads catSelect)
      catSelect.addEventListener('change', () => {
        currentPage = 1;
        applyShopFilters();
      });
    } catch (e) { /* silent — filters still work without categories */ }
  }

  // ---- Price inputs — live filtering with debounce ----
  const priceMin = document.getElementById('price-min');
  const priceMax = document.getElementById('price-max');
  let priceDebounce;
  function onPriceChange() {
    clearTimeout(priceDebounce);
    priceDebounce = setTimeout(() => { currentPage = 1; applyShopFilters(); }, 600);
  }
  if (priceMin) priceMin.addEventListener('input', onPriceChange);
  if (priceMax) priceMax.addEventListener('input', onPriceChange);

  // ---- Availability radios — live ----
  if (filterPanel) {
    filterPanel.querySelectorAll('input[name="avail"]').forEach(radio => {
      radio.addEventListener('change', () => { currentPage = 1; applyShopFilters(); });
    });

    // ---- Discount radios — live ----
    filterPanel.querySelectorAll('input[name="discount"]').forEach(radio => {
      radio.addEventListener('change', () => { currentPage = 1; applyShopFilters(); });
    });
  }

  // ---- Search — debounced ----
  if (searchInput) {
    let searchDebounce;
    searchInput.addEventListener('input', () => {
      clearTimeout(searchDebounce);
      searchDebounce = setTimeout(() => { currentPage = 1; applyShopFilters(); }, 500);
    });
  }

  // ---- Sort ----
  if (sortSelect) {
    sortSelect.addEventListener('change', () => { currentPage = 1; applyShopFilters(); });
  }

  // ---- Clear All ----
  const clearBtn = filterPanel ? filterPanel.querySelector('.btn-ghost') : null;
  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      // Reset category to "All Categories"
      const catSel = document.getElementById('category-select');
      if (catSel) catSel.value = '';
      // Reset price
      if (priceMin) priceMin.value = '';
      if (priceMax) priceMax.value = '';
      // Reset availability
      if (filterPanel) {
        const firstAvail = filterPanel.querySelector('input[name="avail"]');
        if (firstAvail) firstAvail.checked = true;
        filterPanel.querySelectorAll('input[name="avail"]').forEach((r, i) => { if (i > 0) r.checked = false; });
        // Reset discount
        const firstDiscount = filterPanel.querySelector('input[name="discount"]');
        if (firstDiscount) firstDiscount.checked = true;
        filterPanel.querySelectorAll('input[name="discount"]').forEach((r, i) => { if (i > 0) r.checked = false; });
      }
      currentPage = 1;
      applyShopFilters();
    });
  }

  // ---- Initial load ----
  applyShopFilters();
}

/* ============ PRODUCT DETAILS PAGE ============ */
async function initProductDetailsPage() {
  const urlParams = new URLSearchParams(window.location.search);
  const productId = urlParams.get('id');

  if (!productId) {
    window.location.href = 'shop.html';
    return;
  }

  try {
    const { product } = await PublicAPI.product(productId);

    // Normalize field names
    const p = {
      id: product.id || product._id,
      name: product.name || '',
      // The Selling Price is the backend-authoritative finalPrice. `price` is
      // kept as the base/original price; `finalPrice` is the derived selling price.
      price: (product.finalPrice !== undefined && product.finalPrice !== null ? product.finalPrice : product.price) || 0,
      originalPrice: product.originalPrice || product.oldPrice || null,
      discountPercent: product.discountPercent !== undefined ? product.discountPercent : (product.discount || 0),
      stockStatus: product.stockStatus || (product.stock === 0 ? 'out_of_stock' : product.stock <= product.reorderLevel ? 'low_stock' : 'in_stock'),
      ratingAvg: product.ratingAvg !== undefined ? product.ratingAvg : (product.rating || 0),
      ratingCount: product.ratingCount !== undefined ? product.ratingCount : (product.reviewCount || 0),
      mainImage: resolveImg(product.mainImage || (product.images && product.images.length > 0 ? product.images[0] : '')),
      images: (product.images || []).map(resolveImg),
      description: product.description || product.shortDescription || '',
      categoryName: product.categoryName || product.category_name || (product.category && product.category.name) || '',
      stock: product.stock || 0
    };

    // Update title
    document.title = `${p.name} — Vendhan Crackers`;

    // Gallery
    const mainImg = document.querySelector('.pd-main-img img');
    if (mainImg) {
      safeSetImgSrc(mainImg, p.mainImage || '');
    }

    const thumbs = document.querySelector('.pd-thumbs');
    if (thumbs && p.images && p.images.length > 0) {
      thumbs.textContent = '';
      p.images.forEach((img, i) => {
        const thumbDiv = document.createElement('div');
        thumbDiv.className = 'pd-thumb' + (i === 0 ? ' active' : '');
        var _safeThumbUrl = (function(raw) { var p = raw.substring(0, 8).toLowerCase(); return p.indexOf('http') === 0 ? raw : ''; })(img || '');
        const thumbImg = document.createElement('img');
        safeSetImgSrc(thumbImg, img);
        thumbImg.alt = 'Thumb ' + (i + 1);
        thumbDiv.appendChild(thumbImg);
        thumbDiv.addEventListener('click', (function(safeUrl) { return function() { if (mainImg && safeUrl) safeSetImgSrc(mainImg, safeUrl); }; })(_safeThumbUrl));
        thumbs.appendChild(thumbDiv);
      });
    }

    // Info
    const catEl = document.querySelector('.pd-info .product-cat');
    if (catEl) catEl.textContent = p.categoryName;

    const nameEl = document.querySelector('.pd-info h1');
    if (nameEl) nameEl.textContent = p.name;

    const ratingEl = document.querySelector('.pd-meta .product-rating');
    if (ratingEl) {
      const stars = '★'.repeat(Math.round(p.ratingAvg)) + '☆'.repeat(5 - Math.round(p.ratingAvg));
      ratingEl.textContent = '';
      const starsSpan = document.createElement('span');
      starsSpan.style.color = 'var(--gold)';
      starsSpan.textContent = stars;
      ratingEl.appendChild(starsSpan);
      ratingEl.appendChild(document.createTextNode(' (' + p.ratingAvg + ' · ' + p.ratingCount + ' reviews)'));
    }

    const priceEl = document.querySelector('.pd-price');
    if (priceEl) {
      priceEl.textContent = '';
      const priceNow = document.createElement('span');
      priceNow.className = 'price-now';
      priceNow.textContent = formatINR(p.price);
      priceEl.appendChild(priceNow);
      // Only show struck-through original + savings when a real discount exists.
      const hasRealDiscount = p.discountPercent > 0 && p.originalPrice && p.price < p.originalPrice;
      if (hasRealDiscount) {
        const priceOld = document.createElement('span');
        priceOld.className = 'price-old';
        priceOld.textContent = formatINR(p.originalPrice);
        priceEl.appendChild(priceOld);
      }
      if (hasRealDiscount) {
        const priceOff = document.createElement('span');
        priceOff.className = 'price-off';
        priceOff.textContent = 'You Save ' + Math.round(p.discountPercent) + '%';
        priceEl.appendChild(priceOff);
      }
    }

    const descEl = document.querySelector('.pd-desc');
    if (descEl) descEl.textContent = p.description;

    const stockEl = document.querySelector('.pd-stock-info');
    if (stockEl) {
      stockEl.textContent = '';
      stockEl.appendChild(createStockDotEl(p.stockStatus));
      const stockSpan = document.createElement('span');
      const stockB = document.createElement('b');
      stockB.textContent = String(p.stock);
      stockSpan.appendChild(stockB);
      stockSpan.appendChild(document.createTextNode(' units available in stock'));
      stockEl.appendChild(stockSpan);
    }

    // Add to cart button
    const addBtn = document.querySelector('[data-add-to-cart]');
    if (addBtn) {
      addBtn.dataset.id = p.id;
      addBtn.dataset.name = p.name;
      addBtn.dataset.price = p.price;
      addBtn.dataset.img = p.mainImage || '';
    }

    // Expose available stock to the editable quantity selector so both manual
    // typing and the +/− buttons respect the real product stock limit.
    const qtySelectorEl = document.querySelector('.pd-actions .qty-selector');
    if (qtySelectorEl) {
      if (p.stock !== undefined && p.stock !== null && Number.isFinite(Number(p.stock))) {
        qtySelectorEl.dataset.stock = String(Number(p.stock));
        const qtyIn = qtySelectorEl.querySelector('input');
        if (qtyIn) qtyIn.max = String(Number(p.stock));
      }
    }

    // Buy Now — add to cart with the selected quantity, then go to checkout
    const buyNowBtn = document.querySelector('[data-buy-now]');
    if (buyNowBtn && p.id) {
      buyNowBtn.dataset.id = p.id;
      buyNowBtn.dataset.name = p.name;
      if (!buyNowBtn.dataset.bound) {
        buyNowBtn.dataset.bound = '1';
        buyNowBtn.addEventListener('click', async (e) => {
          e.preventDefault();
          if (buyNowBtn.dataset.loading) return;

          const id = buyNowBtn.dataset.id;
          const name = buyNowBtn.dataset.name || 'Product';

          // Read selected quantity from the product-details quantity selector
          const actionsWrap = buyNowBtn.closest('.pd-actions');
          const qtyInput = actionsWrap ? actionsWrap.querySelector('.qty-selector input') : null;
          let quantity = 1;
          if (qtyInput) {
            const parsed = parseInt(qtyInput.value, 10);
            if (Number.isInteger(parsed) && parsed >= 1) quantity = parsed;
            else {
              showToast('Quantity required', 'Please enter a valid quantity (minimum 1).', 'warning');
              return;
            }
          }

          // Guest: redirect to login with redirect back to this product page
          if (typeof isLoggedIn !== 'function' || !isLoggedIn()) {
            const current = window.location.pathname.split('/').pop() + window.location.search;
            showToast('Login required', 'Please login to complete your purchase.', 'warning');
            window.location.href = 'login.html?redirect=' + encodeURIComponent(current);
            return;
          }

          // Prevent double-click while in-flight
          buyNowBtn.dataset.loading = '1';
          const originalHtml = buyNowBtn.innerHTML;
          buyNowBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Adding...';
          try {
            await CustomerAPI.addToCart(id, quantity);
            if (typeof syncCartCount === 'function') syncCartCount();
            showToast('Added to cart', `${name} added to your cart.`);
            window.location.href = 'checkout.html';
          } catch (err) {
            showToast('Error', typeof safeError === 'function' ? safeError(err) : err.message, 'error');
          } finally {
            buyNowBtn.dataset.loading = '';
            buyNowBtn.innerHTML = originalHtml;
          }
        });
      }
    }

    // Related products (fallback: fetch products from same category)
    const relatedGrid = document.querySelector('.product-grid');
    if (relatedGrid) {
      try {
        let products = [];
        // Try related endpoint first
        try {
          const relatedData = await PublicAPI.relatedProducts(productId, 3);
          products = relatedData.products || [];
        } catch (e) {
          // Fallback: fetch products from same category
          if (p.categoryName) {
            const catData = await PublicAPI.products({ category: product.category?._id || '', limit: 4 });
            products = (catData.products || []).filter(prod => (prod.id || prod._id) !== p.id).slice(0, 3);
          }
        }
        if (products.length > 0) {
          renderProductCards(relatedGrid, products);
        } else {
          const noRelated = document.createElement('p');
          noRelated.style.color = 'var(--text-muted)';
          noRelated.style.gridColumn = '1/-1';
          noRelated.textContent = 'No related products found.';
          relatedGrid.textContent = '';
          relatedGrid.appendChild(noRelated);
        }
      } catch (e) { /* silent */ }
    }

    // Free Delivery highlight — value comes from the backend Settings
    // (freeDeliveryThreshold), the same source of truth checkout uses.
    // Note: apiRequest() unwraps the backend { success, message, data }
    // envelope, so the response here is the raw `data` object:
    //   { settings: { ..., freeDeliveryThreshold } }
    const freeDeliveryEl = document.querySelector('#pd-free-delivery');
    if (freeDeliveryEl) {
      const textEl = freeDeliveryEl.querySelector('[data-free-delivery-text]');
      try {
        const settingsData = await PublicAPI.settings();
        const threshold = settingsData && settingsData.settings
          ? settingsData.settings.freeDeliveryThreshold
          : null;
        if (textEl) {
          if (threshold !== null && threshold !== undefined && Number(threshold) > 0) {
            textEl.textContent = 'Free Delivery over ' + formatINR(threshold);
          } else {
            textEl.textContent = 'Free Delivery';
          }
        }
      } catch (e) {
        // Settings request failed — show a sensible fallback, never "₹…"/"₹undefined".
        if (textEl) textEl.textContent = 'Free Delivery';
      }
    }

    // Minimum Order highlight — value comes from the backend Settings
    // (Setting.minimumOrderAmount, Admin → Settings), the same source of
    // truth the cart/checkout minimum-order validation uses.
    const minOrderEl = document.querySelector('#pd-min-order');
    if (minOrderEl) {
      const textEl = minOrderEl.querySelector('[data-min-order-text]');
      try {
        const settingsData = await PublicAPI.settings();
        const minOrder = settingsData && settingsData.settings
          ? settingsData.settings.minimumOrderAmount
          : null;
        if (textEl) {
          if (minOrder !== null && minOrder !== undefined && Number(minOrder) > 0) {
            textEl.textContent = 'Minimum Order: ' + formatINR(minOrder);
          } else {
            textEl.textContent = 'Minimum Order: ' + formatINR(0);
          }
        }
      } catch (e) {
        // Settings request failed — never render "₹…"/"₹undefined".
        if (textEl) textEl.textContent = 'Minimum Order';
      }
    }

  } catch (e) {
    showToast('Error', safeError(e), 'error');
    setTimeout(() => window.location.href = 'shop.html', 1500);
  }
}

/* ============ CART PAGE ============ */
async function initCartPageAPI() {
  const container = document.querySelector('.cart-items');
  if (!container) return;

  if (!isLoggedIn()) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon"><i class="fas fa-lock"></i></div>
        <h3>Login required</h3>
        <p>Please login to view your cart and checkout.</p>
        <a href="login.html?redirect=cart.html" class="btn btn-primary">Login</a>
      </div>
    `;
    return;
  }

  // Minimum order state — value loaded once from the SAME public Settings API
  // used by Product Details (Admin Settings → minimumOrderAmount).
  // NULL / 0  → no minimum-order restriction (cart keeps working normally).
  let cartMinOrder = null;
  let currentSubtotal = 0; // latest displayed subtotal (same basis as Order Summary)
  // Delivery settings — same source of truth as the backend pricing engine
  // (Admin → Settings → deliveryCharge / freeDeliveryThreshold).
  let cartDeliveryCharge = 0;
  let cartFreeDeliveryThreshold = 1000;

  // Render the "Minimum Order: ₹X" indicator in the Order Summary card.
  function updateMinOrderView() {
    const row = document.querySelector('[data-min-order-row]');
    const valueEl = document.querySelector('[data-min-order-value]');
    const noteEl = document.querySelector('[data-min-order-note]');
    if (!row || !valueEl) return;
    // No minimum configured (missing/zero) → no restriction, keep hidden
    if (cartMinOrder === null || cartMinOrder <= 0) {
      row.style.display = 'none';
      if (noteEl) { noteEl.style.display = 'none'; noteEl.textContent = ''; }
      return;
    }
    row.style.display = 'flex';
    valueEl.textContent = formatINR(cartMinOrder);
    valueEl.classList.remove('ok', 'alert');
    const met = currentSubtotal >= cartMinOrder;
    valueEl.classList.add(met ? 'ok' : 'alert');
    if (noteEl) {
      if (met) {
        noteEl.style.display = 'none';
        noteEl.textContent = '';
      } else {
        noteEl.textContent = 'Add ' + formatINR(cartMinOrder - currentSubtotal) + ' more to continue.';
        noteEl.style.display = 'block';
      }
    }
  }

  async function render() {
    // Show loading state
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon"><i class="fas fa-spinner fa-spin"></i></div>
        <h3>Loading your cart...</h3>
      </div>
    `;
    try {
      const data = await CustomerAPI.getCart();

      if (data.items.length === 0) {
        currentSubtotal = 0;
        updateMinOrderView();
        container.innerHTML = `
          <div class="empty-state">
            <div class="empty-icon"><i class="fas fa-shopping-cart"></i></div>
            <h3>Your cart is empty</h3>
            <p>Looks like you haven't added any crackers yet. Let's fix that!</p>
            <a href="shop.html" class="btn btn-primary">Start Shopping</a>
          </div>
        `;
        const summary = document.querySelector('.order-summary');
        if (summary) summary.style.display = 'none';
        return;
      }

      container.textContent = '';
      data.items.forEach(item => {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'cart-item';
        itemDiv.dataset.id = item.productId || item.comboId;
        const imgDiv = document.createElement('div');
        imgDiv.className = 'cart-item-img';
        const imgEl = document.createElement('img');
        imgEl.src = safeImg(item.image || '');
        imgEl.alt = item.name || '';
        imgDiv.appendChild(imgEl);
        const infoDiv = document.createElement('div');
        infoDiv.className = 'cart-item-info';
        const h4 = document.createElement('h4');
        h4.textContent = item.name || '';
        const catDiv = document.createElement('div');
        catDiv.className = 'cart-cat';
        catDiv.textContent = item.itemType === 'COMBO' ? 'Festival Combo' : 'Festival Crackers';
        const priceDiv = document.createElement('div');
        priceDiv.className = 'cart-price';
        // Backend-authoritative per-unit price AFTER category discount (BEFORE
        // order-level discounts). Order-level discounts appear once below in the
        // summary, so the item price and Subtotal always add up.
        priceDiv.textContent = formatINR(item.afterCategoryPrice ?? item.price);
        infoDiv.appendChild(h4);
        infoDiv.appendChild(catDiv);
        infoDiv.appendChild(priceDiv);
        const rightDiv = document.createElement('div');
        rightDiv.className = 'cart-item-right';
        const qtyDiv = document.createElement('div');
        qtyDiv.className = 'qty-selector';
        const minusBtn = document.createElement('button');
        minusBtn.className = 'qty-minus';
        minusBtn.textContent = '−';
        const qtyInput = document.createElement('input');
        qtyInput.type = 'number';
        qtyInput.value = item.quantity;
        qtyInput.min = '1';
        qtyInput.inputmode = 'numeric';
        // Reflect the real stock limit on the input (mirrors Product Details);
        // final authority is still the back-end stock validation.
        if (item.stock !== undefined && item.stock !== null && Number.isFinite(Number(item.stock))) {
          qtyInput.max = String(Number(item.stock));
        }
        const plusBtn = document.createElement('button');
        plusBtn.className = 'qty-plus';
        plusBtn.textContent = '+';
        qtyDiv.appendChild(minusBtn);
        qtyDiv.appendChild(qtyInput);
        qtyDiv.appendChild(plusBtn);
        const totalDiv = document.createElement('div');
        totalDiv.className = 'cart-item-total';
        // Line total on the same after-category basis as the Order Summary Subtotal.
        totalDiv.textContent = formatINR(item.afterCategorySubtotal ?? item.subtotal);
        const removeBtn = document.createElement('button');
        removeBtn.className = 'remove-btn';
        removeBtn.dataset.remove = item.productId || item.comboId;
        const trashIcon = document.createElement('i');
        trashIcon.className = 'fas fa-trash-alt';
        removeBtn.appendChild(trashIcon);
        removeBtn.appendChild(document.createTextNode(' Remove'));
        rightDiv.appendChild(qtyDiv);
        rightDiv.appendChild(totalDiv);
        rightDiv.appendChild(removeBtn);
        itemDiv.appendChild(imgDiv);
        itemDiv.appendChild(infoDiv);
        itemDiv.appendChild(rightDiv);
        container.appendChild(itemDiv);
      });

      // Qty handlers
      container.querySelectorAll('.qty-selector').forEach(selector => {
        const input = selector.querySelector('input');
        const minus = selector.querySelector('.qty-minus');
        const plus = selector.querySelector('.qty-plus');
        const id = selector.closest('.cart-item').dataset.id;

        // --- Editable quantity ---
        // Allow typing directly into the middle field. Reuses the same
        // updateCartItem API, back-end stock validation, render() and
        // syncCartCount() that the − / + buttons already use.
        let lastValid = parseInt(input.value, 10) || 1;
        let committing = false;
        let lastAttemptedRaw = '';

        // Keep the field whole-number only while typing.
        input.addEventListener('input', () => {
          const raw = input.value;
          const cleaned = String(raw).replace(/[^\d]/g, '');
          if (cleaned !== raw) input.value = cleaned;
        });

        async function commitQty() {
          const raw = String(input.value).trim();
          const parsed = parseInt(raw, 10);
          const cleanInt = /^\d+$/.test(raw) && Number.isInteger(parsed) && parsed >= 1;
          if (!cleanInt) {
            // empty / 0 / negative / decimal / letters -> restore previous valid
            input.value = String(lastValid);
            return;
          }
          if (parsed === lastValid) {
            input.value = String(parsed); // normalize, e.g. "050" -> "50"
            return;
          }
          // Skip a duplicated commit for the exact same typed value (change/blur/Enter can all fire).
          if (committing || raw === lastAttemptedRaw) return;
          lastAttemptedRaw = raw;
          committing = true;
          try {
            await CustomerAPI.updateCartItem(id, parsed);
            lastValid = parsed;
            render();
            syncCartCount();
          } catch (e) {
            showToast('Error', safeError(e), 'error');
            render(); // restore the server-valid quantity (incl. stock limits)
          } finally {
            committing = false;
          }
        }
        input.addEventListener('change', commitQty);
        input.addEventListener('blur', commitQty);
        input.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            commitQty();
          }
        });

        minus.addEventListener('click', async () => {
          const val = Math.max(1, (parseInt(input.value) || 1) - 1);
          input.value = val;
          try { await CustomerAPI.updateCartItem(id, val); render(); syncCartCount(); } catch (e) { showToast('Error', safeError(e), 'error'); }
        });
        plus.addEventListener('click', async () => {
          const val = (parseInt(input.value) || 1) + 1;
          input.value = val;
          try { await CustomerAPI.updateCartItem(id, val); render(); syncCartCount(); } catch (e) { showToast('Error', safeError(e), 'error'); }
        });
      });

      // Remove handlers
      container.querySelectorAll('[data-remove]').forEach(btn => {
        btn.addEventListener('click', async () => {
          try {
            await CustomerAPI.removeCartItem(btn.dataset.remove);
            showToast('Removed', 'Item removed from cart.', 'warning');
            render();
            syncCartCount();
          } catch (e) { showToast('Error', safeError(e), 'error'); }
        });
      });

      // Update summary
      const subtotalEl = document.querySelector('[data-summary-subtotal]');
      const discountEl = document.querySelector('[data-summary-discount]');
      const deliveryEl = document.querySelector('[data-summary-delivery]');
      const totalEl = document.querySelector('[data-summary-total]');
      const referralRow = document.querySelector('.referral-row');
      const referralDiscountEl = document.querySelector('[data-summary-referral]');
      const referralLabelEl = document.querySelector('[data-summary-referral-label]');
      const referralStatusEl = document.querySelector('[data-referral-status]');
      const referralInput = document.querySelector('[data-referral-input]');
      const referralApplyBtn = document.querySelector('[data-referral-apply]');

      const subtotal = Number(data.subtotal) || 0;
      currentSubtotal = subtotal; // keep the displayed subtotal as the checkout-check basis
      // Customer-type specific minimum ORDER AMOUNT — resolved authoritatively by the
      // cart API and used everywhere the minimum is shown. Falls back to the
      // Settings value previously loaded when the API does not return it
      // (older backend / API failure).
      if (data && data.minimumOrderAmount != null) {
        const apiMin = Number(data.minimumOrderAmount);
        if (Number.isFinite(apiMin)) cartMinOrder = apiMin;
      }
      if (subtotalEl) subtotalEl.textContent = formatINR(subtotal);

      // Delivery charge — backend-authoritative when provided by the cart API
      // (same rule as the pricing engine: free above the Settings free-delivery
      // threshold, otherwise the flat Settings charge). Falls back to the
      // existing client-side rule if the field is missing.
      const delivery = Number.isFinite(Number(data.deliveryCharge))
        ? Number(data.deliveryCharge)
        : (subtotal >= cartFreeDeliveryThreshold ? 0 : cartDeliveryCharge);
      if (deliveryEl) deliveryEl.textContent = formatINR(delivery);

      // Show loyalty discount if applicable (backend-authoritative, mutually exclusive)
      const secondOrderAmount = Number(data.secondOrderDiscountAmount) || 0;
      const secondOrderPercent = Number(data.secondOrderDiscountPercent) || 0;
      const membershipAmount = Number(data.membershipDiscountAmount) || 0;
      const membershipPercent = Number(data.membershipDiscountPercent) || 0;
      const membershipTier = data.membershipTier || 'none';
      // Wholesale discount — order-level discount computed by the backend on the
      // amount AFTER category discount. Wholesale customers never get loyalty or
      // referral discounts, so this is the only Discount-row entry for them.
      const wholesaleAmount = Number(data.wholesaleDiscountAmount) || 0;
      const wholesalePercent = Number(data.wholesaleDiscountPercent) || 0;
      const discountLabelEl = document.querySelector('[data-summary-discount-label]');

      // Phase 8 — referral discount (backend-authoritative)
      const referralAmount = Number(data.referralDiscountAmount) || 0;
      const referralPercent = Number(data.referralDiscountPercent) || 0;
      const referralCode = data.referralCode || null;
      if (referralRow) referralRow.style.display = referralAmount > 0 ? 'flex' : 'none';
      if (referralDiscountEl) referralDiscountEl.textContent = '−' + formatINR(referralAmount);
      if (referralLabelEl && referralPercent > 0) {
        referralLabelEl.textContent = 'Referral Discount — ' + referralPercent + '%';
      }
      // Order-level discounts (backend-authoritative) — SECOND-ORDER / MEMBERSHIP /
      // REFERRAL / WHOLESALE. The backend applies these ON TOP of the Subtotal and
      // reflects them in data.total, so each row is a real subtraction from the
      // Grand Total — never double-counted.
      if (discountEl) {
        if (wholesaleAmount > 0) {
          discountEl.textContent = '−' + formatINR(wholesaleAmount);
          discountEl.title = 'Wholesale Discount ' + wholesalePercent + '% — subtracted from Grand Total';
          if (discountLabelEl) discountLabelEl.textContent = 'Wholesale Discount — ' + wholesalePercent + '%';
        } else if (secondOrderPercent > 0 && secondOrderAmount > 0) {
          discountEl.textContent = '−' + formatINR(secondOrderAmount);
          discountEl.title = 'Second Order Discount ' + secondOrderPercent + '% — subtracted from Grand Total';
          if (discountLabelEl) discountLabelEl.textContent = 'Second Order Discount — ' + secondOrderPercent + '%';
        } else if (membershipPercent > 0 && membershipAmount > 0) {
          const tierLabel = membershipTier.charAt(0).toUpperCase() + membershipTier.slice(1);
          discountEl.textContent = '−' + formatINR(membershipAmount);
          discountEl.title = tierLabel + ' Membership ' + membershipPercent + '% — subtracted from Grand Total';
          if (discountLabelEl) discountLabelEl.textContent = tierLabel + ' Membership — ' + membershipPercent + '%';
        } else {
          discountEl.textContent = '− ₹0';
          discountEl.title = '';
          if (discountLabelEl) discountLabelEl.textContent = 'Discount';
        }
      }
      // Grand Total — backend-authoritative when provided (all order-level
      // discounts are already applied by the backend). Falls back to the same
      // formula used by the backend: Subtotal − discount + delivery.
      const orderLevelDiscount = Number(data.discount) || 0;
      if (totalEl) {
        if (data && Number.isFinite(Number(data.total))) {
          totalEl.textContent = formatINR(Number(data.total));
        } else {
          totalEl.textContent = formatINR(subtotal - orderLevelDiscount + delivery);
        }
      }

      // Keep the Minimum Order indicator in sync (quantity/removal already re-render)
      updateMinOrderView();

      // Phase 8 — referral entry status (backend-authoritative)
      if (referralStatusEl) {
        if (referralCode) {
          referralStatusEl.innerHTML = '<i class="fas fa-check-circle" style="color:#16a34a;"></i> Referral applied: <b>' + localEscapeHTML(referralCode) + '</b>';
        } else {
          referralStatusEl.innerHTML = '<i class="fas fa-info-circle"></i> Referred retail customers get 3% off.';
        }
      }
      if (referralInput) referralInput.value = referralCode || '';
      if (referralApplyBtn) {
        // Remove stale listeners by cloning
        const oldBtn = referralApplyBtn;
        const newBtn = oldBtn.cloneNode(true);
        oldBtn.parentNode.replaceChild(newBtn, oldBtn);
        newBtn.addEventListener('click', async () => {
          if (!referralInput) return;
          const code = referralInput.value.trim().toUpperCase();
          if (!code) {
            if (referralStatusEl) {
              referralStatusEl.innerHTML = '<i class="fa fa-exclamation-circle" style="color:#dc2626;"></i> Please enter a referral code.';
            }
            return;
          }
          newBtn.disabled = true;
          newBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Applying...';
          try {
            const res = await ReferralAPI.apply(code);
            if (referralStatusEl) {
              referralStatusEl.innerHTML = '<i class="fa fa-check-circle" style="color:#16a34a;"></i> Referral applied: <b>' + localEscapeHTML(res.referralCode || code) + '</b>';
            }
            showToast('Referral applied', 'Your reseller referral has been applied successfully.');
            render();
            syncCartCount();
          } catch (e) {
            if (referralStatusEl) {
              referralStatusEl.innerHTML = '<i class="fa fa-exclamation-circle" style="color:#dc2626;"></i> ' + localEscapeHTML(safeError(e));
            }
            showToast('Error', safeError(e), 'error');
          } finally {
            newBtn.disabled = false;
            newBtn.innerHTML = '<i class="fas fa-check"></i> Apply';
          }
        });
      }

    } catch (e) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon"><i class="fas fa-exclamation-triangle"></i></div>
          <h3>Failed to load cart</h3>
          <p>${safeError(e)}</p>
          <button class="btn btn-primary" onclick="location.reload()"><i class="fas fa-redo"></i> Try Again</button>
        </div>
      `;
    }
  }

  // Load minimum order amount from the existing public Settings API
  // (Admin → Settings → minimumOrderAmount). Reuses the exact mechanism the
  // Product Details page uses — no duplicate setting, no hard-coded amount.
  // Delivery charge + free-delivery threshold use the SAME public Settings API
  // so the summary matches the backend pricing engine exactly.
  try {
    const settingsData = await PublicAPI.settings();
    const s = settingsData && settingsData.settings ? settingsData.settings : null;
    const v = s ? s.minimumOrderAmount : null;
    cartMinOrder = (v !== null && v !== undefined && Number.isFinite(Number(v))) ? Number(v) : null;
    const dc = s ? s.deliveryCharge : null;
    cartDeliveryCharge = (dc !== null && dc !== undefined && Number.isFinite(Number(dc))) ? Number(dc) : 0;
    const ft = s ? s.freeDeliveryThreshold : null;
    cartFreeDeliveryThreshold = (ft !== null && ft !== undefined && Number.isFinite(Number(ft))) ? Number(ft) : 1000;
  } catch (e) {
    cartMinOrder = null; // settings/API failure → cart keeps functioning normally
    cartDeliveryCharge = 0;
    cartFreeDeliveryThreshold = 1000;
  }

  // Proceed to Checkout — frontend minimum-order validation (UX only).
  // The backend remains the final authority for minimum-order enforcement.
  const checkoutBtn = document.querySelector('.summary-actions a[href="checkout.html"]');
  if (checkoutBtn) {
    checkoutBtn.addEventListener('click', (e) => {
      // Missing/invalid/zero minimum → no restriction, allow navigation
      if (cartMinOrder === null || cartMinOrder <= 0) return;
      if (currentSubtotal < cartMinOrder) {
        e.preventDefault();
        showToast('Minimum Order', 'Minimum order amount is ' + formatINR(cartMinOrder) + '. Please add more products to continue.', 'warning');
      }
    });
  }

  render();
}

/* ============ CHECKOUT PAGE ============ */

/* ---------- Checkout customer auto-fill ---------- */
// Safely normalize a profile value for form population: never surface
// undefined / null / NaN / [object Object] into a visible input.
function _safeProfileField(v) {
  if (v === undefined || v === null) return '';
  if (typeof v === 'object') return '';
  const s = String(v).trim();
  return (s === 'NaN' || s === 'undefined' || s === 'null') ? '' : s;
}

// Auto-populate Step 1 (Customer Details) from the existing authenticated
// profile. Reuses the same profile source used by profile.html (AuthAPI.me /
// currentUser) — values are never hard-coded. Only empty fields are filled so
// any values the customer enters during checkout are preserved. Editing these
// fields never writes back to the saved profile.
async function autoPopulateCheckoutCustomer(form) {
  let user = getCurrentUser();
  if (!user) {
    try {
      await initAuthState();
      user = getCurrentUser();
    } catch (e) {
      user = null;
    }
  }
  if (!user) return; // Leave fields for manual entry if the profile is unavailable.

  const nameInput = form.querySelectorAll('input[type="text"]')[0];
  const phoneInput = form.querySelector('input[type="tel"]');
  const emailInput = form.querySelector('input[type="email"]');
  if (!nameInput || !phoneInput || !emailInput) return;

  const fillIfEmpty = (input, value) => {
    const safe = _safeProfileField(value);
    if (safe && !String(input.value).trim()) input.value = safe;
  };

  fillIfEmpty(nameInput, user.name);
  fillIfEmpty(phoneInput, user.phone);
  fillIfEmpty(emailInput, user.email);
}

async function initCheckoutPageAPI() {
  if (!isLoggedIn()) {
    window.location.href = 'login.html?redirect=checkout.html';
    return;
  }

  // Minimum-order state resolved from the authoritative cart API (customer type →
  // minimum order amount). Used for the dynamic checkout message + UX pre-check.
  // The backend remains the final authority and re-validates before order creation.
  let checkoutCustomerType = 'retail';
  let checkoutMinOrder = 0;
  let checkoutCartAmount = 0;

  function updateCheckoutMinOrderView() {
    const row = document.querySelector('[data-min-order-row]');
    const valueEl = document.querySelector('[data-min-order-value]');
    const noteEl = document.querySelector('[data-min-order-note]');
    if (!row || !valueEl) return;
    // No minimum configured (missing/zero) → no restriction, keep hidden.
    if (!checkoutMinOrder || checkoutMinOrder <= 0) {
      row.style.display = 'none';
      if (noteEl) { noteEl.style.display = 'none'; noteEl.textContent = ''; }
      return;
    }
    row.style.display = 'flex';
    valueEl.textContent = formatINR(checkoutMinOrder);
    valueEl.classList.remove('ok', 'alert');
    const met = checkoutCartAmount >= checkoutMinOrder;
    valueEl.classList.add(met ? 'ok' : 'alert');
    if (noteEl) {
      if (met) {
        noteEl.innerHTML = '<i class="fas fa-check-circle" style="color:#16a34a;"></i> Minimum order requirement met';
        noteEl.classList.add('ok');
        noteEl.style.display = 'block';
      } else {
        const label = checkoutCustomerType === 'wholesale' ? 'Wholesale' : 'Retail';
        noteEl.textContent = `Minimum order amount for ${label} customers is ${formatINR(checkoutMinOrder)}. Please add ${formatINR(checkoutMinOrder - checkoutCartAmount)} more to continue.`;
        noteEl.classList.remove('ok');
        noteEl.style.display = 'block';
      }
    }
  }

  // Auto-fill Step 1 (Customer Details) from the authenticated customer's
  // existing profile (uses the same data /api/auth/me returns for profile.html).
  const checkoutFormForProfile = document.querySelector('#checkout-form');
  if (checkoutFormForProfile) {
    await autoPopulateCheckoutCustomer(checkoutFormForProfile);
  }

  // Load cart into review step
  try {
    const data = await CustomerAPI.getCart();

    // Resolve the dynamic minimum-order rule from the authoritative cart API:
    //   customerType: 'retail' | 'wholesale'
    //   minimumOrderAmount: resolved by the backend for this customer
    checkoutCustomerType = data.customerType === 'wholesale' ? 'wholesale' : 'retail';
    if (data.minimumOrderAmount != null && Number.isFinite(Number(data.minimumOrderAmount))) {
      checkoutMinOrder = Number(data.minimumOrderAmount);
    }
    checkoutCartAmount = Number(data.subtotal) || 0;

    const reviewProducts = document.querySelector('.checkout-step-panel:nth-child(3) .confirm-products');
    if (reviewProducts) {
      reviewProducts.textContent = '';
      data.items.forEach(item => {
        const div = document.createElement('div');
        div.className = 'confirm-product';
        const img = document.createElement('img');
        img.src = safeImg(item.image || '');
        img.alt = item.name || '';
        const info = document.createElement('div');
        info.className = 'cp-info';
        const b = document.createElement('b');
        b.textContent = item.name || '';
        const span = document.createElement('span');
        span.textContent = 'Qty: ' + item.quantity;
        info.appendChild(b);
        info.appendChild(span);
        const price = document.createElement('div');
        price.className = 'cp-price';
        // Line total on the same after-category Subtotal basis (backend-provided).
        price.textContent = formatINR(item.afterCategorySubtotal ?? item.subtotal);
        div.appendChild(img);
        div.appendChild(info);
        div.appendChild(price);
        reviewProducts.appendChild(div);
      });
    }

    const summaryItems = document.querySelector('.order-summary .confirm-products');
    if (summaryItems) {
      summaryItems.textContent = '';
      data.items.forEach(item => {
        const div = document.createElement('div');
        div.className = 'confirm-product';
        const img = document.createElement('img');
        img.src = safeImg(item.image || '');
        img.alt = item.name || '';
        const info = document.createElement('div');
        info.className = 'cp-info';
        const b = document.createElement('b');
        b.textContent = item.name || '';
        const span = document.createElement('span');
        span.textContent = 'Qty: ' + item.quantity;
        info.appendChild(b);
        info.appendChild(span);
        const price = document.createElement('div');
        price.className = 'cp-price';
        // Line total on the same after-category Subtotal basis (backend-provided).
        price.textContent = formatINR(item.afterCategorySubtotal ?? item.subtotal);
        div.appendChild(img);
        div.appendChild(info);
        div.appendChild(price);
        summaryItems.appendChild(div);
      });
    }

    const subtotalEl = document.querySelector('.order-summary .summary-row:nth-of-type(2) span:last-child');
    if (subtotalEl) subtotalEl.textContent = formatINR(data.subtotal);

    // Delivery charge — same rule as the backend pricing engine: free above
    // the Settings free-delivery threshold, otherwise the flat Settings charge.
    let deliveryCharge = 0;
    let freeDeliveryThreshold = 1000;
    try {
      const settingsData = await PublicAPI.settings();
      const s = settingsData && settingsData.settings ? settingsData.settings : null;
      const dc = s ? s.deliveryCharge : null;
      deliveryCharge = (dc !== null && dc !== undefined && Number.isFinite(Number(dc))) ? Number(dc) : 0;
      const ft = s ? s.freeDeliveryThreshold : null;
      freeDeliveryThreshold = (ft !== null && ft !== undefined && Number.isFinite(Number(ft))) ? Number(ft) : 1000;
    } catch (e) { /* settings/API failure → ₹0 delivery fallback */ }
    const subtotal = Number(data.subtotal) || 0;
    // Delivery charge — backend-authoritative when provided by the cart API.
    // Falls back to the existing client-side rule (free above the Settings
    // free-delivery threshold, otherwise the flat Settings charge).
    const delivery = Number.isFinite(Number(data.deliveryCharge))
      ? Number(data.deliveryCharge)
      : (subtotal >= freeDeliveryThreshold ? 0 : deliveryCharge);
    const deliveryRowValue = document.querySelector('.order-summary .summary-row:nth-of-type(5) span:last-child');
    if (deliveryRowValue) deliveryRowValue.textContent = formatINR(delivery);

    // Order-level discount fields (backend-authoritative, returned by the cart API).
    // SECOND-ORDER and MEMBERSHIP are mutually exclusive; REFERRAL (referred retail
    // customers) and WHOLESALE are separate order-level discounts.
    const secondOrderAmount = Number(data.secondOrderDiscountAmount) || 0;
    const secondOrderPercent = Number(data.secondOrderDiscountPercent) || 0;
    const membershipAmount = Number(data.membershipDiscountAmount) || 0;
    const membershipPercent = Number(data.membershipDiscountPercent) || 0;
    const membershipTier = data.membershipTier || 'none';
    const wholesaleCheckoutAmount = Number(data.wholesaleDiscountAmount) || 0;
    const wholesaleCheckoutPercent = Number(data.wholesaleDiscountPercent) || 0;
    const referralCheckoutAmount = Number(data.referralDiscountAmount) || 0;
    const referralCheckoutPercent = Number(data.referralDiscountPercent) || 0;
    const discountRow = document.querySelector('.order-summary .summary-row:nth-of-type(3) span:last-child');
    const discountLabelRow = document.querySelector('.order-summary .summary-row:nth-of-type(3) span:first-child');
    const referralCheckoutRow = document.querySelector('.order-summary .summary-row:nth-of-type(4)');
    const referralCheckoutLabel = document.querySelector('.order-summary .summary-row:nth-of-type(4) span:first-child');
    const referralCheckoutValue = document.querySelector('.order-summary .summary-row:nth-of-type(4) span:last-child');
    if (referralCheckoutRow) {
      referralCheckoutRow.style.display = referralCheckoutAmount > 0 ? 'flex' : 'none';
    }
    if (referralCheckoutLabel && referralCheckoutPercent > 0) {
      referralCheckoutLabel.textContent = 'Referral Discount — ' + referralCheckoutPercent + '%';
    }
    if (referralCheckoutValue) {
      referralCheckoutValue.textContent = '−' + formatINR(referralCheckoutAmount);
    }
    // Order-level discounts (backend-authoritative) — SECOND-ORDER / MEMBERSHIP /
    // REFERRAL / WHOLESALE. The backend applies these ON TOP of the Subtotal and
    // reflects them in data.total, so each row is a real subtraction from the
    // Grand Total — never double-counted.
    if (discountRow) {
      if (wholesaleCheckoutAmount > 0) {
        discountRow.textContent = '−' + formatINR(wholesaleCheckoutAmount);
        discountRow.title = 'Wholesale Discount ' + wholesaleCheckoutPercent + '% — subtracted from Grand Total';
        if (discountLabelRow) discountLabelRow.textContent = 'Wholesale Discount — ' + wholesaleCheckoutPercent + '%';
      } else if (secondOrderPercent > 0 && secondOrderAmount > 0) {
        discountRow.textContent = '−' + formatINR(secondOrderAmount);
        discountRow.title = 'Second Order Discount ' + secondOrderPercent + '% — subtracted from Grand Total';
        if (discountLabelRow) discountLabelRow.textContent = 'Second Order Discount — ' + secondOrderPercent + '%';
      } else if (membershipPercent > 0 && membershipAmount > 0) {
        const tierLabel = membershipTier.charAt(0).toUpperCase() + membershipTier.slice(1);
        discountRow.textContent = '−' + formatINR(membershipAmount);
        discountRow.title = tierLabel + ' Membership ' + membershipPercent + '% — subtracted from Grand Total';
        if (discountLabelRow) discountLabelRow.textContent = tierLabel + ' Membership — ' + membershipPercent + '%';
      } else {
        discountRow.textContent = '− ₹0';
        discountRow.title = '';
        if (discountLabelRow) discountLabelRow.textContent = 'Discount';
      }
    }
    // Grand Total — backend-authoritative when provided (all order-level
    // discounts are already applied by the backend). Falls back to the same
    // formula used by the backend: Subtotal − discount + delivery.
    const orderLevelDiscount = Number(data.discount) || 0;
    const totalRow = document.querySelector('.order-summary .summary-row.total span:last-child');
    if (totalRow) {
      if (data && Number.isFinite(Number(data.total))) {
        totalRow.textContent = formatINR(Number(data.total));
      } else {
        totalRow.textContent = formatINR(subtotal - orderLevelDiscount + delivery);
      }
    }

    // Dynamic minimum-order indicator (customer-type specific, backend-authoritative).
    updateCheckoutMinOrderView();
  } catch (e) { /* silent */ }

  // Replace localStorage cart logic with real API order placement
  const form = document.querySelector('#checkout-form');
  const placeBtn = document.querySelector('[data-place-order]');
  if (form && placeBtn) {
    // Remove existing listeners from main.js by cloning
    const oldBtn = placeBtn;
    const newBtn = oldBtn.cloneNode(true);
    oldBtn.parentNode.replaceChild(newBtn, oldBtn);

    newBtn.addEventListener('click', async () => {
      // Get all step panels
      const panels = document.querySelectorAll('.checkout-step-panel');
      const currentPanel = Array.from(panels).find(p => p.style.display !== 'none');

      // Validate current step
      const inputs = currentPanel ? currentPanel.querySelectorAll('[required]') : [];
      let valid = true;
      inputs.forEach(input => {
        const group = input.closest('.form-group');
        if (!input.value.trim()) {
          group.classList.add('invalid');
          valid = false;
        } else {
          group.classList.remove('invalid');
        }
      });

      if (!valid) {
        showToast('Error', 'Please fill all required fields correctly.', 'error');
        return;
      }

      // Collect delivery details from all steps
      const allInputs = form.querySelectorAll('input, select, textarea');
      const values = Array.from(allInputs).map(el => el.value);

      // Step 1: Customer details
      const name = form.querySelectorAll('input[type="text"]')[0] ? form.querySelectorAll('input[type="text"]')[0].value : '';
      const phone = form.querySelector('input[type="tel"]') ? form.querySelector('input[type="tel"]').value : '';
      const email = form.querySelector('input[type="email"]') ? form.querySelector('input[type="email"]').value : '';

      // Step 2: Delivery fields
      const address = form.querySelector('textarea') ? form.querySelector('textarea').value : '';
      const city = form.querySelectorAll('input[type="text"]')[1] ? form.querySelectorAll('input[type="text"]')[1].value : '';
      const stateSelect = form.querySelector('select');
      const state = stateSelect ? stateSelect.value : '';
      const pincode = form.querySelector('input[maxlength="6"]') ? form.querySelector('input[maxlength="6"]').value : '';

      // Dynamic minimum-order UX check (customer-type specific). The backend still
      // re-validates on order creation — this only prevents a doomed API call.
      if (checkoutMinOrder > 0 && checkoutCartAmount < checkoutMinOrder) {
        const label = checkoutCustomerType === 'wholesale' ? 'Wholesale' : 'Retail';
        showToast('Minimum Order', `Minimum order amount for ${label} customers is ${formatINR(checkoutMinOrder)}. Please add ${formatINR(checkoutMinOrder - checkoutCartAmount)} more to continue.`, 'warning');
        return;
      }

      try {
        newBtn.disabled = true;
        newBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Placing Order...';

        const result = await CustomerAPI.placeOrder({
          name,
          phone,
          email,
          address,
          city,
          state,
          pincode,
          paymentMethod: 'cod'
        });

        const orderMongoId = result.order?._id || result.orderId;
        showToast('Order placed!', `Your order ${result.orderId} has been placed successfully.`);
        // Clear localStorage cart (if any leftover from old flow)
        localStorage.removeItem('vc_cart');
        // Update cart count
        syncCartCount();

        setTimeout(() => {
          window.location.href = `order-confirmation.html?order=${orderMongoId}`;
        }, 1500);
      } catch (err) {
        showToast('Order failed', safeError(err), 'error');
        newBtn.disabled = false;
        newBtn.innerHTML = '<i class="fas fa-check-circle"></i> Place Order';
      }
    });
  }

  // Checkout step navigation: [data-next-step] / [data-prev-step]
  const checkoutPanels = document.querySelectorAll('.checkout-step-panel');
  const stepIndicators = document.querySelectorAll('.steps .step');

  function showCheckoutStep(index) {
    checkoutPanels.forEach((panel, i) => {
      panel.style.display = i === index ? '' : 'none';
    });
    stepIndicators.forEach((step, i) => {
      step.classList.toggle('active', i === index);
    });
  }

  function validateCheckoutPanel(panel) {
    let valid = true;
    panel.querySelectorAll('[required]').forEach(input => {
      const group = input.closest('.form-group');
      if (!input.value.trim()) {
        if (group) group.classList.add('invalid');
        valid = false;
      } else {
        if (group) group.classList.remove('invalid');
      }
    });
    return valid;
  }

  document.querySelectorAll('[data-next-step]').forEach(btn => {
    if (btn.dataset.bound) return;
    btn.dataset.bound = '1';
    btn.addEventListener('click', () => {
      const panel = btn.closest('.checkout-step-panel');
      if (!panel) return;
      if (!validateCheckoutPanel(panel)) {
        showToast('Error', 'Please fill all required fields correctly.', 'error');
        return;
      }
      const next = panel.nextElementSibling;
      if (next && next.classList.contains('checkout-step-panel')) {
        showCheckoutStep(Array.from(checkoutPanels).indexOf(next));
      }
    });
  });

  document.querySelectorAll('[data-prev-step]').forEach(btn => {
    if (btn.dataset.bound) return;
    btn.dataset.bound = '1';
    btn.addEventListener('click', () => {
      const panel = btn.closest('.checkout-step-panel');
      if (!panel) return;
      const prev = panel.previousElementSibling;
      if (prev && prev.classList.contains('checkout-step-panel')) {
        showCheckoutStep(Array.from(checkoutPanels).indexOf(prev));
      }
    });
  });
}

/* ============ ORDERS PAGE ============ */
async function initOrdersPage() {
  const container = document.querySelector('.orders-list');
  if (!container) return;

  if (!isLoggedIn()) {
    window.location.href = 'login.html?redirect=orders.html';
    return;
  }

  try {
    const data = await CustomerAPI.myOrders();
    const orders = data.orders || [];

    if (orders.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon"><i class="fas fa-box-open"></i></div>
          <h3>No orders yet</h3>
          <p>Place your first order and track it here.</p>
          <a href="shop.html" class="btn btn-primary">Shop Now</a>
        </div>
      `;
      return;
    }

    const statusOrder = ['pending', 'confirmed', 'packed', 'delivered'];
    const statusLabels = ['Pending', 'Confirmed', 'Packed', 'Delivered'];

    container.innerHTML = orders.map(order => {
      const currentIdx = statusOrder.indexOf(order.status);
      const isCancelled = order.status === 'cancelled';

      const progress = isCancelled
        ? `<div class="progress-tracker">
             <div class="progress-step done"><div class="p-dot"><i class="fas fa-times"></i></div><span class="p-label">Cancelled</span></div>
           </div>`
        : `<div class="progress-tracker">
             ${statusOrder.map((s, i) => `
               <div class="progress-step ${i < currentIdx ? 'done' : i === currentIdx ? 'active' : ''}">
                 <div class="p-dot">${i < currentIdx ? '<i class="fas fa-check"></i>' : i + 1}</div>
                 <span class="p-label">${statusLabels[i]}</span>
               </div>
             `).join('')}
           </div>`;

      return `
        <div class="order-card">
          <div class="order-card-top">
            <div>
              <div class="order-id">${order.orderId}</div>
              <div class="order-date">Placed on ${formatDate(order.createdAt)}</div>
            </div>
            ${getOrderBadge(order.status)}
          </div>
          <div class="order-card-meta">
            <div class="order-meta-item"><b>Items</b><span>${order.itemCount} items</span></div>
            <div class="order-meta-item"><b>Total</b><span>${formatINR(order.total)}</span></div>
            <div class="order-meta-item"><b>Payment</b><span>${(order.paymentStatus || 'pending').toUpperCase()}</span></div>
          </div>
          ${progress}
          <div style="display:flex; gap:8px; flex-wrap:wrap;">
            <a href="order-confirmation.html?order=${order.id}" class="btn btn-outline-dark btn-sm"><i class="fas fa-eye"></i> View Details</a>
            ${(order.status === 'pending' || order.status === 'confirmed') ? `
              <button class="btn btn-danger btn-sm" data-cancel-order="${order.id}"><i class="fas fa-times"></i> Cancel Order</button>
            ` : ''}
          </div>
        </div>
      `;
    }).join('');

    // Cancel order handlers
    container.querySelectorAll('[data-cancel-order]').forEach(btn => {
      btn.addEventListener('click', () => {
        if (btn.disabled) return;
        showConfirm('Are you sure you want to cancel this order?', async () => {
          try {
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Cancelling...';
            await CustomerAPI.cancelOrder(btn.dataset.cancelOrder);
            showToast('Order cancelled', 'Your order has been cancelled successfully.', 'warning');
            initOrdersPage();
          } catch (e) {
            showToast('Error', safeError(e), 'error');
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-times"></i> Cancel Order';
          }
        });
      });
    });

  } catch (e) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon"><i class="fas fa-exclamation-triangle"></i></div>
        <h3>Failed to load orders</h3>
        <p>${safeError(e)}</p>
        <button class="btn btn-primary" onclick="location.reload()"><i class="fas fa-redo"></i> Try Again</button>
      </div>
    `;
  }
}

/* ============ ORDER CONFIRMATION PAGE ============ */
async function initOrderConfirmationPage() {
  const urlParams = new URLSearchParams(window.location.search);
  const orderId = urlParams.get('order');

  if (!orderId) {
    window.location.href = 'orders.html';
    return;
  }

  try {
    const { order } = await CustomerAPI.order(orderId);

    // Order details
    const orderIdEl = document.querySelector('#confirm-order-details .confirm-detail:nth-child(1) span');
    if (orderIdEl) orderIdEl.textContent = order.orderId;

    const dateEl = document.querySelector('#confirm-order-details .confirm-detail:nth-child(2) span');
    if (dateEl) dateEl.textContent = formatDateTime(order.createdAt);

    const totalEl = document.querySelector('#confirm-order-details .confirm-detail:nth-child(3) span');
    if (totalEl) totalEl.textContent = formatINR(order.pricing?.total || order.total);

    const payEl = document.querySelector('#confirm-order-details .confirm-detail:nth-child(4) span');
    if (payEl) payEl.textContent = (order.payment?.method || 'cod').toUpperCase();

    // Delivery info
    const nameEl = document.querySelector('#confirm-delivery .confirm-detail:nth-child(1) span');
    if (nameEl) nameEl.textContent = order.customer?.name || '';

    const phoneEl = document.querySelector('#confirm-delivery .confirm-detail:nth-child(2) span');
    if (phoneEl) phoneEl.textContent = order.customer?.phone || '';

    const addrEl = document.querySelector('#confirm-delivery .confirm-detail:nth-child(3) span');
    if (addrEl) addrEl.textContent = `${order.deliveryAddress?.address || ''}, ${order.deliveryAddress?.city || ''}, ${order.deliveryAddress?.state || ''} — ${order.deliveryAddress?.pincode || ''}`;

    // Expected delivery (display-only estimate: 3 days from order date)
    const expectedEl = document.querySelector('#confirm-delivery .confirm-detail:nth-child(4) span');
    if (expectedEl) {
      const base = order.createdAt ? new Date(order.createdAt) : new Date();
      if (!isNaN(base)) {
        base.setDate(base.getDate() + 3);
        expectedEl.textContent = formatDate(base.toISOString());
      } else {
        expectedEl.textContent = '—';
      }
    }

    // Products
    const productsEl = document.querySelector('#confirm-products-section .confirm-products');
    if (productsEl) {
      productsEl.textContent = '';
      order.items.forEach(item => {
        const div = document.createElement('div');
        div.className = 'confirm-product';
        const info = document.createElement('div');
        info.className = 'cp-info';
        const b = document.createElement('b');
        b.textContent = item.productName || '';
        const span = document.createElement('span');
        span.textContent = 'Qty: ' + item.quantity + ' · ' + formatINR(item.price) + ' each';
        info.appendChild(b);
        info.appendChild(span);
        const price = document.createElement('div');
        price.className = 'cp-price';
        price.textContent = formatINR(item.subtotal);
        div.appendChild(info);
        div.appendChild(price);
        productsEl.appendChild(div);
      });
    }

    // Total
    const totalPaidEl = document.querySelector('#confirm-products-section .summary-row.total span:last-child');
    if (totalPaidEl) totalPaidEl.textContent = formatINR(order.pricing?.total || order.total);

  } catch (e) {
    showToast('Error', safeError(e), 'error');
  }
}

/* ============ LOGIN PAGE ============ */
function initLoginPage() {
  const form = document.querySelector('form[data-validate]');
  if (!form) return;

  // Field-level validation on blur
  form.querySelectorAll('[required]').forEach(input => {
    input.addEventListener('blur', () => {
      const group = input.closest('.form-group');
      if (!group) return;
      if (!input.value.trim()) {
        group.classList.add('invalid');
      } else {
        group.classList.remove('invalid');
      }
    });
    input.addEventListener('input', () => {
      const group = input.closest('.form-group');
      if (group && group.classList.contains('invalid') && input.value.trim()) {
        group.classList.remove('invalid');
      }
    });
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email_or_phone = form.querySelector('input[type="text"]').value;
    const password = form.querySelector('input[type="password"]').value;

    // Validate required fields
    let valid = true;
    form.querySelectorAll('[required]').forEach(input => {
      const group = input.closest('.form-group');
      if (!input.value.trim()) {
        if (group) group.classList.add('invalid');
        valid = false;
      }
    });
    if (!valid) {
      showToast('Error', 'Please fill in all required fields.', 'error');
      return;
    }

    const submitBtn = form.querySelector('button[type="submit"]');
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Logging in...';
    }

    try {
      const data = await AuthAPI.login({ email: email_or_phone, password });
      setToken(data.token);
      setCurrentUser(data.user || null);
      showToast('Login successful', `Welcome back, ${data.user?.name || 'User'}!`);

      const urlParams = new URLSearchParams(window.location.search);
      const rawRedirect = urlParams.get('redirect') || '';
      const safeRedirect = (rawRedirect && /^[^/\\:]+\.html$/.test(rawRedirect)) ? rawRedirect : 'index.html';
      setTimeout(() => { window.location.replace(safeRedirect); }, 1000);
    } catch (err) {
      showToast('Login failed', safeError(err), 'error');
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Login';
      }
    }
  });
}

/* ============ REGISTER PAGE ============ */
function initRegisterPage() {
  const form = document.querySelector('form[data-validate]');
  if (!form) return;

  // Field-level validation on blur
  form.querySelectorAll('[required]').forEach(input => {
    input.addEventListener('blur', () => {
      const group = input.closest('.form-group');
      if (!group) return;
      const val = input.value.trim();
      let invalid = false;
      if (!val) {
        invalid = true;
      } else if (input.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) {
        invalid = true;
      } else if (input.type === 'tel' && !/^[0-9+\-\s]{10,15}$/.test(val)) {
        invalid = true;
      } else if (input.type === 'password' && val.length < 8) {
        invalid = true;
      }
      group.classList.toggle('invalid', invalid);
    });
    input.addEventListener('input', () => {
      const group = input.closest('.form-group');
      if (group && group.classList.contains('invalid') && input.value.trim()) {
        group.classList.remove('invalid');
      }
    });
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fullName = form.querySelectorAll('input[type="text"]')[0].value;
    const email = form.querySelector('input[type="email"]').value;
    const phone = form.querySelector('input[type="tel"]').value;
    const password = form.querySelectorAll('input[type="password"]')[0].value;
    const confirmPassword = form.querySelectorAll('input[type="password"]')[1] ? form.querySelectorAll('input[type="password"]')[1].value : '';

    // Validate required fields
    let valid = true;
    form.querySelectorAll('[required]').forEach(input => {
      const group = input.closest('.form-group');
      if (!input.value.trim()) {
        if (group) group.classList.add('invalid');
        valid = false;
      }
    });
    if (!valid) {
      showToast('Error', 'Please fill in all required fields.', 'error');
      return;
    }

    // Validate email format
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      const emailGroup = form.querySelector('input[type="email"]').closest('.form-group');
      if (emailGroup) emailGroup.classList.add('invalid');
      showToast('Error', 'Please enter a valid email address.', 'error');
      return;
    }

    // Validate phone format
    if (!/^[0-9+\-\s]{10,15}$/.test(phone)) {
      const phoneGroup = form.querySelector('input[type="tel"]').closest('.form-group');
      if (phoneGroup) phoneGroup.classList.add('invalid');
      showToast('Error', 'Please enter a valid phone number.', 'error');
      return;
    }

    // Validate password length
    if (password.length < 8) {
      const pwGroup = form.querySelectorAll('input[type="password"]')[0].closest('.form-group');
      if (pwGroup) pwGroup.classList.add('invalid');
      showToast('Error', 'Password must be at least 8 characters long.', 'error');
      return;
    }

    // Validate password match
    if (password !== confirmPassword) {
      const confirmGroup = form.querySelectorAll('input[type="password"]')[1].closest('.form-group');
      if (confirmGroup) confirmGroup.classList.add('invalid');
      showToast('Error', 'Passwords do not match.', 'error');
      return;
    }

    // Customer type (backend-authoritative, defaults to retail)
    const customerType = (form.querySelector('input[name="customerType"]:checked') || {}).value || 'retail';

    const submitBtn = form.querySelector('button[type="submit"]');
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating account...';
    }

    try {
      const data = await AuthAPI.register({ name: fullName, email, phone, password, customerType });
      setToken(data.token);
      setCurrentUser(data.user || null);
      showToast('Account created', 'Welcome to Vendhan Crackers!');
      setTimeout(() => window.location.href = 'index.html', 1000);
    } catch (err) {
      showToast('Registration failed', safeError(err), 'error');
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fas fa-user-plus"></i> Create Account';
      }
    }
  });
}

/* ============ CONTACT PAGE ============ */
function initContactPage() {
  const form = document.querySelector('form[data-validate]');
  if (!form) return;

  // Field-level validation on blur
  form.querySelectorAll('[required]').forEach(input => {
    input.addEventListener('blur', () => {
      const group = input.closest('.form-group');
      if (!group) return;
      const val = input.value.trim();
      let invalid = false;
      if (!val) {
        invalid = true;
      } else if (input.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) {
        invalid = true;
      } else if (input.type === 'tel' && !/^[0-9+\-\s]{10,15}$/.test(val)) {
        invalid = true;
      }
      group.classList.toggle('invalid', invalid);
    });
    input.addEventListener('input', () => {
      const group = input.closest('.form-group');
      if (group && group.classList.contains('invalid') && input.value.trim()) {
        group.classList.remove('invalid');
      }
    });
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = form.querySelectorAll('input[type="text"]')[0].value;
    const email = form.querySelector('input[type="email"]').value;
    const phone = form.querySelector('input[type="tel"]').value;
    const subject = form.querySelector('select').value;
    const message = form.querySelector('textarea').value;

    // Validate required fields
    let valid = true;
    form.querySelectorAll('[required]').forEach(input => {
      const group = input.closest('.form-group');
      if (!input.value.trim()) {
        if (group) group.classList.add('invalid');
        valid = false;
      }
    });
    if (!valid) {
      showToast('Error', 'Please fill in all required fields.', 'error');
      return;
    }

    // Validate email format
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      const emailGroup = form.querySelector('input[type="email"]').closest('.form-group');
      if (emailGroup) emailGroup.classList.add('invalid');
      showToast('Error', 'Please enter a valid email address.', 'error');
      return;
    }

    // Validate phone format
    if (!/^[0-9+\-\s]{10,15}$/.test(phone)) {
      const phoneGroup = form.querySelector('input[type="tel"]').closest('.form-group');
      if (phoneGroup) phoneGroup.classList.add('invalid');
      showToast('Error', 'Please enter a valid phone number.', 'error');
      return;
    }

    const submitBtn = form.querySelector('button[type="submit"]');
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';
    }

    try {
      await PublicAPI.contact({ name, email, phone, subject, message });
      showToast('Message sent', 'We will get back to you soon!');
      form.reset();
    } catch (err) {
      showToast('Failed to send', safeError(err), 'error');
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Send Message';
      }
    }
  });
}

/* ============ ADMIN LOGIN PAGE ============ */
function initAdminLoginPage() {
  const form = document.querySelector('form[data-validate]');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = form.querySelector('input[type="email"]').value;
    const password = form.querySelector('input[type="password"]').value;

    const submitBtn = form.querySelector('button[type="submit"]');
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Logging in...';
    }

    try {
      const data = await AuthAPI.adminLogin({ email, password });
      setAdminToken(data.token);
      setCurrentAdmin(data.admin || null);
      showToast('Admin login successful', `Welcome, ${data.admin?.name || 'Admin'}!`);
      setTimeout(() => window.location.href = 'admin.html', 1000);
    } catch (err) {
      showToast('Admin login failed', safeError(err), 'error');
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Login to Dashboard';
      }
    }
  });
}

/* ============ ADMIN DASHBOARD ============ */
async function initAdminDashboard() {
  if (!isAdminLoggedIn()) {
    window.location.href = 'admin-login.html';
    return;
  }

  try {
    // KPI cards
    const summary = await AdminAPI.dashboard.summary();
    const kpiValues = document.querySelectorAll('.kpi-card b');
    if (kpiValues.length >= 4) {
      kpiValues[0].textContent = formatINR(summary.totalSales || 0);
      kpiValues[1].textContent = (summary.totalOrders || 0).toLocaleString('en-IN');
      kpiValues[2].textContent = (summary.totalProducts || 0).toLocaleString('en-IN');
      kpiValues[3].textContent = (summary.totalCustomers || 0).toLocaleString('en-IN');
    }

    // Recent orders
    const recentOrders = await AdminAPI.dashboard.recentOrders(5);
    const recentTable = document.querySelector('.admin-card .data-table tbody');
    if (recentTable) {
      recentTable.textContent = '';
      (recentOrders.orders || []).forEach(o => {
        const tr = document.createElement('tr');
        const tdId = document.createElement('td');
        const b = document.createElement('b');
        b.textContent = o.orderId || '';
        tdId.appendChild(b);
        const tdName = document.createElement('td');
        tdName.textContent = o.customerName || (o.customer && o.customer.name) || '';
        const tdDate = document.createElement('td');
        tdDate.textContent = formatDate(o.createdAt);
        const tdTotal = document.createElement('td');
        tdTotal.textContent = formatINR(o.total || o.grandTotal);
        const tdStatus = document.createElement('td');
        tdStatus.innerHTML = getOrderBadge(o.status);
        const tdAction = document.createElement('td');
        const viewBtn = document.createElement('button');
        viewBtn.className = 'btn btn-sm btn-ghost';
        viewBtn.dataset.viewOrder = o.id;
        viewBtn.textContent = 'View';
        tdAction.appendChild(viewBtn);
        tr.appendChild(tdId);
        tr.appendChild(tdName);
        tr.appendChild(tdDate);
        tr.appendChild(tdTotal);
        tr.appendChild(tdStatus);
        tr.appendChild(tdAction);
        recentTable.appendChild(tr);
      });

      // View order details handler
      recentTable.querySelectorAll('[data-view-order]').forEach(btn => {
        btn.addEventListener('click', async () => {
          try {
            const res = await AdminAPI.orders.detail(btn.dataset.viewOrder);
            const order = res.order || res;
            const modal = document.getElementById('order-details-modal');
            if (!modal) return;
            const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val || '—'; };
            set('od-id', order.orderId);
            set('od-date', formatDateTime(order.createdAt));
            set('od-customer', (order.customer && order.customer.name) || '');
            set('od-phone', (order.customer && order.customer.phone) || '');
            set('od-email', (order.customer && order.customer.email) || '');
            set('od-status', order.status ? order.status.charAt(0).toUpperCase() + order.status.slice(1) : '');
            set('od-payment', (order.payment && order.payment.method) || '');
            set('od-total', formatINR(order.pricing && order.pricing.total));
            const addr = order.deliveryAddress;
            set('od-address', addr ? [addr.address, addr.city, addr.state, addr.pincode].filter(Boolean).join(', ') : '');
            const itemsWrap = document.getElementById('od-items');
            if (itemsWrap) {
              itemsWrap.textContent = '';
              (order.items || []).forEach(item => {
                const row = document.createElement('div');
                row.style.cssText = 'display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid var(--border);';
                const left = document.createElement('span');
                left.textContent = (item.productName || '') + ' × ' + (item.quantity || 0);
                const right = document.createElement('span');
                right.textContent = formatINR(item.subtotal || 0);
                row.appendChild(left);
                row.appendChild(right);
                itemsWrap.appendChild(row);
              });
            }
            modal.classList.add('open');
          } catch (e) { showToast('Error', safeError(e), 'error'); }
        });
      });
    }

    // Low stock
    try {
      const lowStock = await AdminAPI.dashboard.lowStock();
      const lowStockItems = lowStock.products || lowStock.items || [];
      const lowStockEl = document.getElementById('low-stock-card');
      if (lowStockEl) {
        const items = lowStockEl.querySelectorAll('.low-stock-item');
        if (lowStockItems.length === 0) {
          // Empty state
          items.forEach(el => {
            const img = el.querySelector('img');
            if (img) img.style.display = 'none';
            const info = el.querySelector('.ls-info');
            if (info) {
              const b = info.querySelector('b');
              const span = info.querySelector('span');
              if (b) b.textContent = 'No low-stock products';
              if (span) span.textContent = 'All products are sufficiently stocked.';
            }
            const pill = el.querySelector('.stock-pill');
            if (pill) pill.style.display = 'none';
          });
        } else {
          items.forEach((el, i) => {
            if (lowStockItems[i]) {
              const item = lowStockItems[i];
              const img = el.querySelector('img');
              const imgSrc = item.mainImage || item.image || (item.images && item.images.length > 0 ? item.images[0] : '');
              if (img) {
                if (imgSrc) {
                  safeSetImgSrc(img, imgSrc);
                } else {
                  // Safe fallback placeholder — no broken image icon
                  img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(
                    '<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40"><rect width="40" height="40" fill="#f0f0f0" rx="8"/><text x="50%" y="50%" text-anchor="middle" dominant-baseline="middle" font-size="16">📦</text></svg>'
                  );
                }
              }
              el.querySelector('.ls-info b').textContent = item.name;
              el.querySelector('.ls-info span').textContent = `${item.stock} left · Reorder at ${item.reorderLevel}`;
              const isOut = item.status === 'out_of_stock';
              el.querySelector('.stock-pill').textContent = isOut ? 'Out' : 'Low';
              el.querySelector('.stock-pill').className = `stock-pill ${isOut ? 'stock-out' : 'stock-low'}`;
            } else {
              el.style.display = 'none';
            }
          });
        }
      }
    } catch (e) {
      // Low stock API failed — replace permanent Loading state with an error/empty state
      const lowStockEl = document.getElementById('low-stock-card');
      if (lowStockEl) {
        lowStockEl.querySelectorAll('.low-stock-item').forEach(el => {
          const img = el.querySelector('img');
          if (img) img.style.display = 'none';
          const info = el.querySelector('.ls-info');
          if (info) {
            const b = info.querySelector('b');
            const span = info.querySelector('span');
            if (b) b.textContent = 'Unable to load stock data';
            if (span) span.textContent = 'Please try again later.';
          }
          const pill = el.querySelector('.stock-pill');
          if (pill) pill.style.display = 'none';
        });
      }
    }

    // Sales overview chart
    const salesData = await AdminAPI.dashboard.sales();
    const chartBox = document.querySelector('.admin-grid .admin-card .chart-box');
    if (chartBox && salesData.sales && salesData.sales.length > 0) {
      const maxVal = Math.max(...salesData.sales.map(s => s.revenue || 0), 1);
      chartBox.textContent = '';
      salesData.sales.forEach(s => {
        const p2 = s.period || {};
        let label = '';
        if (p2.year && p2.month) {
          const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
          label = monthNames[(p2.month - 1) % 12] + (p2.day ? ' ' + p2.day : '');
        } else if (p2.year) {
          label = String(p2.year);
        }
        const barDiv = document.createElement('div');
        barDiv.className = 'bar';
        barDiv.style.height = Math.max(5, Math.round((s.revenue || 0) / maxVal * 100)) + '%';
        barDiv.title = formatINR(s.revenue || 0);
        const labelSpan = document.createElement('span');
        labelSpan.className = 'bar-label';
        labelSpan.textContent = label;
        barDiv.appendChild(labelSpan);
        chartBox.appendChild(barDiv);
      });
    } else if (chartBox) {
      chartBox.innerHTML = `
        <div class="empty-state" style="height:100%; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:8px;">
          <div class="empty-icon"><i class="fas fa-chart-bar"></i></div>
          <h3>No sales data</h3>
          <p style="color:var(--text-muted); font-size:0.8rem;">Sales will appear here once orders are placed.</p>
        </div>
      `;
    }

    // Orders by status
    const orderStats = await AdminAPI.dashboard.orders();
    const donut = document.querySelector('.donut');
    const donutCenter = document.querySelector('.donut-center b');
    const legend = document.querySelector('.legend');
    if (donut && orderStats.byStatus) {
      const statuses = orderStats.byStatus;
      const total = statuses.reduce((s, st) => s + st.count, 0) || 1;
      const colors = { delivered: '#16a34a', confirmed: '#2563eb', packed: '#d97706', pending: '#dc2626', cancelled: '#6b7280' };
      let gradient = '';
      let cumulative = 0;
      const legendItems = [];
      statuses.forEach(st => {
        const pct = Math.round(st.count / total * 100);
        if (pct > 0) {
          gradient += `${colors[st.status] || '#6b7280'} ${cumulative}% ${cumulative + pct}%, `;
          cumulative += pct;
          legendItems.push({ color: colors[st.status] || '#6b7280', label: st.status.charAt(0).toUpperCase() + st.status.slice(1), pct });
        }
      });
      if (gradient) {
        donut.style.background = `conic-gradient(${gradient.slice(0, -2)})`;
      }
      if (donutCenter) donutCenter.textContent = total.toLocaleString('en-IN');
      if (legend) {
        legend.textContent = '';
        legendItems.forEach(item => {
          const div = document.createElement('div');
          div.className = 'legend-item';
          const dot = document.createElement('span');
          dot.className = 'legend-dot';
          dot.style.background = item.color;
          div.appendChild(dot);
          div.appendChild(document.createTextNode(' ' + item.label + ' (' + item.pct + ')%'));
          legend.appendChild(div);
        });
      }
    }

    // Top products
    const topProducts = await AdminAPI.dashboard.topProducts(5);
    const topTable = document.querySelectorAll('.admin-grid .admin-card .data-table tbody')[1];
    if (topTable) {
      topTable.textContent = '';
      (topProducts.products || []).forEach(p2 => {
        const tr = document.createElement('tr');
        const tdProd = document.createElement('td');
        const prodDiv = document.createElement('div');
        prodDiv.className = 'table-product';
        const img = document.createElement('img');
        // Backend returns the image in the `images` array for admin products
        img.src = safeImg(p2.mainImage || (p2.images && p2.images.length > 0 ? p2.images[0] : '') || p2.image || '');
        img.alt = '';
        const infoDiv = document.createElement('div');
        const nameB = document.createElement('b');
        nameB.textContent = p2.productName || '';
        infoDiv.appendChild(nameB);
        prodDiv.appendChild(img);
        prodDiv.appendChild(infoDiv);
        tdProd.appendChild(prodDiv);
        const tdQty = document.createElement('td');
        tdQty.textContent = String(p2.quantitySold || 0);
        const tdRev = document.createElement('td');
        tdRev.textContent = formatINR(p2.revenue || 0);
        tr.appendChild(tdProd);
        tr.appendChild(tdQty);
        tr.appendChild(tdRev);
        topTable.appendChild(tr);
      });
    }

    // Category sales
    const catSales = await AdminAPI.dashboard.categorySales();
    const catDonut = document.querySelectorAll('.donut')[1];
    const catLegend = document.querySelectorAll('.legend')[1];
    const catCenter = document.querySelectorAll('.donut-center b')[1];
    const cats = (catSales && catSales.categories) ? catSales.categories : [];
    const colors = ['#f5b301', '#ff7a1a', '#2563eb', '#16a34a', '#9333ea', '#dc2626'];

    // Backend returns flat [{ category, quantitySold, revenue, orderCount }]
    // Map: category → label, revenue → donut value
    const validCats = cats
      .map(c => ({
        label: String(c && c.category ? c.category : 'Unknown'),
        value: Number(c && c.revenue) || 0
      }))
      .filter(c => c.value > 0);

    if (catDonut && validCats.length === 0) {
      catDonut.style.background = 'conic-gradient(#e5e7eb 0% 100%)';
      if (catCenter) catCenter.textContent = formatINR(0);
      if (catLegend) {
        catLegend.textContent = '';
        const div = document.createElement('div');
        div.className = 'legend-item';
        const dot = document.createElement('span');
        dot.className = 'legend-dot';
        dot.style.background = '#e5e7eb';
        div.appendChild(dot);
        div.appendChild(document.createTextNode(' No category sales data yet'));
        catLegend.appendChild(div);
      }
    } else if (catDonut) {
      const total = validCats.reduce((s, c) => s + c.value, 0);
      let gradient = '';
      let cumulative = 0;
      const legendItems = [];
      validCats.forEach((c, i) => {
        const pct = Math.round(c.value / total * 100);
        if (pct > 0) {
          gradient += `${colors[i % colors.length]} ${cumulative}% ${cumulative + pct}%, `;
          cumulative += pct;
          legendItems.push({ color: colors[i % colors.length], label: c.label, pct });
        }
      });
      if (gradient) {
        catDonut.style.background = `conic-gradient(${gradient.slice(0, -2)})`;
      }
      if (catCenter) catCenter.textContent = formatINR(total);
      if (catLegend) {
        catLegend.textContent = '';
        legendItems.forEach(item => {
          const div = document.createElement('div');
          div.className = 'legend-item';
          const dot = document.createElement('span');
          dot.className = 'legend-dot';
          dot.style.background = item.color;
          div.appendChild(dot);
          div.appendChild(document.createTextNode(' ' + item.label + ' (' + item.pct + '%)'));
          catLegend.appendChild(div);
        });
      }
    }

  } catch (e) {
    showToast('Error', safeError(e), 'error');
  }
}

/* ============ ADMIN PRODUCTS ============ */
async function initAdminProducts() {
  try {
    const tbody = document.querySelector('#admin-products .data-table tbody');
    const searchInput = document.getElementById('product-search');
    const statusFilter = document.getElementById('product-status-filter');
    const categoryFilter = document.getElementById('product-category-filter');

    // Populate the Category dropdown from the existing categories API.
    // Category names are NOT hard-coded — future categories auto-appear.
    if (categoryFilter && categoryFilter.options.length <= 1) {
      try {
        const catData = await AdminAPI.categories.list();
        (catData.categories || []).forEach(c => {
          const opt = document.createElement('option');
          opt.value = c.id || c._id;
          opt.textContent = c.name || '';
          categoryFilter.appendChild(opt);
        });
      } catch (e) { /* categories are optional — products still load */ }
    }

    let productLoadTimer = null;
    // Load products from the backend with the search + category + status filters
    // applied in MongoDB (GET /api/admin/products?search=&category=&status=).
    async function loadProducts() {
      const params = { limit: 50 };
      const q = searchInput ? searchInput.value.trim() : '';
      const status = statusFilter ? statusFilter.value : 'all';
      const category = categoryFilter ? categoryFilter.value : '';
      if (q) params.search = q;
      if (status && status !== 'all') params.status = status;
      if (category) params.category = category;
      const data = await AdminAPI.products.list(params);
      renderProducts(data.products || []);
    }

    function renderProducts(products) {
      if (!tbody) return;
      tbody.textContent = '';
      if (products.length === 0) {
        const tr = document.createElement('tr');
        const td = document.createElement('td');
        td.colSpan = 6;
        td.style.textAlign = 'center';
        td.style.color = 'var(--text-muted)';
        td.textContent = 'No products found.';
        tr.appendChild(td);
        tbody.appendChild(tr);
        return;
      }
      products.forEach(p => {
        const tr = document.createElement('tr');
        // Product cell
        const tdProd = document.createElement('td');
        const prodDiv = document.createElement('div');
        prodDiv.className = 'table-product';
        const img = document.createElement('img');
        // Backend returns the image in the `images` array for admin products
        img.src = safeImg(p.mainImage || (p.images && p.images.length > 0 ? p.images[0] : '') || p.image || '');
        img.alt = '';
        const infoDiv = document.createElement('div');
        const nameB = document.createElement('b');
        nameB.textContent = p.name || '';
        const skuSpan = document.createElement('span');
        skuSpan.textContent = p.sku || '';
        infoDiv.appendChild(nameB);
        infoDiv.appendChild(skuSpan);
        prodDiv.appendChild(img);
        prodDiv.appendChild(infoDiv);
        tdProd.appendChild(prodDiv);
        // Other cells
        const tdCat = document.createElement('td');
        tdCat.textContent = (p.category && p.category.name) || p.categoryName || '';
        const tdPrice = document.createElement('td');
        // Selling Price is authoritative (backend-derived). Show it prominently,
        // with the Original Price struck through when a discount applies.
        const sellingPrice = p.sellingPrice || p.finalPrice || p.price || 0;
        if (p.discountPercent > 0 && p.originalPrice && sellingPrice < p.originalPrice) {
          tdPrice.innerHTML =
            `<b>${formatINR(sellingPrice)}</b> ` +
            `<span style="text-decoration:line-through; color:var(--text-muted); font-size:0.8rem;">${formatINR(p.originalPrice)}</span>`;
        } else {
          tdPrice.textContent = formatINR(sellingPrice);
        }
        const tdStock = document.createElement('td');
        tdStock.textContent = String(p.stock);
        const tdStatus = document.createElement('td');
        tdStatus.innerHTML = getStockPill(p.stockStatus);
        const tdActions = document.createElement('td');
        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'table-actions';
        const viewBtn = document.createElement('button');
        viewBtn.className = 'action-btn view';
        viewBtn.title = 'View';
        viewBtn.dataset.viewProduct = p.id;
        viewBtn.innerHTML = '<i class="fas fa-eye"></i>';
        const editBtn = document.createElement('button');
        editBtn.className = 'action-btn edit';
        editBtn.title = 'Edit';
        editBtn.dataset.editProduct = p.id;
        editBtn.innerHTML = '<i class="fas fa-edit"></i>';
        const delBtn = document.createElement('button');
        delBtn.className = 'action-btn delete';
        delBtn.title = 'Delete';
        delBtn.dataset.deleteProduct = p.id;
        delBtn.dataset.name = p.name || '';
        delBtn.innerHTML = '<i class="fas fa-trash"></i>';
        actionsDiv.appendChild(viewBtn);
        actionsDiv.appendChild(editBtn);
        actionsDiv.appendChild(delBtn);
        tdActions.appendChild(actionsDiv);
        tr.appendChild(tdProd);
        tr.appendChild(tdCat);
        tr.appendChild(tdPrice);
        tr.appendChild(tdStock);
        tr.appendChild(tdStatus);
        tr.appendChild(tdActions);
        tbody.appendChild(tr);
      });

      // View handlers
      tbody.querySelectorAll('[data-view-product]').forEach(btn => {
        btn.addEventListener('click', async () => {
          try {
            const res = await AdminAPI.products.get(btn.dataset.viewProduct);
            const p = res.product || res;
            const modal = document.getElementById('product-view-modal');
            if (!modal) return;
            const img = resolveImg(p.mainImage || (p.images && p.images[0]) || '');
            modal.querySelector('#pv-img').src = img || '';
            modal.querySelector('#pv-img').style.display = img ? '' : 'none';
            modal.querySelector('#pv-name').textContent = p.name || '';
            modal.querySelector('#pv-category').textContent = (p.category && p.category.name) || p.categoryName || '—';
            const sellingPrice = p.sellingPrice || p.finalPrice || p.price || 0;
            modal.querySelector('#pv-price').textContent = formatINR(sellingPrice);
            // originalPrice here is the compare-to price (struck through) when a discount applies;
            // otherwise both are equal and no artificial discount is shown.
            const comparePrice = (p.discountPercent > 0 && typeof p.originalPrice === 'number' && sellingPrice < p.originalPrice)
              ? p.originalPrice
              : null;
            modal.querySelector('#pv-original').textContent = comparePrice ? formatINR(comparePrice) : '—';
            modal.querySelector('#pv-discount').textContent = (p.discountPercent || p.discount || 0) + '%';
            modal.querySelector('#pv-stock').textContent = p.stock !== undefined ? p.stock : '—';
            modal.querySelector('#pv-status').textContent = p.status || '—';
            modal.querySelector('#pv-desc').textContent = p.description || '—';
            modal.classList.add('open');
          } catch (e) { showToast('Error', safeError(e), 'error'); }
        });
      });

      // Delete handlers
      tbody.querySelectorAll('[data-delete-product]').forEach(btn => {
        btn.addEventListener('click', () => {
          const productName = btn.dataset.name || 'this product';
          showConfirm(`Delete "${productName}"? This action cannot be undone.`, async () => {
            try {
              await AdminAPI.products.remove(btn.dataset.deleteProduct);
              showToast('Deleted', `${productName} has been deleted.`, 'warning');
              initAdminProducts();
            } catch (e) { showToast('Error', safeError(e), 'error'); }
          });
        });
      });

      // Edit handlers
      tbody.querySelectorAll('[data-edit-product]').forEach(btn => {
        btn.addEventListener('click', async () => {
          try {
            const data = await AdminAPI.products.get(btn.dataset.editProduct);
            const product = data.product || data;
            const form = document.getElementById('product-form');
            const modal = document.getElementById('product-modal');
            if (!form || !modal) return;

            const nameInput = form.querySelector('input[placeholder="e.g. Deluxe Sparkler Pack"]');
            const categorySelect = form.querySelector('select');
            const statusSelect = form.querySelectorAll('select')[1];
            const descriptionInput = form.querySelector('textarea');
            const priceInput = form.querySelector('.pricing-original');
            const stockInput = form.querySelector('#stock-quantity-input');
            const imageInput = document.getElementById('product-image-input');
            const previewWrap = document.getElementById('product-image-preview');
            const previewImg = previewWrap ? previewWrap.querySelector('img') : null;
            const previewEmpty = previewWrap ? previewWrap.querySelector('.preview-empty') : null;

            if (nameInput) nameInput.value = product.name || '';
            // Ensure category options are populated before setting value
            if (categorySelect && categorySelect.options.length <= 1) {
              try {
                const catData = await AdminAPI.categories.list();
                categorySelect.innerHTML = '<option value="">Select category</option>' +
                  (catData.categories || []).map(c => `<option value="${c.id || c._id}" data-discount="${Number(c.discount) || 0}">${c.name}</option>`).join('');
              } catch (e) { /* silent */ }
            }
            if (categorySelect) categorySelect.value = (product.category && product.category._id) || product.categoryId || product.category || '';
            if (statusSelect) statusSelect.value = product.status || 'active';
            if (descriptionInput) descriptionInput.value = product.description || '';
            // Original Price is loaded from product.originalPrice (admin-entered original).
            // The Selling Price is auto-derived on the backend and stored as product.price.
            // Read-only.
            if (priceInput) priceInput.value = product.originalPrice || '';
            if (stockInput) stockInput.value = product.stock || '';

            if (imageInput) imageInput.value = '';

            const existingImg = product.mainImage || (product.images && product.images.length > 0 ? product.images[0] : '');
            if (previewImg) previewImg.src = resolveImg(existingImg) || '';
            if (previewWrap) previewWrap.classList.toggle('has-image', !!existingImg);
            if (previewEmpty) previewEmpty.style.display = existingImg ? 'none' : '';

            form.dataset.editId = product.id || product._id;
            form.dataset.existingImage = existingImg || '';

            modal.classList.add('open');
            // Recompute the read-only Selling Price preview for the loaded product.
            if (typeof window.updateProductSellingPreview === 'function') {
              window.updateProductSellingPreview();
            }
          } catch (e) { showToast('Error', safeError(e), 'error'); }
        });
      });
    }

    // Combined backend-driven filters: search + category + status are all sent
    // to GET /api/admin/products so MongoDB applies them together. Re-query the
    // backend whenever any filter changes (search input is debounced).
    if (searchInput && !searchInput.dataset.bound) {
      searchInput.dataset.bound = '1';
      searchInput.addEventListener('input', () => {
        clearTimeout(productLoadTimer);
        productLoadTimer = setTimeout(loadProducts, 250);
      });
    }

    if (statusFilter && !statusFilter.dataset.bound) {
      statusFilter.dataset.bound = '1';
      statusFilter.addEventListener('change', () => {
        clearTimeout(productLoadTimer);
        productLoadTimer = setTimeout(loadProducts, 0);
      });
    }

    if (categoryFilter && !categoryFilter.dataset.bound) {
      categoryFilter.dataset.bound = '1';
      categoryFilter.addEventListener('change', () => {
        clearTimeout(productLoadTimer);
        productLoadTimer = setTimeout(loadProducts, 0);
      });
    }

    await loadProducts();
  } catch (e) { showToast('Error', safeError(e), 'error'); }
}

/* ============ ADMIN CATEGORIES ============ */
let adminCategoryCache = [];

async function initAdminCategories() {
  try {
    const data = await AdminAPI.categories.list();
    adminCategoryCache = data.categories || [];
    renderCategoryTable(applyCategorySearchFilter());
    bindCategorySearch();
  } catch (e) { showToast('Error', safeError(e), 'error'); }
}

/* Case-insensitive in-memory filter by category name. */
function applyCategorySearchFilter() {
  const input = document.getElementById('category-search');
  const q = input ? (input.value || '').trim().toLowerCase() : '';
  if (!q) return adminCategoryCache;
  return adminCategoryCache.filter(c => (c.name || '').toLowerCase().includes(q));
}

/* Bind the live search input once. Uses already-loaded data (no extra API call). */
function bindCategorySearch() {
  const input = document.getElementById('category-search');
  if (!input || input.dataset.bound) return;
  input.dataset.bound = '1';
  input.addEventListener('input', () => renderCategoryTable(applyCategorySearchFilter()));
}

function renderCategoryTable(categories) {
  const tbody = document.querySelector('#admin-categories .data-table tbody');
  if (!tbody) return;
  tbody.textContent = '';
  if (!categories || categories.length === 0) {
    const tr = document.createElement('tr');
    const td = document.createElement('td');
    td.colSpan = 5;
    td.style.textAlign = 'center';
    td.style.color = 'var(--text-muted)';
    td.textContent = 'No matching categories found.';
    tr.appendChild(td);
    tbody.appendChild(tr);
    return;
  }
  categories.forEach(c => {
    const tr = document.createElement('tr');
    const tdName = document.createElement('td');
    const b = document.createElement('b');
    b.textContent = c.name || '';
    tdName.appendChild(b);
    const tdCount = document.createElement('td');
    tdCount.textContent = String(c.productCount || 0);
    const tdDiscount = document.createElement('td');
    tdDiscount.textContent = (c.discount || 0) + '%';
    const tdStatus = document.createElement('td');
    const pill = document.createElement('span');
    pill.className = 'stock-pill ' + (c.status === 'active' ? 'stock-in' : 'stock-out');
    pill.textContent = c.status === 'active' ? 'Active' : 'Inactive';
    tdStatus.appendChild(pill);
    const tdActions = document.createElement('td');
    const actDiv = document.createElement('div');
    actDiv.className = 'table-actions';
    const catId = c.id || c._id;
    const editBtn = document.createElement('button');
    editBtn.className = 'action-btn edit';
    editBtn.title = 'Edit';
    editBtn.dataset.editCategory = catId;
    editBtn.innerHTML = '<i class="fas fa-edit"></i>';
    const delBtn = document.createElement('button');
    delBtn.className = 'action-btn delete';
    delBtn.title = 'Delete';
    delBtn.dataset.deleteCategory = catId;
    delBtn.dataset.name = c.name || '';
    delBtn.innerHTML = '<i class="fas fa-trash"></i>';
    actDiv.appendChild(editBtn);
    actDiv.appendChild(delBtn);
    tdActions.appendChild(actDiv);
    tr.appendChild(tdName);
    tr.appendChild(tdCount);
    tr.appendChild(tdDiscount);
    tr.appendChild(tdStatus);
    tr.appendChild(tdActions);
    tbody.appendChild(tr);
  });

  // Edit handlers
  tbody.querySelectorAll('[data-edit-category]').forEach(btn => {
    btn.addEventListener('click', () => {
      const cat = categories.find(c => (c.id || c._id) === btn.dataset.editCategory);
      if (!cat) return;
      const form = document.getElementById('category-form');
      const modal = document.getElementById('category-modal');
      if (!form || !modal) return;
      form.querySelector('input[type="text"]').value = cat.name || '';
      form.querySelector('textarea').value = cat.description || '';
      const discountInput = form.querySelector('input[placeholder="e.g. 20"]');
      if (discountInput) discountInput.value = cat.discount !== undefined ? cat.discount : 0;
      form.dataset.editId = cat.id || cat._id;
      modal.querySelector('.modal-header h3').textContent = 'Edit Category';
      modal.classList.add('open');
    });
  });

  // Delete handlers
  tbody.querySelectorAll('[data-delete-category]').forEach(btn => {
    btn.addEventListener('click', () => {
      const catName = btn.dataset.name || 'this category';
      showConfirm(`Delete category "${catName}"?`, async () => {
        try {
          const res = await AdminAPI.categories.remove(btn.dataset.deleteCategory);
          const msg = (res && res.deactivated) ? 'deactivated (has active products)' : 'deleted';
          showToast('Done', `Category "${catName}" ${msg}.`, 'warning');
          initAdminCategories();
        } catch (e) { showToast('Error', safeError(e), 'error'); }
      });
    });
  });
}

/* ============ ADMIN ORDERS ============ */
async function initAdminOrders() {
  try {
    const data = await AdminAPI.orders.list({ limit: 50 });
    const allOrders = data.orders || [];
    const tbody = document.querySelector('#admin-orders .data-table tbody');
    const tabs = document.querySelectorAll('#admin-orders .admin-tab');
    const monthFilter = document.getElementById('order-month-filter');
    const yearFilter = document.getElementById('order-year-filter');
    const clearBtn = document.getElementById('order-filter-clear');
    let activeStatus = 'all';

    // Populate year filter from loaded orders
    if (yearFilter) {
      const years = new Set();
      allOrders.forEach(o => {
        if (o.createdAt) {
          const d = new Date(o.createdAt);
          if (!isNaN(d)) years.add(d.getFullYear());
        }
      });
      const sortedYears = Array.from(years).sort((a, b) => b - a);
      sortedYears.forEach(y => {
        const opt = document.createElement('option');
        opt.value = String(y);
        opt.textContent = String(y);
        yearFilter.appendChild(opt);
      });
    }

    // Allowed status transitions (must match backend ORDER_STATUS_TRANSITIONS)
    const TRANSITIONS = {
      pending: ['confirmed', 'cancelled'],
      confirmed: ['packed', 'cancelled'],
      packed: ['delivered'],
      delivered: [],
      cancelled: []
    };

    function renderOrders(orders) {
      if (!tbody) return;
      tbody.textContent = '';
      if (orders.length === 0) {
        const tr = document.createElement('tr');
        const td = document.createElement('td');
        td.colSpan = 7;
        td.style.textAlign = 'center';
        td.style.color = 'var(--text-muted)';
        td.textContent = 'No orders found';
        tr.appendChild(td);
        tbody.appendChild(tr);
        return;
      }
      orders.forEach(o => {
        const tr = document.createElement('tr');
        const tdId = document.createElement('td');
        const b = document.createElement('b'); b.textContent = o.orderId || ''; tdId.appendChild(b);
        const tdName = document.createElement('td');
        tdName.textContent = o.customerName || (o.customer && o.customer.name) || '';
        const tdDate = document.createElement('td'); tdDate.textContent = formatDate(o.createdAt);
        const tdItems = document.createElement('td'); tdItems.textContent = String(o.itemCount || 0);
        const tdTotal = document.createElement('td'); tdTotal.textContent = formatINR(o.total || o.grandTotal);
        const tdBadge = document.createElement('td'); tdBadge.innerHTML = getOrderBadge(o.status);
        const tdSel = document.createElement('td');
        const sel = document.createElement('select');
        sel.className = 'form-control';
        sel.style.cssText = 'padding:4px 8px;font-size:0.75rem;';
        sel.dataset.orderStatus = o.id;
        // Only show valid transitions from current status
        const allowed = TRANSITIONS[o.status] || [];
        const allStatuses = ['pending','confirmed','packed','delivered','cancelled'];
        allStatuses.forEach(v => {
          const opt = document.createElement('option');
          opt.value = v; opt.textContent = v.charAt(0).toUpperCase() + v.slice(1);
          if (o.status === v) {
            opt.selected = true;
          } else if (!allowed.includes(v)) {
            opt.disabled = true;
          }
          sel.appendChild(opt);
        });
        tdSel.appendChild(sel);
        [tdId,tdName,tdDate,tdItems,tdTotal,tdBadge,tdSel].forEach(td => tr.appendChild(td));
        tbody.appendChild(tr);
      });

      // Status update handlers
      tbody.querySelectorAll('[data-order-status]').forEach(select => {
        select.addEventListener('change', async () => {
          const previousValue = select.dataset.previousStatus || select.querySelector('option:checked').value;
          try {
            await AdminAPI.orders.updateStatus(select.dataset.orderStatus, select.value);
            showToast('Status updated', `Order status changed to ${select.value}.`);
            // Update badge in-place without full re-render
            const badgeCell = select.closest('tr').querySelector('td:nth-child(6)');
            if (badgeCell) badgeCell.innerHTML = getOrderBadge(select.value);
            // Sync in-memory order status
            const ord = allOrders.find(o => o.id === select.dataset.orderStatus);
            if (ord) ord.status = select.value;
            select.dataset.previousStatus = select.value;
          } catch (e) {
            showToast('Error', safeError(e), 'error');
            // Restore previous value
            select.value = previousValue;
          }
        });
        select.dataset.previousStatus = select.value;
      });
    }

    // Combined filter: status tab + month + year
    function applyOrderFilters() {
      const month = monthFilter ? monthFilter.value : '';
      const year = yearFilter ? yearFilter.value : '';
      let filtered = allOrders;
      if (activeStatus !== 'all') {
        filtered = filtered.filter(o => o.status === activeStatus);
      }
      if (month || year) {
        filtered = filtered.filter(o => {
          if (!o.createdAt) return false;
          const d = new Date(o.createdAt);
          if (isNaN(d)) return false;
          const m = String(d.getMonth() + 1);
          const y = String(d.getFullYear());
          if (month && m !== month) return false;
          if (year && y !== year) return false;
          return true;
        });
      }
      renderOrders(filtered);
    }

    // Wire tab filters
    if (tabs.length) {
      tabs.forEach(tab => {
        if (tab.dataset.tabBound) return;
        tab.dataset.tabBound = '1';
        tab.addEventListener('click', () => {
          tabs.forEach(t => t.classList.remove('active'));
          tab.classList.add('active');
          activeStatus = tab.textContent.trim().toLowerCase();
          applyOrderFilters();
        });
      });
    }

    // Wire month/year filters
    if (monthFilter && !monthFilter.dataset.bound) {
      monthFilter.dataset.bound = '1';
      monthFilter.addEventListener('change', applyOrderFilters);
    }
    if (yearFilter && !yearFilter.dataset.bound) {
      yearFilter.dataset.bound = '1';
      yearFilter.addEventListener('change', applyOrderFilters);
    }
    if (clearBtn && !clearBtn.dataset.bound) {
      clearBtn.dataset.bound = '1';
      clearBtn.addEventListener('click', () => {
        if (monthFilter) monthFilter.value = '';
        if (yearFilter) yearFilter.value = '';
        applyOrderFilters();
      });
    }

    applyOrderFilters();
  } catch (e) { showToast('Error', safeError(e), 'error'); }
}

/* ============ ADMIN CUSTOMERS ============ */
async function initAdminCustomers() {
  try {
    const tbody = document.querySelector('#admin-customers .data-table tbody');
    const searchInput = document.getElementById('customer-search');
    const statusFilter = document.getElementById('customer-status-filter');
    const tabWrap = document.getElementById('customer-type-tabs');
    const tabs = tabWrap ? tabWrap.querySelectorAll('.admin-tab') : [];
    let activeType = '';
    let currentCustomers = [];

    // Load customers from backend with optional customerType filter
    async function loadCustomers() {
      const params = { limit: 50 };
      if (activeType) params.customerType = activeType;
      const data = await AdminAPI.customers.list(params);
      currentCustomers = data.customers || [];
      return currentCustomers;
    }

    // Populate customer details modal
    function openCustomerDetails(customer) {
      const modal = document.getElementById('customer-details-modal');
      if (!modal || !customer) return;
      const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val || '—'; };
      set('cd-name', customer.name || customer.fullName || '');
      set('cd-email', customer.email || '');
      set('cd-phone', customer.phone ? '+91 ' + customer.phone : '');
      set('cd-type', (customer.customerType || 'retail') === 'wholesale' ? 'Wholesale' : 'Retail');
      set('cd-status', customer.status || '');
      set('cd-joined', customer.createdAt ? formatDate(customer.createdAt) : '');
      set('cd-orders', String(customer.orderCount || 0));
      set('cd-spent', formatINR(customer.totalSpent || 0));
      modal.classList.add('open');
    }

    function renderCustomers(customers) {
      if (!tbody) return;
      tbody.textContent = '';
      if (customers.length === 0) {
        const tr = document.createElement('tr');
        const td = document.createElement('td');
        td.colSpan = 8;
        td.style.textAlign = 'center';
        td.style.color = 'var(--text-muted)';
        td.textContent = 'No customers found';
        tr.appendChild(td);
        tbody.appendChild(tr);
        return;
      }
      customers.forEach(c => {
        const fullName = c.name || c.fullName || 'Unknown';
        const initials = (fullName !== 'Unknown' ? fullName : 'A').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
        const tr = document.createElement('tr');
        const tdInfo = document.createElement('td');
        const prodDiv = document.createElement('div'); prodDiv.className = 'table-product';
        const avatar = document.createElement('div');
        avatar.className = 'avatar'; avatar.style.cssText = 'width:40px;height:40px;font-size:0.8rem;';
        avatar.textContent = initials;
        const infoDiv = document.createElement('div');
        const nameB = document.createElement('b'); nameB.textContent = fullName;
        const sinceSpan = document.createElement('span'); sinceSpan.textContent = 'Since ' + formatDate(c.createdAt);
        infoDiv.appendChild(nameB); infoDiv.appendChild(sinceSpan);
        prodDiv.appendChild(avatar); prodDiv.appendChild(infoDiv); tdInfo.appendChild(prodDiv);
        const tdEmail = document.createElement('td'); tdEmail.textContent = c.email || '';
        const tdPhone = document.createElement('td'); tdPhone.textContent = '+91 ' + (c.phone || '');
        // Customer type cell with change control (confirmation required)
        const tdType = document.createElement('td');
        const typeSelect = document.createElement('select');
        typeSelect.className = 'form-control';
        typeSelect.style.cssText = 'width:110px;padding:4px 8px;font-size:0.75rem;';
        const optRetail = document.createElement('option');
        optRetail.value = 'retail';
        optRetail.textContent = 'Retail';
        const optWholesale = document.createElement('option');
        optWholesale.value = 'wholesale';
        optWholesale.textContent = 'Wholesale';
        typeSelect.appendChild(optRetail);
        typeSelect.appendChild(optWholesale);
        typeSelect.value = c.customerType || 'retail';
        typeSelect.dataset.customerId = c.id;
        typeSelect.addEventListener('change', () => {
          const newType = typeSelect.value;
          const oldType = c.customerType || 'retail';
          if (newType === oldType) return;
          const oldLabel = oldType === 'wholesale' ? 'Wholesale Customer' : 'Retail Customer';
          const newLabel = newType === 'wholesale' ? 'Wholesale Customer' : 'Retail Customer';
          showConfirm(
            `Change Customer Type?\n\nCustomer:\n${fullName}\n\n${oldLabel}\n     ↓\n${newLabel}`,
            async () => {
              try {
                await AdminAPI.customers.updateType(c.id, newType);
                c.customerType = newType;
                showToast('Customer type updated', `${fullName} is now ${newLabel}.`);
                // Reload the list from backend so the active tab reflects the change
                await applyCustomerFilters();
              } catch (e) {
                showToast('Error', safeError(e), 'error');
                typeSelect.value = oldType;
              }
            }
          );
          typeSelect.value = oldType;
        });
        tdType.appendChild(typeSelect);
        const tdOrders = document.createElement('td'); tdOrders.textContent = String(c.orderCount || 0);
        const tdSpent = document.createElement('td'); tdSpent.textContent = formatINR(c.totalSpent || 0);
        const tdStatus = document.createElement('td');
        const pill = document.createElement('span');
        pill.className = 'stock-pill ' + (c.status === 'active' ? 'stock-in' : 'stock-out');
        pill.textContent = c.status === 'active' ? 'Active' : 'Inactive';
        tdStatus.appendChild(pill);
        // Actions cell: View details
        const tdActions = document.createElement('td');
        const actDiv = document.createElement('div'); actDiv.className = 'table-actions';
        const viewBtn = document.createElement('button');
        viewBtn.className = 'action-btn view';
        viewBtn.title = 'View Details';
        viewBtn.dataset.viewCustomer = c.id;
        viewBtn.innerHTML = '<i class="fas fa-eye"></i>';
        actDiv.appendChild(viewBtn);
        tdActions.appendChild(actDiv);
        [tdInfo,tdEmail,tdPhone,tdType,tdOrders,tdSpent,tdStatus,tdActions].forEach(td => tr.appendChild(td));
        tbody.appendChild(tr);
      });

      // View details handlers
      tbody.querySelectorAll('[data-view-customer]').forEach(btn => {
        btn.addEventListener('click', () => {
          const customer = currentCustomers.find(cust => String(cust.id) === String(btn.dataset.viewCustomer));
          if (customer) openCustomerDetails(customer);
        });
      });
    }

    // Combined filter: search + status applied client-side on the backend-filtered list
    async function applyCustomerFilters() {
      try {
        const customers = await loadCustomers();
        const q = searchInput ? searchInput.value.trim().toLowerCase() : '';
        const status = statusFilter ? statusFilter.value : 'all';
        let filtered = customers;
        if (status && status !== 'all') {
          filtered = filtered.filter(c => (c.status || 'active') === status);
        }
        if (q) {
          filtered = filtered.filter(c =>
            (c.name || '').toLowerCase().includes(q) ||
            (c.email || '').toLowerCase().includes(q) ||
            (c.phone || '').includes(q)
          );
        }
        renderCustomers(filtered);
      } catch (e) {
        showToast('Error', safeError(e), 'error');
      }
    }

    // Wire customer type tabs (backend filtering)
    if (tabs.length) {
      tabs.forEach(tab => {
        if (tab.dataset.tabBound) return;
        tab.dataset.tabBound = '1';
        tab.addEventListener('click', () => {
          tabs.forEach(t => t.classList.remove('active'));
          tab.classList.add('active');
          activeType = tab.dataset.customerType || '';
          applyCustomerFilters();
        });
      });
    }

    if (searchInput && !searchInput.dataset.bound) {
      searchInput.dataset.bound = '1';
      searchInput.addEventListener('input', applyCustomerFilters);
    }
    if (statusFilter && !statusFilter.dataset.bound) {
      statusFilter.dataset.bound = '1';
      statusFilter.addEventListener('change', applyCustomerFilters);
    }

    // Initial load (All Customers)
    applyCustomerFilters();
  } catch (e) { showToast('Error', safeError(e), 'error'); }
}

/* ============ ADMIN RESELLERS (Phase 8) Helpers ============ */
let _acPct = 5;
let _arSel = null;
let _arTimer = null;

function modalSet(id, open) {
  const m = document.getElementById(id);
  if (!m) return;
  m.classList.toggle('open', open);
  m.setAttribute('aria-hidden', open ? 'false' : 'true');
}

async function copyReferralCode(code) {
  if (!code) return;
  try {
    await navigator.clipboard.writeText(String(code));
    showToast('Referral code copied', code);
  } catch (e) {
    try {
      const t = document.createElement('textarea');
      t.value = String(code);
      t.style.position = 'fixed';
      t.style.opacity = '0';
      document.body.appendChild(t);
      t.focus(); t.select();
      document.execCommand('copy');
      document.body.removeChild(t);
      showToast('Referral code copied', code);
    } catch (e2) {
      showToast('Error', 'Could not copy the referral code.', 'error');
    }
  }
}

async function loadEligibleResellerCustomers() {
  const listEl = document.getElementById('reseller-customer-list');
  const emptyEl = document.getElementById('reseller-customer-empty');
  const rateEl = document.getElementById('reseller-commission-rate');
  const searchEl = document.getElementById('reseller-customer-search');
  if (!listEl) return;
  const q = searchEl ? searchEl.value.trim() : '';
  listEl.textContent = '';
  const loading = document.createElement('div');
  loading.style.cssText = 'padding:8px 12px;color:var(--text-muted);font-size:0.8rem;';
  loading.textContent = 'Loading customers...';
  listEl.appendChild(loading);
  emptyEl.style.display = 'none';
  listEl.style.display = 'block';
  try {
    const data = await AdminAPI.resellers.eligibleCustomers({ limit: 20, ...(q ? { search: q } : {}) });
    if (rateEl && data && data.commissionPercent != null) {
      _acPct = data.commissionPercent;
      rateEl.value = String(data.commissionPercent);
    }
    const customers = (data && data.customers) || [];
    listEl.textContent = '';
    if (customers.length === 0) {
      listEl.style.display = 'none';
      emptyEl.style.display = 'block';
      return;
    }
    customers.forEach(c => {
      const item = document.createElement('div');
      item.className = 'reseller-customer-item';
      item.dataset.custId = c.id || c._id;
      item.dataset.custName = c.name || 'Unknown';
      const b = document.createElement('b'); b.textContent = c.name || 'Unknown';
      const span = document.createElement('span');
      const tel = c.phone ? ' · +91 ' + c.phone : '';
      span.textContent = (c.email ? c.email : '') + tel;
      item.appendChild(b); item.appendChild(span);
      item.addEventListener('click', () => {
        listEl.querySelectorAll('.reseller-customer-item').forEach(i => i.classList.remove('selected'));
        item.classList.add('selected');
        _arSel = { id: item.dataset.custId, name: item.dataset.custName };
      });
      listEl.appendChild(item);
    });
  } catch (e) {
    listEl.textContent = '';
    const err = document.createElement('div');
    err.style.cssText = 'padding:8px 12px;color:var(--danger);font-size:0.8rem;';
    err.textContent = 'Could not load customers.';
    listEl.appendChild(err);
  }
}
async function openResellerAddModal() {
  _arSel = null;
  const searchEl = document.getElementById('reseller-customer-search');
  const rateEl = document.getElementById('reseller-commission-rate');
  const codeEl = document.getElementById('reseller-ref-code');
  if (searchEl) searchEl.value = '';
  if (codeEl) codeEl.value = 'Auto-generated on activation';
  if (rateEl) rateEl.value = String(_acPct);
  await loadEligibleResellerCustomers();
  modalSet('reseller-add-modal', true);
}

async function openResellerViewModal(id) {
  const modal = document.getElementById('reseller-view-modal');
  if (!modal) return;
  try {
    const data = await AdminAPI.resellers.get(id);
    const r = data.reseller || data;
    const fullName = r.name || 'Unknown';
    const initials = (fullName !== 'Unknown' ? fullName : 'A').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
    const setEl = (elId, val) => { const el = document.getElementById(elId); if (el) el.textContent = val; };
    setEl('rv-avatar', initials);
    setEl('rv-name', fullName);
    setEl('rv-email', r.email || '—');
    setEl('rv-phone', r.phone ? '+91 ' + r.phone : '—');
    setEl('rv-code', r.referralCode || '—');
    const pill = document.getElementById('rv-status');
    const isActive = r.resellerStatus === 'active';
    if (pill) {
      pill.textContent = isActive ? 'Active' : 'Inactive';
      pill.className = 'stock-pill ' + (isActive ? 'stock-in' : 'stock-out');
    }
    setEl('rv-rate', _acPct + '% (system default)');
    setEl('rv-joined', r.createdAt ? formatDate(r.createdAt) : '—');
    setEl('rv-referred', String(r.referredCustomerCount || 0));
    setEl('rv-earned', formatINR(r.totalEarnedCommission || 0));
    setEl('rv-pending', formatINR(r.totalPendingCommission || 0));
    modalSet('reseller-view-modal', true);
  } catch (e) { showToast('Error', safeError(e), 'error'); }
}

function setupResellerModals() {
  const openBtn = document.getElementById('reseller-add-open');
  if (openBtn && !openBtn.dataset.bound) {
    openBtn.dataset.bound = '1';
    openBtn.addEventListener('click', () => openResellerAddModal());
  }
  const searchEl = document.getElementById('reseller-customer-search');
  if (searchEl && !searchEl.dataset.bound) {
    searchEl.dataset.bound = '1';
    searchEl.addEventListener('input', () => {
      clearTimeout(_arTimer);
      _arTimer = setTimeout(loadEligibleResellerCustomers, 300);
    });
  }
  const actBtn = document.getElementById('reseller-activate-btn');
  if (actBtn && !actBtn.dataset.bound) {
    actBtn.dataset.bound = '1';
    actBtn.addEventListener('click', () => {
      if (!_arSel) {
        showToast('Select a customer', 'Please select a customer to activate as a reseller.', 'error');
        return;
      }
      const name = _arSel.name;
      showConfirm(`Activate "${name}" as a reseller? A unique referral code will be generated by the backend.`, async () => {
        try {
          const data = await AdminAPI.resellers.activate(_arSel.id);
          const res = data.reseller || data;
          modalSet('reseller-add-modal', false);
          showToast('Reseller activated', res.referralCode ? `${name} is now active. Referral code ${res.referralCode}.` : `${name} is now an active reseller.`);
          initAdminResellers();
        } catch (e) { showToast('Error', safeError(e), 'error'); }
      });
    });
  }
}

/* ============ ADMIN RESELLERS (Phase 8) ============ */
async function initAdminResellers() {
  try {
    const tbody = document.querySelector('#admin-resellers .data-table tbody');
    if (!tbody) return;
    const searchInput = document.getElementById('reseller-search');
    const statusFilter = document.getElementById('reseller-status-filter');

    setupResellerModals();

    // Load summary KPI cards (live data, never hard-coded)
    try {
      const s = await AdminAPI.resellers.summary();
      if (s && typeof s.commissionPercent === 'number') _acPct = s.commissionPercent;
      const setTxt = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
      setTxt('summary-total-resellers', String(s ? s.totalResellers ?? 0 : 0));
      setTxt('summary-active-resellers', String(s ? s.activeResellers ?? 0 : 0));
      setTxt('summary-referred-customers', String(s ? s.referredCustomers ?? 0 : 0));
      setTxt('summary-earned', formatINR(s ? s.totalEarnedCommission || 0 : 0));
    } catch (e) { /* non-fatal */ }

    const filtersActive = () => !!((searchInput && searchInput.value.trim()) || (statusFilter && statusFilter.value !== 'all'));

    async function loadResellers() {
      const params = { limit: 50 };
      if (statusFilter && statusFilter.value !== 'all') params.status = statusFilter.value;
      if (searchInput && searchInput.value.trim()) params.search = searchInput.value.trim();
      const data = await AdminAPI.resellers.list(params);
      return data.resellers || [];
    }

    function renderResellers(resellers, filtered) {
      tbody.textContent = '';
      if (resellers.length === 0) {
        const tr = document.createElement('tr');
        const td = document.createElement('td');
        td.colSpan = 7;
        const box = document.createElement('div');
        box.style.cssText = 'text-align:center;padding:28px 16px;';
        const icon = document.createElement('div'); icon.style.fontSize = '2.5rem'; icon.textContent = '👥';
        const title = document.createElement('div');
        title.style.cssText = 'font-weight:600;margin:8px 0 4px;font-size:1rem;';
        title.textContent = filtered ? 'No resellers match your current filters.' : 'No Resellers Yet';
        const sub = document.createElement('div');
        sub.style.cssText = 'color:var(--text-muted);font-size:0.85rem;margin-bottom:14px;';
        sub.textContent = filtered ? 'Try adjusting your search or status filter.' : 'There are currently no resellers in the system.';
        const btn = document.createElement('button'); btn.className = 'btn btn-primary btn-sm';
        if (filtered) {
          btn.innerHTML = '<i class="fas fa-times"></i> Clear Filters';
          btn.addEventListener('click', () => {
            if (searchInput) searchInput.value = '';
            if (statusFilter) statusFilter.value = 'all';
            applyResellerFilters();
          });
        } else {
          btn.innerHTML = '<i class="fas fa-user-plus"></i> Activate Customer as Reseller';
          btn.addEventListener('click', () => openResellerAddModal());
        }
        box.appendChild(icon); box.appendChild(title); box.appendChild(sub); box.appendChild(btn);
        td.appendChild(box); tr.appendChild(td); tbody.appendChild(tr);
        return;
      }
      resellers.forEach(r => {
        const fullName = r.name || 'Unknown';
        const initials = (fullName !== 'Unknown' ? fullName : 'A').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
        const tr = document.createElement('tr');
        // Reseller cell
        const tdInfo = document.createElement('td');
        const prodDiv = document.createElement('div'); prodDiv.className = 'table-product';
        const avatar = document.createElement('div');
        avatar.className = 'avatar'; avatar.style.cssText = 'width:40px;height:40px;font-size:0.8rem;';
        avatar.textContent = initials;
        const infoDiv = document.createElement('div');
        const nameB = document.createElement('b'); nameB.textContent = fullName;
        const emailSpan = document.createElement('span'); emailSpan.textContent = r.email || '';
        const phoneSpan = document.createElement('span'); phoneSpan.textContent = r.phone ? '+91 ' + r.phone : '';
        infoDiv.appendChild(nameB); infoDiv.appendChild(emailSpan); infoDiv.appendChild(phoneSpan);
        prodDiv.appendChild(avatar); prodDiv.appendChild(infoDiv); tdInfo.appendChild(prodDiv);
        // Referral code cell
        const tdCode = document.createElement('td');
        const codeWrap = document.createElement('span'); codeWrap.className = 'reseller-code-cell';
        const codeB = document.createElement('b');
        codeB.style.letterSpacing = '0.05em';
        codeB.textContent = r.referralCode || '—';
        codeWrap.appendChild(codeB);
        if (r.referralCode) {
          const copyBtn = document.createElement('button');
          copyBtn.className = 'reseller-copy-btn'; copyBtn.title = 'Copy referral code';
          copyBtn.innerHTML = '<i class="fas fa-copy"></i>';
          copyBtn.addEventListener('click', (e) => { e.stopPropagation(); copyReferralCode(r.referralCode); });
          codeWrap.appendChild(copyBtn);
        }
        tdCode.appendChild(codeWrap);
        const tdCustomers = document.createElement('td');
        tdCustomers.textContent = String(r.referredCustomerCount || 0);
        const tdEarned = document.createElement('td');
        tdEarned.textContent = formatINR(r.totalEarnedCommission || 0);
        const tdPending = document.createElement('td');
        tdPending.textContent = formatINR(r.totalPendingCommission || 0);
        // Status cell
        const tdStatus = document.createElement('td');
        const pill = document.createElement('span');
        const isActive = r.resellerStatus === 'active';
        pill.className = 'stock-pill ' + (isActive ? 'stock-in' : 'stock-out');
        pill.textContent = isActive ? 'Active' : 'Inactive';
        tdStatus.appendChild(pill);
        // Actions cell
        const tdActions = document.createElement('td');
        const actDiv = document.createElement('div');
        actDiv.className = 'table-actions';
        const viewBtn = document.createElement('button');
        viewBtn.className = 'action-btn view'; viewBtn.title = 'View Reseller';
        viewBtn.dataset.viewReseller = r.id;
        viewBtn.innerHTML = '<i class="fas fa-eye"></i>';
        actDiv.appendChild(viewBtn);
        const toggleBtn = document.createElement('button');
        toggleBtn.dataset.toggleReseller = r.id;
        toggleBtn.dataset.name = fullName;
        if (isActive) {
          toggleBtn.className = 'action-btn delete';
          toggleBtn.title = 'Deactivate Reseller';
          toggleBtn.innerHTML = '<i class="fas fa-user-slash"></i>';
        } else {
          toggleBtn.className = 'action-btn view';
          toggleBtn.title = 'Activate Reseller';
          toggleBtn.innerHTML = '<i class="fas fa-user-check"></i>';
        }
        actDiv.appendChild(toggleBtn);
        tdActions.appendChild(actDiv);
        [tdInfo, tdCode, tdCustomers, tdEarned, tdPending, tdStatus, tdActions].forEach(td => tr.appendChild(td));
        tbody.appendChild(tr);
      });

      // View handlers
      tbody.querySelectorAll('[data-view-reseller]').forEach(btn => {
        btn.addEventListener('click', () => openResellerViewModal(btn.dataset.viewReseller));
      });

      // Toggle (activate/deactivate) handlers
      tbody.querySelectorAll('[data-toggle-reseller]').forEach(btn => {
        btn.addEventListener('click', () => {
          const id = btn.dataset.toggleReseller;
          const name = btn.dataset.name || 'this reseller';
          const isDeactivating = btn.title === 'Deactivate Reseller';
          if (isDeactivating) {
            showConfirm(`Deactivate Reseller?\n\n"${name}" will no longer be active for new referral/commission activity.\n\nExisting referral, order and commission history will remain unchanged.`, async () => {
              try {
                await AdminAPI.resellers.deactivate(id);
                showToast('Reseller deactivated', `${name} has been deactivated. Existing history is unchanged.`);
                initAdminResellers();
              } catch (e) { showToast('Error', safeError(e), 'error'); }
            });
          } else {
            showConfirm(`Activate Reseller?\n\nAre you sure you want to activate "${name}" as a reseller?`, async () => {
              try {
                const data = await AdminAPI.resellers.activate(id);
                const res = data.reseller || data;
                showToast('Reseller activated', res.referralCode ? `Referral code ${res.referralCode}.` : `${name} is now an active reseller.`);
                initAdminResellers();
              } catch (e) { showToast('Error', safeError(e), 'error'); }
            });
          }
        });
      });
    }

    // Filter: server-side search + status (reuse backend listResellers)
    async function applyResellerFilters() {
      try {
        const resellers = await loadResellers();
        renderResellers(resellers, filtersActive());
      } catch (e) {
        renderResellers([], filtersActive());
        showToast('Error', safeError(e), 'error');
      }
    }

    if (searchInput && !searchInput.dataset.bound) {
      searchInput.dataset.bound = '1';
      searchInput.addEventListener('input', applyResellerFilters);
    }
    if (statusFilter && !statusFilter.dataset.bound) {
      statusFilter.dataset.bound = '1';
      statusFilter.addEventListener('change', applyResellerFilters);
    }

    applyResellerFilters();
  } catch (e) { showToast('Error', safeError(e), 'error'); }
}

/* ============ ADMIN COMMISSIONS (Phase 8) ============ */
async function initAdminCommissions() {
  try {
    const data = await AdminAPI.commissions.list({ limit: 50 });
    const allCommissions = data.commissions || [];
    const tbody = document.querySelector('#admin-commissions .data-table tbody');
    const statusFilter = document.getElementById('commission-status-filter');

    function renderCommissions(commissions) {
      if (!tbody) return;
      tbody.textContent = '';
      if (commissions.length === 0) {
        const tr = document.createElement('tr');
        const td = document.createElement('td');
        td.colSpan = 8;
        td.style.textAlign = 'center';
        td.style.color = 'var(--text-muted)';
        td.textContent = 'No commission records found. Commissions are created when referred retail orders are delivered.';
        tr.appendChild(td);
        tbody.appendChild(tr);
        return;
      }
      commissions.forEach(c => {
        const tr = document.createElement('tr');
        const tdOrder = document.createElement('td');
        const b = document.createElement('b'); b.textContent = c.orderId || ''; tdOrder.appendChild(b);
        const tdReseller = document.createElement('td');
        tdReseller.textContent = (c.reseller && c.reseller.name) || 'Unknown';
        const tdCustomer = document.createElement('td');
        tdCustomer.textContent = (c.customer && c.customer.name) || 'Unknown';
        const tdBase = document.createElement('td');
        tdBase.textContent = formatINR(c.commissionBaseAmount || 0);
        const tdPct = document.createElement('td');
        tdPct.textContent = (c.commissionPercent || 0) + '%';
        const tdAmount = document.createElement('td');
        tdAmount.textContent = formatINR(c.commissionAmount || 0);
        const tdStatus = document.createElement('td');
        const pill = document.createElement('span');
        const cls = c.status === 'earned' ? 'stock-in' : c.status === 'pending' ? 'stock-low' : 'stock-out';
        pill.className = 'stock-pill ' + cls;
        pill.textContent = c.status === 'earned' ? 'Earned' : c.status === 'pending' ? 'Pending' : 'Cancelled';
        tdStatus.appendChild(pill);
        const tdDate = document.createElement('td');
        tdDate.textContent = formatDate(c.createdAt);
        [tdOrder, tdReseller, tdCustomer, tdBase, tdPct, tdAmount, tdStatus, tdDate].forEach(td => tr.appendChild(td));
        tbody.appendChild(tr);
      });
    }

    // Filter by status
    function applyCommissionFilters() {
      const status = statusFilter ? statusFilter.value : 'all';
      let filtered = allCommissions;
      if (status && status !== 'all') {
        filtered = filtered.filter(c => (c.status || 'earned') === status);
      }
      renderCommissions(filtered);
    }

    renderCommissions(allCommissions);

    if (statusFilter && !statusFilter.dataset.bound) {
      statusFilter.dataset.bound = '1';
      statusFilter.addEventListener('change', applyCommissionFilters);
    }
  } catch (e) { showToast('Error', safeError(e), 'error'); }
}

/* ============ ADMIN INVENTORY ============ */
async function initAdminInventory() {
  try {
    const tbody = document.querySelector('#admin-inventory .data-table tbody');

    // Category filter dropdown — populated dynamically from the existing
    // categories API. Names are NOT hard-coded; future categories auto-appear.
    const categoryFilter = document.getElementById('inventory-category-filter');
    if (categoryFilter && categoryFilter.options.length <= 1) {
      try {
        const catData = await AdminAPI.categories.list();
        (catData.categories || []).forEach(c => {
          const opt = document.createElement('option');
          opt.value = c.id || c._id;
          opt.textContent = c.name || '';
          categoryFilter.appendChild(opt);
        });
      } catch (e) { /* categories are optional — inventory still loads */ }
    }

    // Load inventory from the backend with the optional category filter applied
    // in MongoDB (GET /api/admin/inventory?category=<categoryId>).
    async function loadInventory() {
      const params = { limit: 50 };
      const category = categoryFilter ? categoryFilter.value : '';
      if (category) params.category = category;
      const data = await AdminAPI.inventory.list(params);
      renderInventory(data.inventory || []);
    }

    function renderInventory(items) {
      if (!tbody) return;
      tbody.textContent = '';
      if (items.length === 0) {
        const tr = document.createElement('tr');
        const td = document.createElement('td');
        td.colSpan = 5;
        td.style.textAlign = 'center';
        td.style.color = 'var(--text-muted)';
        td.textContent = (categoryFilter && categoryFilter.value)
          ? 'No products found in this category.'
          : 'No products found.';
        tr.appendChild(td);
        tbody.appendChild(tr);
        return;
      }
      items.forEach(i => {
        const currentStock = i.stock !== undefined ? i.stock : i.quantity;
        const stockStatus = i.stockStatus || (currentStock === 0 ? 'out_of_stock' : currentStock <= i.reorderLevel ? 'low_stock' : 'in_stock');
        const lastUpdated = i.updatedAt || i.lastUpdated;
        const tr = document.createElement('tr');
        // Product cell with thumbnail. Backend returns the image in the
        // `images` array for inventory products, matching the Admin Products page.
        const tdProd = document.createElement('td');
        const prodDiv = document.createElement('div'); prodDiv.className = 'table-product';
        const img = document.createElement('img');
        img.src = safeImg(i.mainImage || (i.images && i.images.length > 0 ? i.images[0] : '') || i.image || '');
        img.alt = '';
        const infoDiv = document.createElement('div');
        const nameB = document.createElement('b'); nameB.textContent = i.name || '';
        const skuSpan = document.createElement('span'); skuSpan.textContent = i.sku || '';
        infoDiv.appendChild(nameB); infoDiv.appendChild(skuSpan);
        prodDiv.appendChild(img); prodDiv.appendChild(infoDiv); tdProd.appendChild(prodDiv);
        // Stock cell
        const tdStock = document.createElement('td');
        const stockWrap = document.createElement('div'); stockWrap.style.cssText = 'display:flex;align-items:center;gap:8px;';
        const stockB = document.createElement('b');
        stockB.style.color = stockStatus === 'out_of_stock' ? 'var(--danger)' : stockStatus === 'low_stock' ? 'var(--warning)' : 'inherit';
        stockB.textContent = String(currentStock);
        const stockInput = document.createElement('input');
        stockInput.type = 'number'; stockInput.className = 'form-control';
        stockInput.style.cssText = 'width:70px;padding:4px 8px;font-size:0.75rem;';
        stockInput.value = '0'; stockInput.placeholder = '+/-';
        stockInput.dataset.stockInput = i.productId;
        const addBtn = document.createElement('button');
        addBtn.className = 'btn btn-sm btn-primary'; addBtn.dataset.updateStock = i.productId;
        addBtn.textContent = 'Add';
        stockWrap.appendChild(stockB); stockWrap.appendChild(stockInput); stockWrap.appendChild(addBtn);
        tdStock.appendChild(stockWrap);
        const tdPill = document.createElement('td'); tdPill.innerHTML = getStockPill(stockStatus);
        const tdReorder = document.createElement('td'); tdReorder.textContent = String(i.reorderLevel);
        const tdDate = document.createElement('td'); tdDate.textContent = formatDate(lastUpdated);
        [tdProd,tdStock,tdPill,tdReorder,tdDate].forEach(td => tr.appendChild(td));
        tbody.appendChild(tr);
      });

      // Stock update handlers
      tbody.querySelectorAll('[data-update-stock]').forEach(btn => {
        btn.addEventListener('click', async () => {
          const input = tbody.querySelector(`[data-stock-input="${btn.dataset.updateStock}"]`);
          const qty = parseInt(input.value);
          if (isNaN(qty) || qty === 0) {
            showToast('Error', 'Please enter a non-zero quantity to add or remove.', 'error');
            return;
          }
          try {
            await AdminAPI.inventory.update(btn.dataset.updateStock, { stock: qty });
            showToast('Stock updated', `Stock ${qty > 0 ? 'increased' : 'decreased'} by ${Math.abs(qty)}.`);
            initAdminInventory();
          } catch (e) { showToast('Error', safeError(e), 'error'); }
        });
      });
    }

    // Re-render whenever the selected category changes
    if (categoryFilter && !categoryFilter.dataset.inventoryBound) {
      categoryFilter.dataset.inventoryBound = '1';
      categoryFilter.addEventListener('change', () => {
        try { loadInventory(); } catch (e) { showToast('Error', safeError(e), 'error'); }
      });
    }

    await loadInventory();
  } catch (e) { showToast('Error', safeError(e), 'error'); }
}

/* ============ ADMIN REPORTS ============ */
async function initAdminReports() {
  const periodSelect = document.getElementById('report-period');
  const fromInput = document.getElementById('report-from');
  const toInput = document.getElementById('report-to');
  const yearSelect = document.getElementById('report-year');
  const categorySelect = document.getElementById('report-category');
  const customerTypeSelect = document.getElementById('report-customer-type');
  const statusSelect = document.getElementById('report-status');
  const applyBtn = document.getElementById('report-apply');
  const resetBtn = document.getElementById('report-reset');
  const csvBtn = document.getElementById('report-download-csv');
  const pdfBtn = document.getElementById('report-download-pdf');
  const loadingEl = document.getElementById('report-loading');
  const errorEl = document.getElementById('report-error');
  const errorMsgEl = document.getElementById('report-error-msg');
  const contentEl = document.getElementById('report-content');
  const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  let currentReport = null;
  let currentParams = {};

  // Populate year dropdown (last 5 years + current)
  if (yearSelect && yearSelect.options.length <= 1) {
    const currentYear = new Date().getFullYear();
    for (let y = currentYear; y >= currentYear - 5; y--) {
      const opt = document.createElement('option');
      opt.value = String(y);
      opt.textContent = String(y);
      yearSelect.appendChild(opt);
    }
  }

  // Populate category dropdown
  if (categorySelect && categorySelect.options.length <= 1) {
    try {
      const cats = await AdminAPI.categories.list();
      (cats.categories || []).forEach(c => {
        const opt = document.createElement('option');
        opt.value = c.id || c._id;
        opt.textContent = c.name;
        categorySelect.appendChild(opt);
      });
    } catch (e) { /* silent */ }
  }

  function buildParams() {
    const params = {};
    const period = periodSelect ? periodSelect.value : 'this_month';
    if (period === 'custom') {
      if (fromInput && fromInput.value) params.from = fromInput.value;
      if (toInput && toInput.value) params.to = toInput.value;
    } else {
      params.period = period;
    }
    if (yearSelect && yearSelect.value) params.year = yearSelect.value;
    if (categorySelect && categorySelect.value) params.category = categorySelect.value;
    if (customerTypeSelect && customerTypeSelect.value) params.customerType = customerTypeSelect.value;
    if (statusSelect && statusSelect.value) params.status = statusSelect.value;
    return params;
  }

  function showLoading() {
    if (loadingEl) loadingEl.style.display = 'block';
    if (errorEl) errorEl.style.display = 'none';
    if (contentEl) contentEl.style.display = 'none';
  }

  function showError(msg) {
    if (loadingEl) loadingEl.style.display = 'none';
    if (errorEl) errorEl.style.display = 'block';
    if (errorMsgEl) errorMsgEl.textContent = msg || 'Unable to load report data.';
    if (contentEl) contentEl.style.display = 'none';
  }

  function showContent() {
    if (loadingEl) loadingEl.style.display = 'none';
    if (errorEl) errorEl.style.display = 'none';
    if (contentEl) contentEl.style.display = 'block';
  }

  function renderKPIs(summary) {
    const kpiGrid = document.getElementById('report-kpis');
    if (!kpiGrid) return;
    const values = [
      formatINR(summary.totalSales || 0),
      String(summary.totalOrders || 0),
      String(summary.productsSold || 0),
      formatINR(summary.averageOrderValue || 0),
      formatINR(summary.totalDiscounts || 0),
      formatINR(summary.netSales || 0)
    ];
    const cards = kpiGrid.querySelectorAll('.kpi-card');
    cards.forEach((card, i) => {
      const b = card.querySelector('b');
      if (b) b.textContent = values[i] || '0';
    });
  }

  function renderMonthlyChart(monthly) {
    const chartBox = document.getElementById('report-monthly-chart');
    if (!chartBox) return;
    chartBox.textContent = '';
    chartBox.style.flexDirection = 'column';
    chartBox.style.alignItems = 'stretch';

    if (!monthly || monthly.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'report-empty-state';
      const icon = document.createElement('i');
      icon.className = 'fas fa-chart-bar';
      const p = document.createElement('p');
      p.textContent = 'No sales data for the selected period';
      empty.appendChild(icon);
      empty.appendChild(p);
      chartBox.appendChild(empty);
      return;
    }

    const maxVal = Math.max(...monthly.map(m => m.revenue || 0), 1);
    const chartWrap = document.createElement('div');
    chartWrap.className = 'report-chart-wrap';
    monthly.forEach(m => {
      const barDiv = document.createElement('div');
      barDiv.className = 'report-bar-col';
      const bar = document.createElement('div');
      bar.className = 'bar report-bar';
      const pct = Math.max(4, Math.round((m.revenue || 0) / maxVal * 100));
      bar.style.height = pct + '%';
      bar.title = monthNames[(m.month - 1) % 12] + ' ' + (m.year || '') + ': ' + formatINR(m.revenue || 0);
      const val = document.createElement('span');
      val.className = 'report-bar-value';
      val.textContent = formatINR(m.revenue || 0);
      const lbl = document.createElement('span');
      lbl.className = 'bar-label';
      lbl.textContent = monthNames[(m.month - 1) % 12] || '';
      barDiv.appendChild(bar);
      barDiv.appendChild(val);
      barDiv.appendChild(lbl);
      chartWrap.appendChild(barDiv);
    });
    chartBox.appendChild(chartWrap);
  }

  function renderCategoryTable(categories) {
    const tbody = document.querySelector('#report-category-table tbody');
    if (!tbody) return;
    if (!categories || categories.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" class="report-empty-cell">No sales data for the selected period</td></tr>';
      return;
    }
    tbody.innerHTML = categories.map(c => `
      <tr>
        <td><b>${escapeHTML(c.category)}</b></td>
        <td>${c.productsSold || 0}</td>
        <td>${c.orderCount || 0}</td>
        <td class="report-amount">${formatINR(c.sales || 0)}</td>
        <td class="report-amount">${formatINR(c.discount || 0)}</td>
      </tr>
    `).join('');
  }

  function renderRetailWholesale(rw) {
    const tbody = document.querySelector('#report-rw-table tbody');
    if (!tbody) return;
    const retailOrders = (rw && rw.retail && rw.retail.orderCount) || 0;
    const wholesaleOrders = (rw && rw.wholesale && rw.wholesale.orderCount) || 0;
    if (!rw || (retailOrders === 0 && wholesaleOrders === 0)) {
      tbody.innerHTML = '<tr><td colspan="5" class="report-empty-cell">No retail/wholesale sales for the selected period</td></tr>';
      return;
    }
    tbody.innerHTML = `
      <tr>
        <td><span class="report-badge report-badge-retail">Retail</span></td>
        <td>${rw.retail.orderCount || 0}</td>
        <td>${rw.retail.productsSold || 0}</td>
        <td class="report-amount">${formatINR(rw.retail.sales || 0)}</td>
        <td class="report-amount">${formatINR(rw.retail.discounts || 0)}</td>
      </tr>
      <tr>
        <td><span class="report-badge report-badge-wholesale">Wholesale</span></td>
        <td>${rw.wholesale.orderCount || 0}</td>
        <td>${rw.wholesale.productsSold || 0}</td>
        <td class="report-amount">${formatINR(rw.wholesale.sales || 0)}</td>
        <td class="report-amount">${formatINR(rw.wholesale.discounts || 0)}</td>
      </tr>
    `;
  }

  function renderTopProducts(products) {
    const tbody = document.querySelector('#report-top-products-table tbody');
    if (!tbody) return;
    if (!products || products.length === 0) {
      tbody.innerHTML = '<tr><td colspan="4" class="report-empty-cell">No sales data for the selected period</td></tr>';
      return;
    }
    tbody.innerHTML = products.map((p, i) => `
      <tr>
        <td><span class="report-rank">${i + 1}</span></td>
        <td><b>${escapeHTML(p.productName)}</b></td>
        <td>${p.quantitySold || 0}</td>
        <td class="report-amount">${formatINR(p.revenue || 0)}</td>
      </tr>
    `).join('');
  }

  function renderOrderStatus(statuses) {
    const tbody = document.querySelector('#report-status-table tbody');
    if (!tbody) return;
    if (!statuses || statuses.length === 0) {
      tbody.innerHTML = '<tr><td colspan="2" class="report-empty-cell">No orders for the selected period</td></tr>';
      return;
    }
    const statusClassMap = {
      pending: 'report-status-pending',
      confirmed: 'report-status-confirmed',
      packed: 'report-status-packed',
      delivered: 'report-status-delivered',
      cancelled: 'report-status-cancelled'
    };
    tbody.innerHTML = statuses.map(s => `
      <tr>
        <td><span class="report-badge ${statusClassMap[s.status] || 'report-status-pending'}">${escapeHTML(s.status)}</span></td>
        <td><b>${s.count || 0}</b></td>
      </tr>
    `).join('');
  }

  function renderDiscountAnalysis(discount) {
    const tbody = document.querySelector('#report-discount-table tbody');
    if (!tbody) return;
    if (!discount) {
      tbody.innerHTML = '<tr><td colspan="2" class="report-empty-cell">No discount data for the selected period</td></tr>';
      return;
    }
    const total = discount.totalDiscount || 0;
    const hasAny = (discount.categoryDiscount || 0) + (discount.secondOrderDiscount || 0) + (discount.membershipDiscount || 0) + (discount.wholesaleDiscount || 0) + (discount.referralDiscount || 0) > 0;
    if (!hasAny) {
      tbody.innerHTML = '<tr><td colspan="2" class="report-empty-cell">No discounts applied for the selected period</td></tr>';
      return;
    }
    tbody.innerHTML = `
      <tr><td>Category Discount</td><td class="report-amount">${formatINR(discount.categoryDiscount || 0)}</td></tr>
      <tr><td>Second Order Discount</td><td class="report-amount">${formatINR(discount.secondOrderDiscount || 0)}</td></tr>
      <tr><td>Membership Discount</td><td class="report-amount">${formatINR(discount.membershipDiscount || 0)}</td></tr>
      <tr><td>Wholesale Discount</td><td class="report-amount">${formatINR(discount.wholesaleDiscount || 0)}</td></tr>
      <tr><td>Referral Discount</td><td class="report-amount">${formatINR(discount.referralDiscount || 0)}</td></tr>
      <tr class="report-total-row"><td><b>Total Discount</b></td><td class="report-amount"><b>${formatINR(total)}</b></td></tr>
    `;
  }

  function renderReseller(reseller) {
    const tbody = document.querySelector('#report-reseller-table tbody');
    if (!tbody) return;
    const hasActivity = reseller && ((reseller.referredOrders || 0) > 0 || (reseller.totalCommission || 0) > 0 || (reseller.earnedCommission || 0) > 0 || (reseller.pendingCommission || 0) > 0);
    if (!reseller || !hasActivity) {
      tbody.innerHTML = '<tr><td colspan="2" class="report-empty-cell">No reseller/referral activity for the selected period</td></tr>';
      return;
    }
    tbody.innerHTML = `
      <tr><td>Referred Orders</td><td><b>${reseller.referredOrders || 0}</b></td></tr>
      <tr><td>Referred Sales</td><td class="report-amount">${formatINR(reseller.referredSales || 0)}</td></tr>
      <tr><td>Referral Discounts</td><td class="report-amount">${formatINR(reseller.referralDiscounts || 0)}</td></tr>
      <tr><td>Total Commission</td><td class="report-amount">${formatINR(reseller.totalCommission || 0)}</td></tr>
      <tr><td>Earned Commission</td><td class="report-amount">${formatINR(reseller.earnedCommission || 0)}</td></tr>
      <tr><td>Pending Commission</td><td class="report-amount">${formatINR(reseller.pendingCommission || 0)}</td></tr>
      <tr><td>Cancelled Commission</td><td class="report-amount">${formatINR(reseller.cancelledCommission || 0)}</td></tr>
    `;
  }

  async function loadReport() {
    showLoading();
    try {
      const params = buildParams();
      currentParams = params;
      const salesData = await AdminAPI.reports.sales(params);
      currentReport = salesData;
      // Populate the Order Status dropdown once from the server's valid statuses.
      if (statusSelect && statusSelect.options.length <= 1 && Array.isArray(salesData.statuses)) {
        salesData.statuses.forEach(st => {
          const opt = document.createElement('option');
          opt.value = st;
          opt.textContent = st.charAt(0).toUpperCase() + st.slice(1);
          statusSelect.appendChild(opt);
        });
      }
      renderKPIs(salesData.summary || {});
      renderMonthlyChart(salesData.monthly || []);
      renderCategoryTable(salesData.categories || []);
      renderRetailWholesale(salesData.retailWholesale || {});
      renderTopProducts(salesData.topProducts || []);
      renderOrderStatus(salesData.orderStatus || []);
      renderDiscountAnalysis(salesData.discountAnalysis || {});
      renderReseller(salesData.reseller || {});
      showContent();
    } catch (e) {
      showError(safeError(e));
    }
  }

  // Apply button
  if (applyBtn && !applyBtn.dataset.bound) {
    applyBtn.dataset.bound = '1';
    applyBtn.addEventListener('click', loadReport);
  }

  // Reset button
  if (resetBtn && !resetBtn.dataset.bound) {
    resetBtn.dataset.bound = '1';
    resetBtn.addEventListener('click', () => {
      if (periodSelect) periodSelect.value = 'this_month';
      if (fromInput) fromInput.value = '';
      if (toInput) toInput.value = '';
      if (yearSelect) yearSelect.value = '';
      if (categorySelect) categorySelect.value = '';
      if (customerTypeSelect) customerTypeSelect.value = '';
      if (statusSelect) statusSelect.value = '';
      const dateRange = document.getElementById('report-date-range');
      if (dateRange) dateRange.style.display = 'none';
      loadReport();
    });
  }

  // Period change: show/hide custom date inputs
  if (periodSelect && !periodSelect.dataset.periodBound) {
    periodSelect.dataset.periodBound = '1';
    periodSelect.addEventListener('change', () => {
      const isCustom = periodSelect.value === 'custom';
      const dateRange = document.getElementById('report-date-range');
      if (dateRange) dateRange.style.display = isCustom ? '' : 'none';
      if (!isCustom) loadReport();
    });
  }

  // CSV export
  if (csvBtn && !csvBtn.dataset.bound) {
    csvBtn.dataset.bound = '1';
    csvBtn.addEventListener('click', async () => {
      try {
        const qs = new URLSearchParams(currentParams).toString();
        const url = API_BASE + '/admin/reports/export/csv' + (qs ? `?${qs}` : '');
        const token = getAdminToken();
        const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
        if (!res.ok) throw new Error('Export failed');
        const blob = await res.blob();
        const objectUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = objectUrl;
        a.download = 'sales-report.csv';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(objectUrl);
        showToast('Downloaded', 'Sales report downloaded as CSV.');
      } catch (e) {
        showToast('Error', 'Failed to generate CSV export.', 'error');
      }
    });
  }

  // PDF export
  if (pdfBtn && !pdfBtn.dataset.bound) {
    pdfBtn.dataset.bound = '1';
    pdfBtn.addEventListener('click', async () => {
      try {
        const qs = new URLSearchParams(currentParams).toString();
        const url = API_BASE + '/admin/reports/export/pdf' + (qs ? `?${qs}` : '');
        const token = getAdminToken();
        const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
        if (!res.ok) throw new Error('Export failed');
        const blob = await res.blob();
        const objectUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = objectUrl;
        a.download = 'sales-report.pdf';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(objectUrl);
        showToast('Downloaded', 'Sales report downloaded as PDF.');
      } catch (e) {
        showToast('Error', 'Export to PDF failed.', 'error');
      }
    });
  }

  // Initial load
  loadReport();
}

/* ============ ADMIN REVIEWS ============ */
async function initAdminReviews() {
  try {
    const data = await AdminAPI.reviews.list({ limit: 50 });
    const tbody = document.querySelector('#admin-reviews .data-table tbody');
    if (tbody) {
      tbody.textContent = '';
      // Filter out hidden reviews (backend hides instead of hard-deleting)
      const visibleReviews = (data.reviews || []).filter(r => r.status !== 'hidden');
      if (visibleReviews.length === 0) {
        const tr = document.createElement('tr');
        const td = document.createElement('td');
        td.colSpan = 6;
        td.style.textAlign = 'center';
        td.style.color = 'var(--text-muted)';
        td.textContent = 'No reviews found';
        tr.appendChild(td);
        tbody.appendChild(tr);
        return;
      }
      visibleReviews.forEach(r => {
        const tr = document.createElement('tr');
        const tdName = document.createElement('td'); const nb = document.createElement('b'); nb.textContent = (r.customer && r.customer.name) || r.fullName || 'Anonymous'; tdName.appendChild(nb);
        const tdProd = document.createElement('td'); tdProd.textContent = (r.product && r.product.name) || r.productName || '';
        const tdStars = document.createElement('td'); tdStars.textContent = '★'.repeat(r.rating) + '☆'.repeat(5 - r.rating);
        const tdText = document.createElement('td'); tdText.textContent = r.comment || r.reviewText || '';
        const tdDate = document.createElement('td'); tdDate.textContent = formatDate(r.createdAt);
        const tdAct = document.createElement('td');
        const actDiv = document.createElement('div'); actDiv.className = 'table-actions';
        const delBtn = document.createElement('button'); delBtn.className = 'action-btn delete'; delBtn.title = 'Delete';
        delBtn.dataset.deleteReview = r.id; delBtn.dataset.name = (r.customer && r.customer.name) || r.fullName || 'Review';
        delBtn.innerHTML = '<i class="fas fa-trash"></i>';
        actDiv.appendChild(delBtn); tdAct.appendChild(actDiv);
        [tdName,tdProd,tdStars,tdText,tdDate,tdAct].forEach(td => tr.appendChild(td));
        tbody.appendChild(tr);
      });

      // Delete handlers
      tbody.querySelectorAll('[data-delete-review]').forEach(btn => {
        btn.addEventListener('click', () => {
          const reviewerName = btn.dataset.name || 'Review';
          showConfirm(`Delete review by "${reviewerName}"?`, async () => {
            try {
              await AdminAPI.reviews.remove(btn.dataset.deleteReview);
              showToast('Deleted', 'Review deleted.', 'warning');
              initAdminReviews();
            } catch (e) { showToast('Error', safeError(e), 'error'); }
          });
        });
      });
    }
  } catch (e) { showToast('Error', safeError(e), 'error'); }
}

/* ============ ADMIN CONTACT MESSAGES ============ */
async function initAdminContact() {
  try {
    const data = await AdminAPI.contact.list({ limit: 50 });
    const tbody = document.querySelector('#admin-contact .data-table tbody');
    if (tbody) {
      tbody.textContent = '';
      (data.messages || []).forEach(m => {
        const tr = document.createElement('tr');
        const tdN = document.createElement('td'); const nb = document.createElement('b'); nb.textContent = m.name || ''; tdN.appendChild(nb);
        const tdE = document.createElement('td'); tdE.textContent = m.email || '';
        const tdP = document.createElement('td'); tdP.textContent = m.phone || '';
        const tdS = document.createElement('td'); tdS.textContent = m.subject || '';
        const tdM = document.createElement('td'); tdM.textContent = m.message || '';
        const tdD = document.createElement('td'); tdD.textContent = formatDate(m.createdAt);
        const tdSel = document.createElement('td');
        const sel = document.createElement('select'); sel.className = 'form-control';
        sel.style.cssText = 'padding:4px 8px;font-size:0.75rem;'; sel.dataset.contactStatus = m.id || m._id;
        ['new','read','replied','closed'].forEach(v => {
          const opt = document.createElement('option'); opt.value = v;
          opt.textContent = v.charAt(0).toUpperCase() + v.slice(1);
          if (m.status === v) opt.selected = true; sel.appendChild(opt);
        });
        tdSel.appendChild(sel);
        const tdAct = document.createElement('td');
        const actDiv = document.createElement('div'); actDiv.className = 'table-actions';
        const delBtn = document.createElement('button'); delBtn.className = 'action-btn delete'; delBtn.title = 'Delete';
        delBtn.dataset.deleteContact = m.id || m._id; delBtn.dataset.name = m.name || '';
        delBtn.innerHTML = '<i class="fas fa-trash"></i>';
        actDiv.appendChild(delBtn); tdAct.appendChild(actDiv);
        [tdN,tdE,tdP,tdS,tdM,tdD,tdSel,tdAct].forEach(td => tr.appendChild(td));
        tbody.appendChild(tr);
      });

      // Status update handlers
      tbody.querySelectorAll('[data-contact-status]').forEach(select => {
        select.addEventListener('change', async () => {
          if (select.disabled) return;
          const previousValue = select.dataset.previousStatus || select.querySelector('option:checked').value;
          select.disabled = true;
          try {
            await AdminAPI.contact.update(select.dataset.contactStatus, { status: select.value });
            showToast('Status updated', `Message marked as ${select.value}.`);
            select.dataset.previousStatus = select.value;
          } catch (e) {
            showToast('Error', safeError(e), 'error');
            // Restore previous value so the dropdown does not show an unsaved status
            select.value = previousValue;
          } finally {
            select.disabled = false;
          }
        });
        select.dataset.previousStatus = select.value;
      });

      // Delete handlers
      tbody.querySelectorAll('[data-delete-contact]').forEach(btn => {
        btn.addEventListener('click', () => {
          const senderName = btn.dataset.name || 'this sender';
          showConfirm(`Delete message from "${senderName}"?`, async () => {
            try {
              await AdminAPI.contact.remove(btn.dataset.deleteContact);
              showToast('Deleted', 'Message deleted.', 'warning');
              initAdminContact();
            } catch (e) { showToast('Error', safeError(e), 'error'); }
          });
        });
      });
    }
  } catch (e) { showToast('Error', safeError(e), 'error'); }
}

/* ============ ADMIN COMBOS ============ */
async function initAdminCombos() {
  try {
    const data = await AdminAPI.combos.list();
    const tbody = document.querySelector('#admin-combos .data-table tbody');
    if (tbody) {
      tbody.textContent = '';
      (data.combos || []).forEach(c => {
        const tr = document.createElement('tr');
        const tdN = document.createElement('td'); const nb = document.createElement('b'); nb.textContent = c.name || ''; tdN.appendChild(nb);
        const tdP = document.createElement('td'); tdP.textContent = formatINR(c.price);
        const tdD = document.createElement('td'); tdD.textContent = (c.discount || 0) + '%';
        const tdI = document.createElement('td'); tdI.textContent = (c.items ? c.items.length : 0) + ' items';
        // --- Status column: current status + Activate/Deactivate control ---
        const tdS = document.createElement('td');
        const statusWrap = document.createElement('div');
        statusWrap.style.cssText = 'display:flex; flex-direction:column; gap:6px; align-items:flex-start;';
        const pill = document.createElement('span');
        pill.className = 'stock-pill ' + (c.status === 'active' ? 'stock-in' : 'stock-out');
        pill.textContent = c.status === 'active' ? '🟢 Active' : '🔴 Inactive';
        statusWrap.appendChild(pill);
        const statusBtn = document.createElement('button');
        statusBtn.type = 'button';
        statusBtn.className = 'btn btn-sm ' + (c.status === 'active' ? 'btn-ghost' : 'btn-outline');
        statusBtn.textContent = c.status === 'active' ? 'Deactivate' : 'Activate';
        statusBtn.dataset.statusToggleCombo = c.id;
        statusBtn.dataset.status = c.status;
        statusBtn.dataset.name = c.name || '';
        statusWrap.appendChild(statusBtn);
        tdS.appendChild(statusWrap);
        // --- Actions column: Edit / View / Delete ---
        const tdAct = document.createElement('td');
        const actDiv = document.createElement('div'); actDiv.className = 'table-actions';
        const editBtn = document.createElement('button'); editBtn.className = 'action-btn edit'; editBtn.title = 'Edit Combo';
        editBtn.dataset.editCombo = c.id; editBtn.innerHTML = '<i class="fas fa-edit"></i>';
        const viewBtn = document.createElement('button'); viewBtn.className = 'action-btn view'; viewBtn.title = 'View Combo';
        viewBtn.dataset.viewCombo = c.id; viewBtn.innerHTML = '<i class="fas fa-eye"></i>';
        const delBtn = document.createElement('button'); delBtn.className = 'action-btn delete'; delBtn.title = 'Deactivate Combo';
        delBtn.dataset.deleteCombo = c.id; delBtn.dataset.name = c.name || '';
        delBtn.innerHTML = '<i class="fas fa-trash"></i>';
        actDiv.appendChild(editBtn);
        actDiv.appendChild(viewBtn);
        actDiv.appendChild(delBtn); tdAct.appendChild(actDiv);
        [tdN,tdP,tdD,tdI,tdS,tdAct].forEach(td => tr.appendChild(td));
        tbody.appendChild(tr);
      });

      bindComboActions(tbody);
    }

    // Add-new combo button opens a blank editor.
    const addBtn = document.getElementById('combo-add-btn');
    if (addBtn && !addBtn.dataset.bound) {
      addBtn.dataset.bound = '1';
      addBtn.addEventListener('click', () => openComboEditor(null));
    }
  } catch (e) { showToast('Error', safeError(e), 'error'); }
}

function bindComboActions(tbody) {
  if (!tbody) return;

  // Edit handler — opens the existing Combo editor (does not change status).
  tbody.querySelectorAll('[data-edit-combo]').forEach(btn => {
    btn.addEventListener('click', () => openComboEditor(btn.dataset.editCombo));
  });

  // View handler — STRICTLY read-only. Shows the Combo details modal.
  // It NEVER activates/deactivates and makes no database changes.
  tbody.querySelectorAll('[data-view-combo]').forEach(btn => {
    btn.addEventListener('click', () => openComboView(btn.dataset.viewCombo));
  });

  // Status control lives in the STATUS column. Confirmation + existing status
  // update API are used; the backend remains the final authority.
  tbody.querySelectorAll('[data-status-toggle-combo]').forEach(btn => {
    btn.addEventListener('click', () => {
      const comboName = btn.dataset.name || 'this combo';
      const newStatus = btn.dataset.status === 'active' ? 'inactive' : 'active';
      const verb = newStatus === 'active' ? 'Activate' : 'Deactivate';
      showConfirm(`${verb} combo "${comboName}"?`, async () => {
        try {
          await AdminAPI.combos.update(btn.dataset.statusToggleCombo, { status: newStatus });
          showToast('Updated', `Combo "${comboName}" is now ${newStatus}.`);
          initAdminCombos();
        } catch (e) { showToast('Error', safeError(e), 'error'); }
      });
    });
  });

  // Delete handler (deactivates — existing behaviour, preserves the record)
  tbody.querySelectorAll('[data-delete-combo]').forEach(btn => {
    btn.addEventListener('click', () => {
      const comboName = btn.dataset.name || 'this combo';
      showConfirm(`Deactivate combo "${comboName}"? It can be reactivated later.`, async () => {
        try {
          await AdminAPI.combos.remove(btn.dataset.deleteCombo);
          showToast('Deactivated', `Combo "${comboName}" has been deactivated.`, 'warning');
          initAdminCombos();
        } catch (e) { showToast('Error', safeError(e), 'error'); }
      });
    });
  });
}

/**
 * Open the read-only Combo details modal (Eye / View action).
 * Fetch the combo from the existing Admin Combo API and display it.
 * No status change and no PUT request are issued.
 */
async function openComboView(comboId) {
  const modal = document.getElementById('combo-view-modal');
  if (!modal) return;
  try {
    const res = await AdminAPI.combos.get(comboId);
    const c = res.combo || res;
    const img = typeof resolveImg === 'function' ? resolveImg(c.image || '') : (c.image || '');
    const imgEl = modal.querySelector('#cv-img');
    imgEl.src = img || '';
    imgEl.style.display = img ? '' : 'none';
    modal.querySelector('#cv-name').textContent = c.name || '';
    modal.querySelector('#cv-status').textContent = c.status === 'active' ? '🟢 Active' : '🔴 Inactive';
    modal.querySelector('#cv-price').textContent = formatINR(c.price);
    modal.querySelector('#cv-discount').textContent = (c.discount || 0) + '%';
    const itemList = c.items || [];
    modal.querySelector('#cv-items').textContent = itemList.length ? (itemList.length + ' items') : '—';
    modal.querySelector('#cv-desc').textContent = c.description || '—';
    const prodWrap = modal.querySelector('#cv-products');
    prodWrap.textContent = '';
    if (itemList.length > 0) {
      itemList.forEach((it, i) => {
        const row = document.createElement('div');
        row.style.cssText = 'display:flex; justify-content:space-between; gap:12px; padding:6px 10px; background:var(--off-white); border-radius:6px;';
        const left = document.createElement('span');
        left.textContent = (i + 1) + '. ' + (it.name || 'Product');
        const qty = document.createElement('b');
        qty.textContent = 'Qty: ' + (it.quantity || 1);
        row.appendChild(left);
        row.appendChild(qty);
        prodWrap.appendChild(row);
      });
    } else {
      prodWrap.textContent = 'No products listed.';
    }
    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
  } catch (e) { showToast('Error', safeError(e), 'error'); }
}

async function openComboEditor(comboId) {
  const modal = document.getElementById('combo-modal');
  if (!modal) return;
  const form = document.getElementById('combo-form');
  const title = document.getElementById('combo-modal-title');
  const itemsContainer = document.getElementById('combo-editor-items');

  form.reset();
  form.dataset.editId = comboId || '';
  title.textContent = comboId ? 'Edit Combo' : 'Add Combo';
  modal.querySelector('#combo-status-select').value = 'active';
  itemsContainer.textContent = '';
  resetComboImageState();

  // Product catalog for the slot selects (all products so the admin can add a
  // product that may currently be inactive for a later re-activation).
  let products = [];
  try {
    products = ((await AdminAPI.products.list({ limit: 100 })).products || []);
  } catch (e) { products = []; }

  let combo = null;
  if (comboId) {
    try {
      combo = ((await AdminAPI.combos.get(comboId)).combo || null);
    } catch (e) { combo = null; }
  }

  if (combo) {
    form.querySelector('#combo-name-input').value = combo.name || '';
    form.querySelector('#combo-price-input').value = combo.price != null ? combo.price : '';
    form.querySelector('#combo-discount-input').value = combo.discount != null ? combo.discount : '';
    form.querySelector('#combo-status-select').value = combo.status || 'active';
    form.querySelector('#combo-desc-input').value = combo.description || '';
    // Preserve the existing image if present (optional on edit — admin may keep it).
    if (combo.image) {
      form.dataset.comboImage = combo.image;
      showComboImage(combo.image);
    }
    (combo.items || []).forEach(item => addComboEditorItem(products, item));
  } else {
    addComboEditorItem(products, null); // one empty slot for a new combo
  }

  modal.classList.add('open');
  modal.setAttribute('aria-hidden', 'false');
}
function comboProductLabel(p) {
  return (p.name || 'Product') + (p.status === 'inactive' ? ' (inactive)' : '');
}

function addComboEditorItem(products, item, container) {
  const wrap = container || document.getElementById('combo-editor-items');
  if (!wrap) return;
  const row = document.createElement('div');
  row.className = 'combo-editor-item';

  const select = document.createElement('select');
  select.className = 'form-control';
  const opt0 = document.createElement('option');
  opt0.value = ''; opt0.textContent = 'Select product';
  select.appendChild(opt0);
  (products || []).forEach(p => {
    const id = p.id || p._id;
    if (!id) return;
    const opt = document.createElement('option');
    opt.value = String(id);
    opt.textContent = comboProductLabel(p);
    const itemId = item && (item.productId || item.product);
    if (itemId && String(itemId) === String(id)) opt.selected = true;
    select.appendChild(opt);
  });

  const qty = document.createElement('input');
  qty.type = 'number'; qty.className = 'form-control'; qty.min = '1'; qty.step = '1';
  qty.value = item ? item.quantity : 1; qty.placeholder = 'Qty';

  const rm = document.createElement('button');
  rm.type = 'button'; rm.className = 'action-btn delete'; rm.title = 'Remove slot'; rm.innerHTML = '<i class="fas fa-times"></i>';
  rm.addEventListener('click', () => row.remove());

  row.appendChild(select);
  row.appendChild(qty);
  row.appendChild(rm);
  wrap.appendChild(row);
}

function comboEditorDefaultProducts(cb) {
  AdminAPI.products.list({ limit: 100 })
    .then((data) => cb((data.products || [])))
    .catch(() => cb([]));
}

async function submitComboForm(e) {
  e.preventDefault();
  const form = document.getElementById('combo-form');
  if (!form) return;
  const editId = form.dataset.editId || '';

  const name = form.querySelector('#combo-name-input').value.trim();
  const price = Number(form.querySelector('#combo-price-input').value);
  const discount = Number(form.querySelector('#combo-discount-input').value) || 0;
  const status = form.querySelector('#combo-status-select').value;
  const description = form.querySelector('#combo-desc-input').value.trim();

  if (!name) { showToast('Error', 'Please enter a combo name.', 'error'); return; }
  if (isNaN(price) || price < 0) { showToast('Error', 'Please enter a valid combo price.', 'error'); return; }

  const rows = Array.from(document.querySelectorAll('#combo-editor-items .combo-editor-item'));
  const items = rows
    .map(r => ({
      product: r.querySelector('select').value,
      quantity: parseInt(r.querySelector('input[type="number"]').value, 10)
    }))
    .filter(it => it.product);

  if (items.length === 0) {
    showToast('Error', 'Add at least one product to the combo.', 'warning');
    return;
  }
  if (items.some(it => !Number.isInteger(it.quantity) || it.quantity < 1)) {
    showToast('Error', 'Each combo product needs a quantity of at least 1.', 'error');
    return;
  }

  // Validation passed — build the submission.
  const submitBtn = form.querySelector('button[type="submit"]');
  submitBtn.disabled = true;
  const defaultHtml = submitBtn.innerHTML;
  submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
  try {
    // Multipart FormData mirrors the Admin Product upload pattern. `items` is
    // sent as a JSON string and re-parsed on the backend by parseComboPayload.
    const formData = new FormData();
    formData.append('name', name);
    formData.append('price', price);
    formData.append('discount', discount);
    formData.append('status', status);
    formData.append('description', description || '');
    formData.append('items', JSON.stringify(items));
    const imageInput = document.getElementById('combo-image-input');
    const imageFile = imageInput && imageInput.files && imageInput.files[0] ? imageInput.files[0] : null;
    if (imageFile) {
      formData.append('image', imageFile);
    }
    // When editing without a new image, no image field is sent so the existing
    // combo image is preserved by the backend update logic.

    if (editId) {
      await AdminAPI.combos.update(editId, formData);
      showToast('Combo updated', `Combo "${name}" saved.`);
    } else {
      await AdminAPI.combos.create(formData);
      showToast('Combo created', `Combo "${name}" created.`);
    }
    document.getElementById('combo-modal').classList.remove('open');
    document.getElementById('combo-modal').setAttribute('aria-hidden', 'true');
    initAdminCombos();
  } catch (err) {
    showToast('Error', safeError(err), 'error');
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerHTML = defaultHtml;
  }
}

/* ---------- Combo image preview helpers (mirror Admin Product pattern) ---------- */
const COMBO_MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const COMBO_ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
let comboImageObjectUrl = null;

function getComboImageEls() {
  const input = document.getElementById('combo-image-input');
  const wrap = document.getElementById('combo-image-preview');
  return {
    input,
    wrap,
    img: wrap ? wrap.querySelector('img') : null,
    empty: wrap ? wrap.querySelector('.preview-empty') : null
  };
}

function resetComboImageState() {
  const form = document.getElementById('combo-form');
  if (form) delete form.dataset.comboImage;
  if (comboImageObjectUrl) {
    URL.revokeObjectURL(comboImageObjectUrl);
    comboImageObjectUrl = null;
  }
  const els = getComboImageEls();
  if (els.input) els.input.value = '';
  if (els.img) els.img.removeAttribute('src');
  if (els.wrap) els.wrap.classList.remove('has-image');
  if (els.empty) els.empty.style.display = '';
}

function showComboImage(src) {
  if (comboImageObjectUrl) {
    URL.revokeObjectURL(comboImageObjectUrl);
    comboImageObjectUrl = null;
  }
  const resolved = (typeof resolveImg === 'function' ? resolveImg(src) : src) || '';
  const els = getComboImageEls();
  if (els.img) els.img.src = resolved;
  if (els.wrap) els.wrap.classList.toggle('has-image', !!resolved);
  if (els.empty) els.empty.style.display = resolved ? 'none' : '';
}

function previewComboImageFile(file) {
  if (comboImageObjectUrl) URL.revokeObjectURL(comboImageObjectUrl);
  comboImageObjectUrl = URL.createObjectURL(file);
  const els = getComboImageEls();
  if (els.img) els.img.src = comboImageObjectUrl;
  if (els.wrap) els.wrap.classList.add('has-image');
  if (els.empty) els.empty.style.display = 'none';
}

function initComboImageInput() {
  const els = getComboImageEls();
  if (!els.input || !els.input.dataset.bound) {
    if (els.input) {
      els.input.dataset.bound = '1';
      els.input.addEventListener('change', () => {
        const file = els.input.files[0];
        if (!file) return;
        if (!COMBO_ALLOWED_IMAGE_TYPES.includes(file.type)) {
          els.input.value = '';
          showComboImage(document.getElementById('combo-form').dataset.comboImage || '');
          showToast('Error', 'Please select a valid image file (JPG, PNG, WEBP, or GIF).', 'error');
          return;
        }
        if (file.size > COMBO_MAX_IMAGE_SIZE) {
          els.input.value = '';
          showComboImage(document.getElementById('combo-form').dataset.comboImage || '');
          showToast('Error', 'Image must be smaller than 5 MB.', 'error');
          return;
        }
        previewComboImageFile(file);
      });
    }
  }
}
document.addEventListener('DOMContentLoaded', () => {
  const addItemBtn = document.getElementById('combo-editor-add-item');
  if (addItemBtn && !addItemBtn.dataset.bound) {
    addItemBtn.dataset.bound = '1';
    addItemBtn.addEventListener('click', () => {
      comboEditorDefaultProducts((products) => addComboEditorItem(products, null));
    });
  }
  const form2 = document.getElementById('combo-form');
  if (form2 && !form2.dataset.bound) {
    form2.dataset.bound = '1';
    form2.addEventListener('submit', submitComboForm);
  }
  initComboImageInput();
});

/* ============ ADMIN SETTINGS ============ */
async function initAdminSettings() {
  try {
    const { settings } = await AdminAPI.settings.get();
    const form = document.querySelector('#admin-settings form');
    if (form) {
      const inputs = form.querySelectorAll('input, textarea');
      inputs.forEach(input => {
        const name = input.closest('.form-group')?.querySelector('label')?.textContent.trim();
        const keyMap = {
          'Shop Name': 'shopName',
          'Phone': 'phone',
          'Address': 'address',
          'Delivery Charge (₹)': 'deliveryCharge',
          'Free Delivery Above (₹)': 'freeDeliveryThreshold',
          'Minimum Order Amount (₹)': 'minimumOrderAmount',
          'GST (%)': 'gst',
          'Low Stock Alert Threshold': 'lowStockThreshold',
          'Trusted Since Year': 'trustedSinceYear',
          'Customer Count': 'customerCount'
        };
        const key = keyMap[name];
        if (key && settings[key] !== undefined) input.value = settings[key];
      });

      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const updates = {};
        inputs.forEach(input => {
          const name = input.closest('.form-group')?.querySelector('label')?.textContent.trim();
          const keyMap = {
            'Shop Name': 'shopName',
            'Phone': 'phone',
            'Address': 'address',
            'Delivery Charge (₹)': 'deliveryCharge',
            'Free Delivery Above (₹)': 'freeDeliveryThreshold',
            'Minimum Order Amount (₹)': 'minimumOrderAmount',
            'GST (%)': 'gst',
            'Low Stock Alert Threshold': 'lowStockThreshold',
            'Trusted Since Year': 'trustedSinceYear',
            'Customer Count': 'customerCount'
          };
          const key = keyMap[name];
          if (key) updates[key] = input.value;
        });
        try {
          await AdminAPI.settings.update(updates);
          showToast('Settings saved', 'Shop settings updated successfully.');
        } catch (err) { showToast('Error', safeError(err), 'error'); }
      });
    }
  } catch (e) { showToast('Error', safeError(e), 'error'); }
}

/* ============ ADMIN CONTACT DETAILS ============ */
/* One admin-managed source for every shop/contact detail shown on the site.
   Reads + writes the same singleton Setting document used by all public pages
   (via GET /api/settings), so a change here updates every page instantly. */
async function initAdminContactDetails() {
  try {
    const { settings } = await AdminAPI.settings.get();
    const form = document.querySelector('#admin-contact-details form');
    if (form) {
      const inputs = form.querySelectorAll('input, textarea');
      const keyMap = {
        'Shop Name': 'shopName',
        'Company Name': 'companyName',
        'Phone 1': 'phone',
        'Phone 2': 'phone2',
        'Email 1': 'email',
        'Email 2': 'email2',
        'Address': 'address',
        'Monday – Saturday Hours': 'mondaySaturdayHours',
        'Sunday Hours': 'sundayHours',
        'Festival Season Hours': 'festivalSeasonHours',
        'WhatsApp Link': 'whatsappUrl',
        'Facebook Link': 'facebookUrl',
        'Instagram Link': 'instagramUrl',
        'Twitter / X Link': 'twitterUrl',
        'Google Map Embed URL': 'mapEmbedUrl'
      };
      inputs.forEach(input => {
        const name = input.closest('.form-group')?.querySelector('label')?.textContent.trim();
        const key = keyMap[name];
        if (key && settings[key] !== undefined) input.value = settings[key];
      });

      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const updates = {};
        inputs.forEach(input => {
          const name = input.closest('.form-group')?.querySelector('label')?.textContent.trim();
          const key = keyMap[name];
          if (key) updates[key] = input.value.trim();
        });
        try {
          await AdminAPI.settings.update(updates);
          showToast('Contact details saved', 'All pages now show the updated details.');
        } catch (err) { showToast('Error', safeError(err), 'error'); }
      });
    }
  } catch (e) { showToast('Error', safeError(e), 'error'); }
}

/* ============ ABOUT PAGE ============ */
/* All numerical details come from live data via /api/home (stats + settings),
   the same single source of truth used by the Home page. */
async function initAboutPage() {
  try {
    const data = await PublicAPI.home();
    const stats = data.stats || {};
    const settings = data.settings || {};

    // Years of Service = current year - trustedSinceYear (Admin Settings)
    const years = getServiceYears(settings.trustedSinceYear);
    const yearsEl = document.getElementById('about-years-count');
    if (yearsEl && years != null) yearsEl.textContent = years + '+';
    const decadesEl = document.querySelector('[data-about-decades]');
    if (decadesEl && years != null) decadesEl.textContent = formatDecadePhrase(years);

    // Happy Customers = Admin Settings → customerCount
    if (settings.customerCount != null) {
      const customersEl = document.getElementById('about-customers-count');
      if (customersEl) customersEl.textContent = formatCount(settings.customerCount) + '+';
      const storyCustomersEl = document.querySelector('[data-about-story-customers]');
      if (storyCustomersEl) storyCustomersEl.textContent = formatCount(settings.customerCount);
    }

    // Story product count = active product count (same rule as Home stats)
    if (stats.total_products != null) {
      const storyProductsEl = document.querySelector('[data-about-story-products]');
      if (storyProductsEl) storyProductsEl.textContent = formatCount(stats.total_products);
    }

    const productsEl = document.getElementById('about-products-count');
    if (productsEl && stats.total_products != null) {
      productsEl.textContent = stats.total_products + '+';
    }

    // Completed orders = orders in the terminal success state ('delivered'),
    // the same rule used elsewhere in this project (secondOrderDiscount.js).
    const ordersEl = document.getElementById('about-orders-count');
    if (ordersEl && stats.total_completed_orders != null) {
      ordersEl.textContent = formatCount(stats.total_completed_orders) + '+';
    }
  } catch (e) { /* keep static fallbacks if the API is unreachable */ }
}

/* ============ SHARED DYNAMIC "TRUSTED SINCE" YEAR ============ */
/* Footer + About header/story year references use Admin Settings →
   trustedSinceYear (single source of truth via /api/settings) so they
   stay in sync with the Hero "Trusted Since" badge. Runs on every public
   page; no-op when the page has no such reference. */
async function initDynamicYearRefs() {
  if (!document.querySelector('[data-footer-since-year], [data-about-since-year], [data-about-story-year]')) return;
  try {
    const data = await PublicAPI.settings();
    const year = data && data.settings ? data.settings.trustedSinceYear : null;
    if (year == null) return;
    document.querySelectorAll('[data-footer-since-year]').forEach(el => { el.textContent = year; });
    document.querySelectorAll('[data-about-since-year]').forEach(el => { el.textContent = year; });
    document.querySelectorAll('[data-about-story-year]').forEach(el => { el.textContent = year; });
  } catch (e) { /* keep static fallbacks */ }
}

/* ============ PAGE INIT DISPATCH ============ */
document.addEventListener('DOMContentLoaded', () => {
  const path = window.location.pathname.split('/').pop() || 'index.html';

  // Footer/About "trusted since" year — Admin Settings → trustedSinceYear.
  initDynamicYearRefs();

  switch (path) {
    case 'index.html':
      initHomePage();
      break;
    case 'shop.html':
      initShopPage();
      break;
    case 'product-details.html':
      initProductDetailsPage();
      break;
    case 'cart.html':
      initCartPageAPI();
      break;
    case 'checkout.html':
      initCheckoutPageAPI();
      break;
    case 'orders.html':
      initOrdersPage();
      break;
    case 'order-confirmation.html':
      initOrderConfirmationPage();
      break;
    case 'login.html':
      initLoginPage();
      break;
    case 'register.html':
      initRegisterPage();
      break;
    case 'contact.html':
      initContactPage();
      break;
    case 'about.html':
      initAboutPage();
      break;
    case 'admin-login.html':
      initAdminLoginPage();
      break;
    case 'admin.html':
      initAdminDashboard();
      initAdminProducts();
      initAdminCategories();
      initAdminOrders();
      initAdminCustomers();
      initAdminResellers();
      initAdminCommissions();
      initAdminInventory();
      initAdminReports();
      initAdminReviews();
      initAdminContact();
      initAdminCombos();
      initAdminContactDetails();
      initAdminSettings();
      break;
  }
});