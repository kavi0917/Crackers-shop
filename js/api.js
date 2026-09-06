/* ============================================================
   VENDHAN CRACKERS — Frontend API Integration Layer
   ============================================================ */

/* ---------- API Base URL — fixed to known backend origin ---------- */
const _ALLOWED_API_ORIGINS = [
  'http://localhost:5000',
  'http://127.0.0.1:5000'
];
function _resolveApiBase() {
  const candidate = window.VITE_API_URL || 'http://localhost:5000/api';
  try {
    const u = new URL(candidate);
    if (_ALLOWED_API_ORIGINS.includes(u.origin)) return candidate;
  } catch (e) { /* fall through */ }
  return 'http://localhost:5000/api';
}
const API_BASE = _resolveApiBase();

/* ---------- Token Management (sessionStorage — cleared on tab close) ---------- */
function getToken() {
  return sessionStorage.getItem('vc_token');
}

function setToken(token) {
  sessionStorage.setItem('vc_token', token);
}

function getAdminToken() {
  return sessionStorage.getItem('vc_admin_token');
}

function setAdminToken(token) {
  sessionStorage.setItem('vc_admin_token', token);
}

function clearTokens() {
  sessionStorage.removeItem('vc_token');
  sessionStorage.removeItem('vc_admin_token');
}

/* ---------- Auth State ---------- */
let currentUser = null;
let currentAdmin = null;
let authLoading = false;

function isLoggedIn() {
  return !!getToken();
}

function isAdminLoggedIn() {
  return !!getAdminToken();
}

function getCurrentUser() {
  return currentUser;
}

function getCurrentAdmin() {
  return currentAdmin;
}

function setCurrentUser(user) {
  currentUser = user;
}

function setCurrentAdmin(admin) {
  currentAdmin = admin;
}

/* ---------- HTML Escaping (XSS safety) ---------- */
function escapeHTML(str) {
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

/* ---------- Error Message Sanitization ---------- */
function friendlyError(err) {
  if (!err) return 'Something went wrong. Please try again.';
  let msg = err.message || String(err);
  // Strip common backend/internal prefixes and map to user-friendly text
  const clean = String(msg)
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
    .replace(/^Product already in wishlist/i, 'This product is already in your wishlist.')
    .replace(/^Item not found in wishlist/i, 'This item is no longer in your wishlist.')

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

/* ---------- API Helper ---------- */
async function apiRequest(endpoint, options = {}) {
  const isFormData = options.body instanceof FormData;
  const headers = { ...(options.headers || {}) };
  if (!isFormData) headers['Content-Type'] = 'application/json';
  const token = options.admin ? getAdminToken() : getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  let response;
  try {
    // Build URL: if endpoint starts with '/', append to API_BASE so the /api
    // prefix is preserved. new URL('/path', base) would strip the base path.
    const resolvedEndpoint = endpoint.startsWith('/')
      ? API_BASE + endpoint
      : new URL(endpoint, API_BASE).toString();
    const requestUrl = new URL(resolvedEndpoint);
    if (!_ALLOWED_API_ORIGINS.includes(requestUrl.origin)) {
      throw new Error('Request blocked: origin not allowed.');
    }
    response = await fetch(requestUrl.toString(), {
      ...options,
      headers,
      body: isFormData ? options.body : (options.body ? JSON.stringify(options.body) : undefined)
    });
  } catch (err) {
    throw new Error('Network error. Please check your connection and try again.');
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    // Handle 401 - expired/invalid token
    if (response.status === 401) {
      if (options.admin) {
        clearTokens();
        if (!window.location.pathname.includes('admin-login.html')) {
          window.location.href = 'admin-login.html';
        }
      } else {
        clearTokens();
        if (!window.location.pathname.includes('login.html') && !window.location.pathname.includes('register.html')) {
          const redirect = encodeURIComponent(window.location.pathname + window.location.search);
          const loginUrl = new URL('login.html', window.location.origin);
          loginUrl.searchParams.set('redirect', redirect);
          window.location.replace(loginUrl.toString());
        }
      }
    }
    throw new Error(data.message ? friendlyError(new Error(data.message)) : `Request failed (${response.status})`);
  }

  // Return the data payload directly (backend wraps in { success, message, data })
  return data.data !== undefined ? data.data : data;
}

/* ---------- Binary Download Helper (e.g. invoice PDF) ---------- */
async function apiDownload(endpoint, fallbackName = 'download.pdf', options = {}) {
  const headers = { ...(options.headers || {}) };
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  let response;
  try {
    const resolvedEndpoint = endpoint.startsWith('/')
      ? API_BASE + endpoint
      : new URL(endpoint, API_BASE).toString();
    const requestUrl = new URL(resolvedEndpoint);
    if (!_ALLOWED_API_ORIGINS.includes(requestUrl.origin)) {
      throw new Error('Request blocked: origin not allowed.');
    }
    response = await fetch(requestUrl.toString(), { ...options, headers });
  } catch (err) {
    throw new Error('Network error. Please check your connection and try again.');
  }

  // 401 — expired/invalid token: same session-expiry behavior as apiRequest.
  if (response.status === 401) {
    clearTokens();
    if (!window.location.pathname.includes('login.html') && !window.location.pathname.includes('register.html')) {
      const redirect = encodeURIComponent(window.location.pathname + window.location.search);
      const loginUrl = new URL('login.html', window.location.origin);
      loginUrl.searchParams.set('redirect', redirect);
      window.location.replace(loginUrl.toString());
    }
  }

  if (!response.ok) {
    let message = `Request failed (${response.status})`;
    try {
      const data = await response.json();
      if (data && data.message) message = friendlyError(new Error(data.message));
    } catch (e) { /* non-JSON error body */ }
    throw new Error(message);
  }

  const blob = await response.blob();
  const disposition = response.headers.get('Content-Disposition') || '';
  const match = disposition.match(/filename="?([^";]+)"?/);
  const filename = (match && match[1]) || fallbackName;

  // Trigger a browser download without navigating away from the page.
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => window.URL.revokeObjectURL(url), 1000);

  return { filename, size: blob.size };
}

