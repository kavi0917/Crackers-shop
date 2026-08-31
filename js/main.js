/* ============================================================
   VENDHAN CRACKERS — Shared JavaScript
   ============================================================ */

/* ---------- Toast Notifications ---------- */
function showToast(title, message, type = 'success') {
  let container = document.querySelector('.toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    container.setAttribute('aria-live', 'polite');
    container.setAttribute('role', 'status');
    document.body.appendChild(container);
  }
  const icons = { success: 'fa-check-circle', error: 'fa-exclamation-circle', warning: 'fa-exclamation-triangle' };
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  const icon = document.createElement('i');
  icon.className = `fas ${icons[type] || icons.success}`;
  const textWrap = document.createElement('div');
  const titleEl = document.createElement('b');
  titleEl.textContent = title;
  const msgEl = document.createElement('span');
  msgEl.textContent = message;
  textWrap.appendChild(titleEl);
  textWrap.appendChild(msgEl);
  toast.appendChild(icon);
  toast.appendChild(textWrap);
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.transition = 'opacity 0.3s, transform 0.3s';
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(30px)';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

/* ---------- Navbar ---------- */
function initNavbar() {
  const navbar = document.querySelector('.navbar');
  const hamburger = document.querySelector('.hamburger');
  const mobileMenu = document.querySelector('.mobile-menu');

  window.addEventListener('scroll', () => {
    if (navbar) navbar.classList.toggle('scrolled', window.scrollY > 10);
  });

  if (hamburger && mobileMenu) {
    hamburger.setAttribute('aria-expanded', 'false');
    hamburger.addEventListener('click', () => {
      hamburger.classList.toggle('open');
      mobileMenu.classList.toggle('open');
      const isOpen = mobileMenu.classList.contains('open');
      hamburger.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    });

    // ESC closes mobile menu
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && mobileMenu.classList.contains('open')) {
        hamburger.classList.remove('open');
        mobileMenu.classList.remove('open');
        hamburger.setAttribute('aria-expanded', 'false');
        if (hamburger) hamburger.focus();
      }
    });

    // Close mobile menu when a link is clicked
    mobileMenu.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        hamburger.classList.remove('open');
        mobileMenu.classList.remove('open');
        hamburger.setAttribute('aria-expanded', 'false');
      });
    });
  }

  // Highlight active nav link
  const path = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-links a, .mobile-menu a').forEach(link => {
    const href = link.getAttribute('href');
    if (href === path) link.classList.add('active');
  });

  // Update auth state in navbar
  updateNavbarAuth();
}