/* ---------- Auth API ---------- */
const AuthAPI = {
  register: (data) => apiRequest('/auth/register', { method: 'POST', body: data }),
  login: (data) => apiRequest('/auth/login', { method: 'POST', body: data }),
  me: () => apiRequest('/auth/me'),
  logout: () => apiRequest('/auth/logout', { method: 'POST' }),
  adminLogin: (data) => apiRequest('/admin/auth/login', { method: 'POST', body: data, admin: true }),
  adminMe: () => apiRequest('/admin/auth/me', { admin: true })
};

/* ---------- Public API ---------- */
const PublicAPI = {
  home: () => apiRequest('/home'),
  products: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return apiRequest(`/products${qs ? `?${qs}` : ''}`);
  },
  product: (id) => apiRequest(`/products/${id}`),
  productReviews: (id) => apiRequest(`/products/${id}/reviews`),
  relatedProducts: (id, limit = 3) => apiRequest(`/products/${id}/related?limit=${limit}`),
  categories: () => apiRequest('/categories'),
  category: (id) => apiRequest(`/categories/${id}`),
  categoryProducts: (id, page = 1, limit = 12) => apiRequest(`/categories/${id}/products?page=${page}&limit=${limit}`),
  combos: () => apiRequest('/combos'),
  combo: (id) => apiRequest(`/combos/${id}`),
  contact: (data) => apiRequest('/contact', { method: 'POST', body: data }),
  settings: () => apiRequest('/settings')
};

/* ---------- Customer API ---------- */
const CustomerAPI = {
  getCart: () => apiRequest('/cart'),
  addToCart: (productId, quantity = 1) => apiRequest('/cart/items', { method: 'POST', body: { productId, quantity } }),
  updateCartItem: (productId, quantity) => apiRequest(`/cart/items/${productId}`, { method: 'PUT', body: { quantity } }),
  removeCartItem: (productId) => apiRequest(`/cart/items/${productId}`, { method: 'DELETE' }),
  clearCart: () => apiRequest('/cart', { method: 'DELETE' }),
  validateCheckout: (data) => apiRequest('/checkout/validate', { method: 'POST', body: data }),
  validateCoupon: (data) => apiRequest('/coupon/validate', { method: 'POST', body: data }),
  placeOrder: (data) => apiRequest('/checkout', { method: 'POST', body: data }),
  myOrders: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return apiRequest(`/orders${qs ? `?${qs}` : ''}`);
  },
  order: (id) => apiRequest(`/orders/${id}`),
  invoice: (id) => apiDownload(`/orders/${id}/invoice`, `vendhan-crackers-invoice-${id}.pdf`),
  trackOrder: (id) => apiRequest(`/orders/${id}/track`),
  cancelOrder: (id) => apiRequest(`/orders/${id}/cancel`, { method: 'POST' }),
  addComboToCart: (comboId, items) => apiRequest(`/combos/${comboId}/add-to-cart`, { method: 'POST', body: { items } }),
  createReview: (productId, data) => apiRequest(`/products/${productId}/reviews`, { method: 'POST', body: data }),
  updateReview: (reviewId, data) => apiRequest(`/reviews/${reviewId}`, { method: 'PUT', body: data }),
  deleteReview: (reviewId) => apiRequest(`/reviews/${reviewId}`, { method: 'DELETE' }),
  getWishlist: () => apiRequest('/wishlist'),
  addToWishlist: (productId) => apiRequest('/wishlist', { method: 'POST', body: { productId } }),
  removeFromWishlist: (productId) => apiRequest(`/wishlist/${productId}`, { method: 'DELETE' })
};

/* ---------- Referral / Reseller API (Phase 8) ---------- */
const ReferralAPI = {
  apply: (referralCode) => apiRequest('/referral/apply', { method: 'POST', body: { referralCode } }),
  me: () => apiRequest('/referral/me'),
  resellerDashboard: () => apiRequest('/reseller/dashboard'),
  resellerCommissions: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return apiRequest(`/reseller/commissions${qs ? `?${qs}` : ''}`);
  }
};

/* ---------- Admin API ---------- */
const AdminAPI = {
  dashboard: {
    summary: () => apiRequest('/admin/dashboard/summary', { admin: true }),
    sales: (params = {}) => {
      const qs = new URLSearchParams(params).toString();
      return apiRequest(`/admin/dashboard/sales${qs ? `?${qs}` : ''}`, { admin: true });
    },
    orders: () => apiRequest('/admin/dashboard/orders', { admin: true }),
    topProducts: (limit = 5) => apiRequest(`/admin/dashboard/top-products?limit=${limit}`, { admin: true }),
    categorySales: () => apiRequest('/admin/dashboard/category-sales', { admin: true }),
    recentOrders: (limit = 5) => apiRequest(`/admin/dashboard/recent-orders?limit=${limit}`, { admin: true }),
    lowStock: () => apiRequest('/admin/dashboard/low-stock', { admin: true }),
    analytics: (params = {}) => {
      const qs = new URLSearchParams(params).toString();
      return apiRequest(`/admin/dashboard/analytics${qs ? `?${qs}` : ''}`, { admin: true });
    }
  },
  products: {
    list: (params = {}) => {
      const qs = new URLSearchParams(params).toString();
      return apiRequest(`/admin/products${qs ? `?${qs}` : ''}`, { admin: true });
    },
    get: (id) => apiRequest(`/admin/products/${id}`, { admin: true }),
    create: (data) => apiRequest('/admin/products', { method: 'POST', body: data, admin: true }),
    update: (id, data) => apiRequest(`/admin/products/${id}`, { method: 'PUT', body: data, admin: true }),
    remove: (id) => apiRequest(`/admin/products/${id}`, { method: 'DELETE', admin: true })
  },
  categories: {
    list: () => apiRequest('/admin/categories', { admin: true }),
    create: (data) => apiRequest('/admin/categories', { method: 'POST', body: data, admin: true }),
    update: (id, data) => apiRequest(`/admin/categories/${id}`, { method: 'PUT', body: data, admin: true }),
    remove: (id) => apiRequest(`/admin/categories/${id}`, { method: 'DELETE', admin: true })
  },
  orders: {
    list: (params = {}) => {
      const qs = new URLSearchParams(params).toString();
      return apiRequest(`/admin/orders${qs ? `?${qs}` : ''}`, { admin: true });
    },
    detail: (id) => apiRequest(`/admin/orders/${id}`, { admin: true }),
    updateStatus: (id, status) => apiRequest(`/admin/orders/${id}/status`, { method: 'PUT', body: { status }, admin: true })
  },
  customers: {
    list: (params = {}) => {
      const qs = new URLSearchParams(params).toString();
      return apiRequest(`/admin/customers${qs ? `?${qs}` : ''}`, { admin: true });
    },
    get: (id) => apiRequest(`/admin/customers/${id}`, { admin: true }),
    orders: (id) => apiRequest(`/admin/customers/${id}/orders`, { admin: true }),
    updateStatus: (id, status) => apiRequest(`/admin/customers/${id}/status`, { method: 'PUT', body: { status }, admin: true }),
    updateType: (id, customerType) => apiRequest(`/admin/customers/${id}/type`, { method: 'PUT', body: { customerType }, admin: true })
  },
  resellers: {
    list: (params = {}) => {
      const qs = new URLSearchParams(params).toString();
      return apiRequest(`/admin/resellers${qs ? `?${qs}` : ''}`, { admin: true });
    },
    get: (id) => apiRequest(`/admin/resellers/${id}`, { admin: true }),
    activate: (id) => apiRequest(`/admin/resellers/${id}/activate`, { method: 'PUT', admin: true }),
    deactivate: (id) => apiRequest(`/admin/resellers/${id}/deactivate`, { method: 'PUT', admin: true }),
    summary: () => apiRequest('/admin/resellers/summary', { admin: true }),
    eligibleCustomers: (params = {}) => {
      const qs = new URLSearchParams(params).toString();
      return apiRequest(`/admin/resellers/eligible-customers${qs ? `?${qs}` : ''}`, { admin: true });
    }
  },
  commissions: {
    list: (params = {}) => {
      const qs = new URLSearchParams(params).toString();
      return apiRequest(`/admin/commissions${qs ? `?${qs}` : ''}`, { admin: true });
    },
    get: (id) => apiRequest(`/admin/commissions/${id}`, { admin: true })
  },
  inventory: {
    list: (params = {}) => {
      const qs = new URLSearchParams(params).toString();
      return apiRequest(`/admin/inventory${qs ? `?${qs}` : ''}`, { admin: true });
    },
    lowStock: () => apiRequest('/admin/inventory/low-stock', { admin: true }),
    outOfStock: () => apiRequest('/admin/inventory/out-of-stock', { admin: true }),
    update: (productId, data) => apiRequest(`/admin/inventory/${productId}`, { method: 'PUT', body: data, admin: true })
  },
  reports: {
    sales: (params = {}) => {
      const qs = new URLSearchParams(params).toString();
      return apiRequest(`/admin/reports/sales${qs ? `?${qs}` : ''}`, { admin: true });
    },
    products: (params = {}) => {
      const qs = new URLSearchParams(params).toString();
      return apiRequest(`/admin/reports/products${qs ? `?${qs}` : ''}`, { admin: true });
    },
    categories: (params = {}) => {
      const qs = new URLSearchParams(params).toString();
      return apiRequest(`/admin/reports/categories${qs ? `?${qs}` : ''}`, { admin: true });
    },
    exportCsv: (params = {}) => {
      const qs = new URLSearchParams(params).toString();
      return apiRequest(`/admin/reports/export/csv${qs ? `?${qs}` : ''}`, { admin: true });
    },
    exportPdf: (params = {}) => {
      const qs = new URLSearchParams(params).toString();
      return apiRequest(`/admin/reports/export/pdf${qs ? `?${qs}` : ''}`, { admin: true });
    }
  },
  reviews: {
    list: (params = {}) => {
      const qs = new URLSearchParams(params).toString();
      return apiRequest(`/admin/reviews${qs ? `?${qs}` : ''}`, { admin: true });
    },
    get: (id) => apiRequest(`/admin/reviews/${id}`, { admin: true }),
    remove: (id) => apiRequest(`/admin/reviews/${id}`, { method: 'DELETE', admin: true })
  },
  contact: {
    list: (params = {}) => {
      const qs = new URLSearchParams(params).toString();
      return apiRequest(`/admin/contact-messages${qs ? `?${qs}` : ''}`, { admin: true });
    },
    get: (id) => apiRequest(`/admin/contact-messages/${id}`, { admin: true }),
    update: (id, data) => apiRequest(`/admin/contact-messages/${id}`, { method: 'PUT', body: data, admin: true }),
    remove: (id) => apiRequest(`/admin/contact-messages/${id}`, { method: 'DELETE', admin: true })
  },
  combos: {
    list: () => apiRequest('/admin/combos', { admin: true }),
    get: (id) => apiRequest(`/admin/combos/${id}`, { admin: true }),
    create: (data) => apiRequest('/admin/combos', { method: 'POST', body: data, admin: true }),
    update: (id, data) => apiRequest(`/admin/combos/${id}`, { method: 'PUT', body: data, admin: true }),
    remove: (id) => apiRequest(`/admin/combos/${id}`, { method: 'DELETE', admin: true })
  },
  settings: {
    get: () => apiRequest('/admin/settings', { admin: true }),
    update: (data) => apiRequest('/admin/settings', { method: 'PUT', body: data, admin: true })
  },
  coupons: {
    list: (params = {}) => {
      const qs = new URLSearchParams(params).toString();
      return apiRequest(`/admin/coupons${qs ? `?${qs}` : ''}`, { admin: true });
    },
    get: (id) => apiRequest(`/admin/coupons/${id}`, { admin: true }),
    create: (data) => apiRequest('/admin/coupons', { method: 'POST', body: data, admin: true }),
    update: (id, data) => apiRequest(`/admin/coupons/${id}`, { method: 'PUT', body: data, admin: true }),
    remove: (id) => apiRequest(`/admin/coupons/${id}`, { method: 'DELETE', admin: true })
  }
};