/* ---------- Update Navbar Auth State ---------- */
function updateNavbarAuth() {
  const navLogin = document.querySelector('.nav-actions .nav-login');
  const mobileLogin = document.querySelector('.mobile-menu .nav-login');

  if (typeof isLoggedIn === 'function' && isLoggedIn()) {
    const user = typeof getCurrentUser === 'function' ? getCurrentUser() : null;
    const name = user?.name || user?.fullName || 'My Account';

    // --- Desktop: replace <a> with dropdown wrapper ---
    if (navLogin) {
      const wrap = document.createElement('div');
      wrap.className = 'nav-account-wrap';

      const btn = document.createElement('button');
      btn.className = 'nav-login';
      btn.setAttribute('aria-haspopup', 'true');
      btn.setAttribute('aria-expanded', 'false');
      const icon = document.createElement('i');
      icon.className = 'fas fa-user';
      btn.appendChild(icon);
      btn.appendChild(document.createTextNode(' ' + name));
      const chevron = document.createElement('i');
      chevron.className = 'fas fa-chevron-down';
      chevron.style.fontSize = '0.7em';
      btn.appendChild(chevron);

      const dropdown = document.createElement('div');
      dropdown.className = 'account-dropdown';

      const profileLink = document.createElement('a');
      profileLink.href = 'profile.html';
      const profileIcon = document.createElement('i');
      profileIcon.className = 'fas fa-user-circle';
      profileLink.appendChild(profileIcon);
      profileLink.appendChild(document.createTextNode(' Profile'));

      const ordersLink = document.createElement('a');
      ordersLink.href = 'orders.html';
      const ordersIcon = document.createElement('i');
      ordersIcon.className = 'fas fa-box-open';
      ordersLink.appendChild(ordersIcon);
      ordersLink.appendChild(document.createTextNode(' My Orders'));

      const logoutBtn = document.createElement('button');
      logoutBtn.className = 'dropdown-logout';
      const logoutIcon = document.createElement('i');
      logoutIcon.className = 'fas fa-sign-out-alt';
      logoutBtn.appendChild(logoutIcon);
      logoutBtn.appendChild(document.createTextNode(' Logout'));
      logoutBtn.addEventListener('click', () => {
        if (typeof logoutUser === 'function') logoutUser();
      });

      dropdown.appendChild(profileLink);
      dropdown.appendChild(ordersLink);
      dropdown.appendChild(logoutBtn);
      wrap.appendChild(btn);
      wrap.appendChild(dropdown);
      navLogin.replaceWith(wrap);

      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = dropdown.classList.toggle('open');
        btn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
      });
      document.addEventListener('click', () => {
        dropdown.classList.remove('open');
        btn.setAttribute('aria-expanded', 'false');
      }, { capture: false });
    }

    // --- Mobile: show account links inline ---
    if (mobileLogin) {
      mobileLogin.textContent = '';
      const icon2 = document.createElement('i');
      icon2.className = 'fas fa-user';
      mobileLogin.appendChild(icon2);
      mobileLogin.appendChild(document.createTextNode(' ' + name));
      mobileLogin.href = 'profile.html';

      // Inject My Orders + Logout after the login link if not already present
      if (!mobileLogin.parentElement.querySelector('.mobile-orders-link')) {
        const mOrders = document.createElement('a');
        mOrders.href = 'orders.html';
        mOrders.className = 'mobile-orders-link';
        const oIcon = document.createElement('i');
        oIcon.className = 'fas fa-box-open';
        mOrders.appendChild(oIcon);
        mOrders.appendChild(document.createTextNode(' My Orders'));

        const mLogout = document.createElement('a');
        mLogout.href = '#';
        mLogout.className = 'mobile-logout-link';
        const lIcon = document.createElement('i');
        lIcon.className = 'fas fa-sign-out-alt';
        mLogout.appendChild(lIcon);
        mLogout.appendChild(document.createTextNode(' Logout'));
        mLogout.addEventListener('click', (e) => {
          e.preventDefault();
          if (typeof logoutUser === 'function') logoutUser();
        });

        mobileLogin.after(mOrders);
        mOrders.after(mLogout);
      }
    }
  } else {
    if (navLogin) {
      navLogin.textContent = '';
      const icon = document.createElement('i');
      icon.className = 'fas fa-user';
      navLogin.appendChild(icon);
      navLogin.appendChild(document.createTextNode(' Login'));
      navLogin.href = 'login.html';
    }
    if (mobileLogin) {
      mobileLogin.textContent = '';
      const icon2 = document.createElement('i');
      icon2.className = 'fas fa-user';
      mobileLogin.appendChild(icon2);
      mobileLogin.appendChild(document.createTextNode(' Login'));
      mobileLogin.href = 'login.html';
    }
  }
}

/* ---------- Admin Sidebar ---------- */
function initAdminSidebar() {
  const hamburger = document.querySelector('.admin-hamburger');
  const sidebar = document.querySelector('.admin-sidebar');
  if (hamburger && sidebar) {
    hamburger.setAttribute('aria-expanded', 'false');
    hamburger.addEventListener('click', () => {
      sidebar.classList.toggle('open');
      const isOpen = sidebar.classList.contains('open');
      hamburger.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    });

    // ESC closes sidebar
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && sidebar.classList.contains('open')) {
        sidebar.classList.remove('open');
        hamburger.setAttribute('aria-expanded', 'false');
      }
    });
  }

  // Admin logout
  const logoutLink = document.querySelector('.admin-nav .logout');
  if (logoutLink) {
    logoutLink.addEventListener('click', (e) => {
      e.preventDefault();
      if (typeof logoutAdmin === 'function') {
        logoutAdmin();
      } else {
        window.location.href = 'admin-login.html';
      }
    });
  }
}