/* ---------- Auth Guard Helpers ---------- */
function requireLogin() {
  if (!isLoggedIn()) {
    const loginUrl = new URL('login.html', window.location.origin);
    loginUrl.searchParams.set('redirect', window.location.pathname + window.location.search);
    window.location.replace(loginUrl.toString());
    return false;
  }
  return true;
}

function requireAdminLogin() {
  if (!isAdminLoggedIn()) {
    window.location.href = 'admin-login.html';
    return false;
  }
  return true;
}

/* ---------- Auth State Initialization ---------- */
// Shared promise so concurrent callers (e.g. page init + checkout auto-fill) reuse
// a single auth lookup instead of firing duplicate /auth/me requests on page load.
let _authInitPromise = null;

async function initAuthState() {
  if (_authInitPromise) return _authInitPromise;
  _authInitPromise = (async () => {
    // Customer auth check
    if (isLoggedIn() && !currentUser) {
      try {
        const data = await AuthAPI.me();
        currentUser = data.user || data;
      } catch (e) {
        clearTokens();
        currentUser = null;
      }
    }

    // Admin auth check
    if (isAdminLoggedIn() && !currentAdmin) {
      try {
        const data = await AuthAPI.adminMe();
        currentAdmin = data.admin || data;
      } catch (e) {
        clearTokens();
        currentAdmin = null;
      }
    }
  })();
  return _authInitPromise;
}

/* ---------- Formatting Helpers ---------- */
function formatINR(amount) {
  return '₹' + Number(amount || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 });
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatDateTime(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) + ', ' +
    d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}

function getStockBadge(status) {
  const map = {
    in_stock: '<span class="badge badge-stock">In Stock</span>',
    low_stock: '<span class="badge badge-low">Low Stock</span>',
    out_of_stock: '<span class="badge badge-out">Out of Stock</span>'
  };
  return map[status] || '';
}

function getOrderBadge(status) {
  const map = {
    pending: '<span class="badge badge-pending">Pending</span>',
    confirmed: '<span class="badge badge-confirmed">Confirmed</span>',
    packed: '<span class="badge badge-packed">Packed</span>',
    delivered: '<span class="badge badge-delivered">Delivered</span>',
    cancelled: '<span class="badge badge-cancelled">Cancelled</span>'
  };
  return map[status] || escapeHTML(status || '');
}

function getStockPill(status) {
  const map = {
    in_stock: '<span class="stock-pill stock-in">In Stock</span>',
    low_stock: '<span class="stock-pill stock-low">Low Stock</span>',
    out_of_stock: '<span class="stock-pill stock-out">Out of Stock</span>'
  };
  return map[status] || '';
}

function getStockDot(status) {
  const map = {
    in_stock: '<span class="dot dot-green"></span>',
    low_stock: '<span class="dot dot-orange"></span>',
    out_of_stock: '<span class="dot dot-red"></span>'
  };
  return map[status] || '';
}