/* ---------- Quantity Selectors ---------- */
function initQtySelectors() {
  document.querySelectorAll('.qty-selector').forEach(selector => {
    const input = selector.querySelector('input');
    const minus = selector.querySelector('.qty-minus');
    const plus = selector.querySelector('.qty-plus');
    if (!input || !minus || !plus) return;

    // Upper bound = available stock, read from the product-details dataset.
    // Absent (e.g. cart rows handled separately) => no upper clamp here.
    function maxQty() {
      const stock = selector.dataset.stock;
      if (stock === undefined || stock === null || stock === '') return Infinity;
      const n = Number(stock);
      return Number.isFinite(n) ? n : Infinity;
    }

    // Normalize the input to a valid whole number between 1 and available stock.
    function normalize() {
      const parsed = parseInt(input.value, 10);
      let qty = 1;
      if (Number.isInteger(parsed) && parsed >= 1) qty = parsed;
      return Math.min(Math.max(qty, 1), Math.max(maxQty(), 1));
    }

    // Typing: keep the field editable but strip non-digit characters so the
    // value can never become NaN/negative/decimal. Empty is temporarily allowed.
    input.addEventListener('input', () => {
      const raw = input.value;
      const cleaned = String(raw).replace(/[^\d]/g, '');
      if (cleaned !== raw) input.value = cleaned;
    });

    // Normalize on Enter / blur so a valid quantity is always committed.
    function commit() {
      input.value = String(normalize());
    }
    input.addEventListener('change', commit);
    input.addEventListener('blur', commit);

    minus.addEventListener('click', () => {
      const val = parseInt(input.value, 10) || 1;
      input.value = String(Math.max(1, val - 1));
      input.dispatchEvent(new Event('change'));
    });
    plus.addEventListener('click', () => {
      const val = parseInt(input.value, 10) || 1;
      input.value = String(Math.min(val + 1, Math.max(maxQty(), 1)));
      input.dispatchEvent(new Event('change'));
    });
  });
}

/* ---------- Tabs ---------- */
function initTabs() {
  document.querySelectorAll('.tab-nav').forEach(nav => {
    nav.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const target = btn.dataset.tab;
        nav.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const panelWrap = nav.closest('.tabs');
        if (panelWrap) {
          panelWrap.querySelectorAll('.tab-panel').forEach(p => {
            p.classList.toggle('active', p.id === target);
          });
        }
      });
    });
  });
}

/* ---------- Product Thumbnails ---------- */
function initThumbs() {
  document.querySelectorAll('.pd-thumb').forEach(thumb => {
    thumb.addEventListener('click', () => {
      const src = thumb.dataset.img;
      const main = document.querySelector('.pd-main-img img');
      if (main && src) {
        main.src = src;
        document.querySelectorAll('.pd-thumb').forEach(t => t.classList.remove('active'));
        thumb.classList.add('active');
      }
    });
  });
}

/* ---------- View Toggle (Grid/List) ---------- */
function initViewToggle() {
  const grid = document.querySelector('.product-grid');
  const buttons = document.querySelectorAll('.view-toggle button');
  if (!grid || !buttons.length) return;
  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      buttons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      grid.classList.toggle('list-view', btn.dataset.view === 'list');
    });
  });
}

/* ---------- Filter Toggle (Mobile) ---------- */
function initFilterToggle() {
  const toggle = document.querySelector('.filter-toggle');
  const panel = document.querySelector('.filter-panel');
  if (toggle && panel) {
    toggle.addEventListener('click', () => panel.classList.toggle('open'));
  }
}

/* ---------- Wishlist ---------- */
function initWishlist() {
  document.querySelectorAll('.wishlist-btn, .pd-wishlist').forEach(btn => {
    btn.addEventListener('click', () => {
      btn.classList.toggle('active');
      const isActive = btn.classList.contains('active');
      showToast(
        isActive ? 'Added to wishlist' : 'Removed from wishlist',
        isActive ? 'Saved for later.' : 'Removed from your wishlist.',
        isActive ? 'success' : 'warning'
      );
    });
  });
}