function getStockLabel(status) {
  const map = {
    in_stock: 'In Stock',
    low_stock: 'Low Stock',
    out_of_stock: 'Out of Stock'
  };
  return map[status] || status;
}

/* ---------- Resolve backend-relative image URLs ---------- */
const API_ORIGIN = API_BASE.replace(/\/api$/, '');

/* Allowed protocols for image URLs */
const SAFE_IMG_PROTOCOLS = /^https?:\/\//i;
/* Allowed upload path pattern */
const UPLOAD_PATH_ABS = /^\/uploads\//i;
const UPLOAD_PATH_REL = /^uploads\//i;
/* Bare filename with image extension */
const BARE_FILENAME = /^[^/]+\.(jpg|jpeg|png|webp|gif)$/i;

function resolveImg(src) {
  if (!src) return src;
  const s = String(src);
  // Reject dangerous protocols
  if (/^(javascript|data|vbscript|file|ftp):/i.test(s)) return '';
  // Already absolute HTTP/HTTPS — validate it points to our origin or is a known CDN
  if (SAFE_IMG_PROTOCOLS.test(s)) {
    // Only allow same origin or the configured API origin
    try {
      const u = new URL(s);
      if (u.origin === API_ORIGIN || u.origin === window.location.origin) return s;
      // External absolute URL — allow only http/https (already checked above)
      return s;
    } catch (e) { return ''; }
  }
  // Backend-relative upload path: /uploads/... or uploads/...
  if (UPLOAD_PATH_ABS.test(s)) return API_ORIGIN + s;
  if (UPLOAD_PATH_REL.test(s)) return API_ORIGIN + '/' + s;
  // Bare filename with image extension — assume uploads
  if (BARE_FILENAME.test(s)) return API_ORIGIN + '/uploads/' + s;
  return '';
}