/* ---------- Add to Cart Buttons ---------- */
function initAddToCart() {
  // If api.js is loaded (has isLoggedIn), use server cart for logged-in users
  const useServerCart = typeof isLoggedIn === 'function';

  // Event delegation: product cards are rendered dynamically (Shop page),
  // so bind once on document and detect [data-add-to-cart] clicks.
  // Static buttons (Product Details) and dynamic buttons (Shop cards)
  // are both handled by this single listener.
  document.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-add-to-cart]');
    if (!btn) return;
    if (btn.disabled) return;

    const id = btn.dataset.id;
    const name = btn.dataset.name;
    const price = parseFloat(btn.dataset.price);
    const img = btn.dataset.img || '';

    // Read the selected quantity from the product-details quantity selector.
    // Falls back to 1 when no quantity selector is present (Shop cards).
    const actionsWrap = btn.closest('.pd-actions');
    const qtyInput = actionsWrap ? actionsWrap.querySelector('.qty-selector input') : null;
    let quantity = 1;
    if (qtyInput) {
      const parsed = parseInt(qtyInput.value, 10);
      if (Number.isInteger(parsed) && parsed >= 1) quantity = parsed;
    }

    // If logged in and API available, use server cart
    if (useServerCart && isLoggedIn() && typeof CustomerAPI !== 'undefined') {
      try {
        await CustomerAPI.addToCart(id, quantity);
        if (typeof syncCartCount === 'function') syncCartCount();
        if (typeof showToast === 'function') {
          showToast('Added to cart', `${name} added to your cart.`);
        }
      } catch (e) {
        if (typeof showToast === 'function') showToast('Error', e.message, 'error');
      }
      return;
    }

    // Guest: redirect to login
    if (typeof showToast === 'function') {
      showToast('Login required', 'Please login to add items to your cart.', 'warning');
    }
    window.location.href = 'login.html?redirect=shop.html';
  });
}

/* ---------- Cart Page (legacy - replaced by pages.js initCartPageAPI) ---------- */
function initCartPage() {
  // Legacy localStorage cart - no longer used. Server cart handled in pages.js
}

/* ---------- Checkout (legacy - replaced by pages.js initCheckoutPageAPI) ---------- */
function initCheckout() {
  // Legacy localStorage checkout - no longer used. Server checkout handled in pages.js
}

/* ---------- Forms (Contact / Auth) ---------- */
function initForms() {
  // Form validation is handled in pages.js for API-connected forms
  // This handles any remaining static forms
  document.querySelectorAll('form[data-validate]:not([data-no-generic])').forEach(form => {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      let valid = true;
      form.querySelectorAll('[required]').forEach(input => {
        const group = input.closest('.form-group');
        if (!input.value.trim()) {
          group.classList.add('invalid');
          valid = false;
        } else {
          group.classList.remove('invalid');
        }
      });
      if (valid) {
        showToast('Success', 'Your request has been submitted successfully.');
        form.reset();
      }
    });
  });
}

/* ---------- Modals ---------- */
function initModals() {
  document.querySelectorAll('[data-modal-open]').forEach(btn => {
    btn.addEventListener('click', () => {
      const target = document.querySelector(btn.dataset.modalOpen);
      if (target) {
        target.classList.add('open');
        target.setAttribute('aria-hidden', 'false');
        // Move focus to modal heading or first control
        const heading = target.querySelector('h2, h3');
        const firstControl = target.querySelector('input, select, textarea, button');
        if (heading) heading.setAttribute('tabindex', '-1');
        if (heading) heading.focus();
        else if (firstControl) firstControl.focus();
      }
    });
  });
  document.querySelectorAll('[data-modal-close]').forEach(btn => {
    btn.addEventListener('click', () => {
      const modal = btn.closest('.modal-overlay');
      if (modal) {
        modal.classList.remove('open');
        modal.setAttribute('aria-hidden', 'true');
        // Return focus to the trigger button if it exists
        const triggerId = modal.dataset.trigger;
        if (triggerId) {
          const trigger = document.querySelector(triggerId);
          if (trigger) trigger.focus();
        }
      }
    });
  });
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.setAttribute('aria-hidden', 'true');
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        overlay.classList.remove('open');
        overlay.setAttribute('aria-hidden', 'true');
      }
    });
  });

  // ESC closes modals globally (does not interfere with mobile menu)
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      document.querySelectorAll('.modal-overlay.open').forEach(m => {
        m.classList.remove('open');
        m.setAttribute('aria-hidden', 'true');
      });
    }
  });
}

/* ---------- Admin Tabs ---------- */
function initAdminTabs() {
  document.querySelectorAll('.admin-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      showToast('Filter applied', `Showing ${tab.textContent} orders.`);
    });
  });
}

/* ---------- Delete buttons (legacy) ---------- */
function initDeleteButtons() {
  // Legacy delete - handled in pages.js for API-connected tables
}

/* ---------- Init ---------- */
document.addEventListener('DOMContentLoaded', () => {
  initNavbar();
  initAdminSidebar();
  initQtySelectors();
  initTabs();
  initThumbs();
  initViewToggle();
  initFilterToggle();
  initWishlist();
  initAddToCart();
  initCartPage();
  initCheckout();
  initForms();
  initModals();
  initAdminTabs();
  initDeleteButtons();
});