/* ---------- Safe Image Fallback ---------- */
function safeImg(src, w = 44, h = 44) {
  const resolved = resolveImg(src);
  if (resolved) return resolved;
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><rect width="${w}" height="${h}" fill="#fdf9f0" rx="8"/><text x="50%" y="50%" text-anchor="middle" dominant-baseline="middle" font-size="${Math.round(w * 0.4)}">📦</text></svg>`
  );
}

/* ---------- Product Card Template (returns DOM element) ---------- */
function productCardTemplate(p) {
  const id = p.id || p._id;
  const name = p.name || '';
  // The Selling Price is ALWAYS the backend-authoritative finalPrice. The Shop
  // page is presentation-only and never computes its own pricing. `price` is
  // kept as the base/original price, while `finalPrice` is the derived selling
  // price returned by the API.
  const price = (p.finalPrice !== undefined && p.finalPrice !== null ? p.finalPrice : p.price) || 0;
  const originalPrice = p.originalPrice || p.oldPrice || null;
  const discountPercent = p.discountPercent !== undefined ? p.discountPercent : (p.discount || 0);
  const stockStatus = p.stockStatus || (p.stock === 0 ? 'out_of_stock' : p.stock <= p.reorderLevel ? 'low_stock' : 'in_stock');
  const ratingAvg = p.ratingAvg !== undefined ? p.ratingAvg : (p.rating || 0);
  const ratingCount = p.ratingCount !== undefined ? p.ratingCount : (p.reviewCount || 0);
  const img = resolveImg(p.mainImage || (p.images && p.images.length > 0 ? p.images[0] : '')) || '';
  const categoryName = p.categoryName || p.category_name || (p.category && p.category.name) || '';

  const card = document.createElement('div');
  card.className = 'product-card';

  // Media link
  const mediaLink = document.createElement('a');
  mediaLink.href = 'product-details.html?id=' + encodeURIComponent(id);
  mediaLink.className = 'product-media';

  const imgEl = document.createElement('img');
  imgEl.className = 'prod-img';
  imgEl.src = img || 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="500" height="300"><rect width="500" height="300" fill="#fdf9f0" rx="14"/><text x="50%" y="45%" text-anchor="middle" dominant-baseline="middle" font-size="48">🎆</text><text x="50%" y="65%" text-anchor="middle" dominant-baseline="middle" font-size="18" fill="#6b7280">Vendhan Crackers</text></svg>'
  );
  imgEl.alt = name;
  mediaLink.appendChild(imgEl);

  // Badges
  const badgesDiv = document.createElement('div');
  badgesDiv.className = 'product-badges';
  if (discountPercent > 0) {
    const b = document.createElement('span');
    b.className = 'badge badge-sale';
    b.textContent = 'Sale';
    badgesDiv.appendChild(b);
  }
  const stockBadge = document.createElement('span');
  if (stockStatus === 'out_of_stock') {
    stockBadge.className = 'badge badge-out';
    stockBadge.textContent = 'Out of Stock';
  } else if (stockStatus === 'low_stock') {
    stockBadge.className = 'badge badge-low';
    stockBadge.textContent = 'Low Stock';
  } else {
    stockBadge.className = 'badge badge-stock';
    stockBadge.textContent = 'In Stock';
  }
  badgesDiv.appendChild(stockBadge);
  mediaLink.appendChild(badgesDiv);

  // Wishlist button
  const wishBtn = document.createElement('button');
  wishBtn.className = 'wishlist-btn';
  wishBtn.dataset.productId = String(id);
  wishBtn.dataset.productName = name;
  wishBtn.title = 'Add to wishlist';
  wishBtn.setAttribute('aria-label', 'Add ' + name + ' to wishlist');
  wishBtn.setAttribute('aria-pressed', 'false');
  const heartIcon = document.createElement('i');
  heartIcon.className = 'fas fa-heart';
  wishBtn.appendChild(heartIcon);
  mediaLink.appendChild(wishBtn);
  card.appendChild(mediaLink);

  // Body
  const body = document.createElement('div');
  body.className = 'product-body';

  const catDiv = document.createElement('div');
  catDiv.className = 'product-cat';
  catDiv.textContent = categoryName;
  body.appendChild(catDiv);

  const nameH3 = document.createElement('h3');
  nameH3.className = 'product-name';
  const nameLink = document.createElement('a');
  nameLink.href = 'product-details.html?id=' + encodeURIComponent(id);
  nameLink.textContent = name;
  nameH3.appendChild(nameLink);
  body.appendChild(nameH3);

  const ratingDiv = document.createElement('div');
  ratingDiv.className = 'product-rating';
  const starsSpan = document.createElement('span');
  starsSpan.style.color = 'var(--gold)';
  starsSpan.textContent = '★'.repeat(Math.round(ratingAvg)) + '☆'.repeat(5 - Math.round(ratingAvg));
  const countSpan = document.createElement('span');
  countSpan.textContent = '(' + ratingCount + ')';
  ratingDiv.appendChild(starsSpan);
  ratingDiv.appendChild(countSpan);
  body.appendChild(ratingDiv);

  const priceDiv = document.createElement('div');
  priceDiv.className = 'product-price';
  const priceNow = document.createElement('span');
  priceNow.className = 'price-now';
  priceNow.textContent = formatINR(price);
  priceDiv.appendChild(priceNow);
  // Only show the struck-through original when a real discount exists
  // (selling price < original price). No artificial/fake discount display.
  const hasRealDiscount = discountPercent > 0 && originalPrice && price < originalPrice;
  if (hasRealDiscount) {
    const priceOld = document.createElement('span');
    priceOld.className = 'price-old';
    priceOld.textContent = formatINR(originalPrice);
    priceDiv.appendChild(priceOld);
  }
  if (hasRealDiscount) {
    const priceOff = document.createElement('span');
    priceOff.className = 'price-off';
    priceOff.textContent = 'Save ' + Math.round(discountPercent) + '%';
    priceDiv.appendChild(priceOff);
  }
  body.appendChild(priceDiv);

  const stockDiv = document.createElement('div');
  stockDiv.className = 'product-stock';
  stockDiv.appendChild(createStockDotEl(stockStatus));
  stockDiv.appendChild(document.createTextNode(' ' + getStockLabel(stockStatus) + (p.stock !== undefined ? ' — ' + p.stock + ' available' : '')));
  body.appendChild(stockDiv);

  const actionsDiv = document.createElement('div');
  actionsDiv.className = 'product-actions';
  if (stockStatus === 'out_of_stock') {
    const notifyBtn = document.createElement('button');
    notifyBtn.className = 'btn btn-dark btn-sm';
    notifyBtn.disabled = true;
    const bellIcon = document.createElement('i');
    bellIcon.className = 'fas fa-bell';
    notifyBtn.appendChild(bellIcon);
    notifyBtn.appendChild(document.createTextNode(' Notify Me'));
    actionsDiv.appendChild(notifyBtn);
  } else {
    const addBtn = document.createElement('button');
    addBtn.className = 'btn btn-primary btn-sm';
    addBtn.setAttribute('data-add-to-cart', '');
    addBtn.dataset.id = String(id);
    addBtn.dataset.name = name;
    addBtn.dataset.price = String(price);
    addBtn.dataset.img = img;
    const cartIcon = document.createElement('i');
    cartIcon.className = 'fas fa-cart-plus';
    addBtn.appendChild(cartIcon);
    addBtn.appendChild(document.createTextNode(' Add to Cart'));
    actionsDiv.appendChild(addBtn);
  }
  body.appendChild(actionsDiv);
  card.appendChild(body);

  return card;
}

/* ---------- Helper: create stock dot element ---------- */
function createStockDotEl(status) {
  const span = document.createElement('span');
  if (status === 'in_stock') span.className = 'dot dot-green';
  else if (status === 'low_stock') span.className = 'dot dot-orange';
  else span.className = 'dot dot-red';
  return span;
}

/* ---------- Render product cards into a container ---------- */
function renderProductCards(container, products) {
  container.textContent = '';
  products.forEach(p => container.appendChild(productCardTemplate(p)));
}

/* ---------- Cart Count Sync ---------- */
async function syncCartCount() {
  if (!isLoggedIn()) return;
  try {
    const data = await CustomerAPI.getCart();
    const count = data.totalItemCount || data.items.reduce((sum, item) => sum + item.quantity, 0);
    document.querySelectorAll('.cart-count').forEach(el => {
      el.textContent = count;
      el.style.display = count > 0 ? 'grid' : 'none';
    });
  } catch (e) {
    // Silent fail
  }
}

/* ---------- Wishlist State (single shared fetch) ----------
   The whole page shares ONE wishlist API request. Product cards and the
   Product Details heart read from this cached set of product ids, so we
   never fire a wishlist request per card. Add/remove update the cache in
   place; the cache is refreshed on the next render cycle. */
let _wishlistState = null;    // Set of wishlisted product ids (strings)
let _wishlistPromise = null;  // in-flight shared fetch

async function loadWishlistState() {
  if (typeof isLoggedIn === 'function' && !isLoggedIn()) {
    _wishlistState = new Set();
    return _wishlistState;
  }
  if (_wishlistState) return _wishlistState;
  if (!_wishlistPromise) {
    _wishlistPromise = CustomerAPI.getWishlist()
      .then((data) => {
        _wishlistState = new Set(
          (data && data.items ? data.items : [])
            .map((it) => String(it.productId))
            .filter(Boolean)
        );
        return _wishlistState;
      })
      .catch(() => {
        _wishlistState = new Set();
        return _wishlistState;
      })
      .finally(() => {
        _wishlistPromise = null;
      });
  }
  return _wishlistPromise;
}

function isWishlisted(productId) {
  return !!_wishlistState && _wishlistState.has(String(productId));
}

function updateWishlistState(productId, add) {
  if (!_wishlistState) _wishlistState = new Set();
  const key = String(productId);
  if (add) _wishlistState.add(key);
  else _wishlistState.delete(key);
}

/* Apply the cached wishlist state to every heart on the page
   (.wishlist-btn on shop cards, .pd-wishlist on Product Details). */
async function syncWishlistButtons() {
  const buttons = document.querySelectorAll('.wishlist-btn[data-product-id], .pd-wishlist[data-product-id]');
  if (buttons.length === 0) return;
  let state;
  try {
    state = await loadWishlistState();
  } catch (e) {
    return;
  }
  buttons.forEach((btn) => {
    const id = btn.dataset.productId;
    if (!id) return;
    const active = state.has(String(id));
    btn.classList.toggle('active', active);
    btn.title = active ? 'Remove from wishlist' : 'Add to wishlist';
    btn.setAttribute('aria-pressed', String(active));
    btn.setAttribute('aria-label', (active ? 'Remove ' : 'Add ') + (btn.dataset.productName || 'product') + (active ? ' from wishlist' : ' to wishlist'));
  });
}

/* ---------- Logout ---------- */
async function logoutUser() {
  try {
    if (isLoggedIn()) await AuthAPI.logout();
  } catch (e) { /* silent */ }
  clearTokens();
  currentUser = null;
  window.location.href = 'index.html';
}

async function logoutAdmin() {
  clearTokens();
  currentAdmin = null;
  window.location.href = 'admin-login.html';
}

/* ============================================================
   SHARED SHOP / CONTACT DETAILS — Single Admin-Managed Source
   ============================================================ */

/* Existing displayed values, kept as safe fallbacks when the API is
   unavailable or an admin leaves a field blank. Runtime display always comes
   from Admin → Contact Details → Setting document → GET /api/settings. */
const SHOP_DETAIL_FALLBACKS = {
  shopName: 'Vendhan Crackers',
  companyName: 'Vendhan Enterprises',
  phone: '+91 98400 12345',
  phone2: '+91 44 2653 7890',
  email: 'hello@vendhancrackers.in',
  email2: 'support@vendhancrackers.in',
  address: '42, Festival Street, Near Old Bus Stand, Chennai — 600001',
  mondaySaturdayHours: 'Mon – Sat: 9:00 AM – 9:00 PM',
  sundayHours: 'Sunday: 10:00 AM – 8:00 PM',
  festivalSeasonHours: 'Festival Season: Extended Hours',
  whatsappUrl: '',
  facebookUrl: '',
  instagramUrl: '',
  twitterUrl: '',
  mapEmbedUrl: 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3283.0074118003454!2d77.72415797407349!3d9.641433279103854!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3b06d900295818ff%3A0x8660c67bf4148bae!2sVendhan%20Fire%20Works!5e1!3m2!1sen!2sin!4v1787085840469!5m2!1sen!2sin'
};

/**
 * Resolve an Admin-provided "Google Map Embed URL" value into a safe,
 * renderable Google Maps embed URL.
 *
 * Accepted inputs:
 *   - a direct embed URL: https://www.google.com/maps/embed… (also the
 *     legacy https://maps.google.com/maps?…&output=embed format)
 *   - a complete <iframe … src="…"></iframe> embed snippet, from which only
 *     the src attribute is extracted.
 *
 * Any other value resolves to '' so the caller keeps the existing static
 * fallback (no arbitrary URLs, no HTML injection).
 */
function extractGoogleMapsEmbedSrc(value) {
  const raw = String(value == null ? '' : value).trim();
  if (!raw) return '';

  // Complete <iframe ...></iframe> embed code → keep only its src attribute.
  let candidate = /^<iframe\b/i.test(raw)
    ? (raw.match(/\bsrc\s*=\s*["']([^"']+)["']/i) || [])[1] || ''
    : raw;

  candidate = candidate.trim();
  if (!candidate) return '';

  // Only HTTPS Google Maps embed URLs are allowed:
  //   https://www.google.com/maps/embed… (current embed format)
  //   https://www.google.com/maps?…&output=embed… (legacy format)
  //   https://maps.google.com/maps?…&output=embed… (legacy format)
  if (
    /^https:\/\/(www\.)?google\.com\/maps\/embed\/?(?:\?|#|$)/i.test(candidate) ||
    /^https:\/\/(www\.)?google\.com\/maps\?(?:[^#]*&)?output=embed/i.test(candidate) ||
    /^https:\/\/maps\.google\.com\/maps\?(?:[^#]*&)?output=embed/i.test(candidate)
  ) {
    return candidate;
  }

  // A Google Maps URL that is not embeddable (e.g. a normal
  // https://www.google.com/maps/... page) cannot be framed by Google itself.
  // Keep the existing fallback map and tell the site owner what to paste.
  if (
    /^https:\/\/(www\.)?google\.[a-z.]+\/maps\//i.test(candidate) ||
    /^https:\/\/maps\.google\.com\//i.test(candidate)
  ) {
    console.warn(
      '[Shop Map] The saved "Google Map Embed URL" is not an embeddable Google Maps URL. ' +
      'Use Google Maps → Share → Embed a map, then paste the https://www.google.com/maps/embed?... ' +
      'URL or the full <iframe> code into Admin → Contact Details. Keeping the existing fallback map.'
    );
  }
  return '';
}
/*
 * Apply Admin-managed contact details to every marked element on the page:
 *   [data-shop-name]            → shop name
 *   [data-shop-company]         → company / trademark name
 *   [data-shop-phone]           → phone 1
 *   [data-shop-phone2]          → phone 2
 *   [data-shop-email]           → email 1
 *   [data-shop-email2]          → email 2
 *   [data-shop-address]         → address (newlines rendered as <br>)
 *   [data-shop-hours-monsat]    → Monday–Saturday hours
 *   [data-shop-hours-sun]       → Sunday hours
 *   [data-shop-hours-festival]  → Festival season hours
 *   [data-shop-phone-link]      → href for "call" links (tel:)
 *   [data-shop-email-link]      → href for "email" links (mailto:)
 *   [data-shop-facebook]        → Facebook URL (kept "#" when blank)
 *   [data-shop-instagram]       → Instagram URL
 *   [data-shop-twitter]         → Twitter/X URL
 *   [data-shop-whatsapp]        → WhatsApp URL
 *   [data-shop-map]             → Google Maps embed iframe src
 */
function applyShopDetails(settings) {
  if (!settings) return;

  const val = (key) => {
    const v = settings[key];
    return v !== undefined && v !== null ? String(v) : (SHOP_DETAIL_FALLBACKS[key] || '');
  };

  // Simple text values
  const textMap = {
    shopName: 'data-shop-name',
    companyName: 'data-shop-company',
    phone: 'data-shop-phone',
    phone2: 'data-shop-phone2',
    email: 'data-shop-email',
    email2: 'data-shop-email2',
    mondaySaturdayHours: 'data-shop-hours-monsat',
    sundayHours: 'data-shop-hours-sun',
    festivalSeasonHours: 'data-shop-hours-festival'
  };
  Object.keys(textMap).forEach((key) => {
    document.querySelectorAll(`[${textMap[key]}]`).forEach((el) => {
      el.textContent = val(key);
    });
  });

  // Address — keep the existing card layout using <br> for each line
  document.querySelectorAll('[data-shop-address]').forEach((el) => {
    el.textContent = '';
    const lines = val('address').split(/\r?\n/);
    lines.forEach((line, i) => {
      if (i > 0) el.appendChild(document.createElement('br'));
      el.appendChild(document.createTextNode(line));
    });
  });

  // Social link URLs — existing icons/design stay exactly the same, only hrefs update
  const linkMap = {
    whatsappUrl: 'data-shop-whatsapp',
    facebookUrl: 'data-shop-facebook',
    instagramUrl: 'data-shop-instagram',
    twitterUrl: 'data-shop-twitter'
  };
  Object.keys(linkMap).forEach((key) => {
    const url = val(key);
    if (!url) return; // blank → keep existing fallback href
    document.querySelectorAll(`[${linkMap[key]}]`).forEach((el) => {
      el.setAttribute('href', url);
    });
  });

  // tel: / mailto: links
  const phone = val('phone');
  if (phone) {
    document.querySelectorAll('[data-shop-phone-link]').forEach((el) => {
      el.setAttribute('href', 'tel:' + String(phone).replace(/[^+\d]/g, ''));
    });
  }
  const email = val('email');
  if (email) {
    document.querySelectorAll('[data-shop-email-link]').forEach((el) => {
      el.setAttribute('href', 'mailto:' + email);
    });
  }

  // Google Map embed iframe — existing map stays, only the src is managed.
  // The Admin value can be a direct Google Maps embed URL or a complete
  // <iframe> embed snippet; resolve it to a validated URL before using it.
  const mapSrc = extractGoogleMapsEmbedSrc(val('mapEmbedUrl'));
  if (mapSrc) {
    document.querySelectorAll('[data-shop-map]').forEach((el) => {
      el.setAttribute('src', mapSrc);
    });
  }
}

/* Fetch the single Admin-managed source and apply it to the page.
   Fails silently — existing static values remain as the safe fallback. */
async function initShopDetails() {
  try {
    const data = await PublicAPI.settings();
    applyShopDetails(data && data.settings ? data.settings : null);
  } catch (e) {
    /* keep static fallbacks */
  }
}

/* ---------- Init ---------- */
document.addEventListener('DOMContentLoaded', () => {
  // Admin-managed shop/contact details → every page reads the same source.
  initShopDetails();
  initAuthState().then(() => {
    syncCartCount();
  });
});