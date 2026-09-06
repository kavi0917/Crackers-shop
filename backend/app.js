/* ============================================================
   VENDHAN CRACKERS — Express App Configuration
   ============================================================ */

const path = require('path');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');

const app = express();

/* ---------- Security Headers (helmet) ---------- */
// Helmet's default CSP has no `frame-src`, so it falls back to `default-src 'self'`
// and the browser blocks the Google Maps embed iframe ("This content is blocked.
// Contact the site owner to fix the issue."). Allow only the Google Maps embed
// hosts in `frame-src`; every other Helmet/CSP default stays exactly as before.
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        ...helmet.contentSecurityPolicy.getDefaultDirectives(),
        'frame-src': ["'self'", 'https://www.google.com', 'https://maps.google.com']
      }
    }
  })
);

/* ---------- CORS ---------- */
const allowedOrigins = process.env.CLIENT_URL
  ? process.env.CLIENT_URL.split(',').map((origin) => origin.trim())
  : ['http://localhost:3000', 'http://localhost:5500', 'http://localhost:8080', 'http://127.0.0.1:5500', 'http://127.0.0.1:8080'];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g., file://, curl, Postman)
      if (!origin || allowedOrigins.includes(origin) || process.env.NODE_ENV !== 'production') {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  })
);

/* ---------- Request Logging (morgan) ---------- */
if (process.env.NODE_ENV === 'production') {
  app.use(morgan('combined'));
} else {
  app.use(morgan('dev'));
}

/* ---------- Body Parsing ---------- */
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

/* ---------- Rate Limiting ---------- */
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  // 600 requests per 15 minutes per IP. Raised from 300 because every page
  // load fires several /api calls (settings, auth/me, cart, product listings)
  // and admin panels fire 10-20 calls each — all sharing one per-IP bucket on
  // localhost. 300 was routinely exhausted by legitimate browsing, which then
  // blocked every subsequent request (including logins) with HTTP 429.
  max: 600,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests, please try again later.',
    errors: []
  },
  // Login/register endpoints have their own dedicated, stricter limiters
  // (middleware/rateLimiter.js) with independent customer/admin buckets.
  // Exclude them from the global per-IP bucket so ordinary app traffic can
  // never exhaust the shared bucket and block a legitimate login.
  skip: (req) => {
    const url = (req.originalUrl || req.url || '').split('?')[0].replace(/\/+$/, '');
    return url === '/api/auth/login' || url === '/api/auth/register' || url === '/api/admin/auth/login';
  }
});

// Apply rate limiting to all /api routes
app.use('/api', apiLimiter);

/* ---------- Static Files (uploads) ---------- */
// Override CORP for public upload images so browsers on file:// or other
// origins can load product images. All other Helmet headers remain intact.
app.use('/uploads', (req, res, next) => {
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  next();
}, express.static(path.join(__dirname, 'uploads')));

/* ---------- Health Check ---------- */
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Vendhan Crackers API is running'
  });
});

/* ---------- API Routes ---------- */

// Phase 2 — Authentication
app.use('/api/auth', require('./routes/auth'));
app.use('/api/admin/auth', require('./routes/adminAuth'));

// Home page data
app.use('/api/home', require('./routes/home'));

// Phase 3 — Categories + Products
app.use('/api/categories', require('./routes/categories'));
app.use('/api/products', require('./routes/products'));
app.use('/api/admin/categories', require('./routes/adminCategories'));
app.use('/api/admin/products', require('./routes/adminProducts'));

// Phase 4 — Cart
app.use('/api/cart', require('./routes/cart'));

// Phase 2 — Customer Wishlist
app.use('/api/wishlist', require('./routes/wishlist'));

// Phase 5 — Checkout + Orders
app.use('/api/checkout', require('./routes/checkout'));
app.use('/api/orders', require('./routes/orders'));

// Coupon validation (customer) — Phase 6
app.use('/api/coupon', require('./routes/coupon'));

// Phase 6 — Admin Inventory
app.use('/api/admin/inventory', require('./routes/adminInventory'));

// Phase 6 — Coupon Management (admin-only)
app.use('/api/admin/coupons', require('./routes/adminCoupons'));

// Phase 7 — Admin Dashboard + Reports
app.use('/api/admin/orders', require('./routes/adminOrders'));
app.use('/api/admin/dashboard', require('./routes/adminDashboard'));
app.use('/api/admin/reports', require('./routes/adminReports'));

// Phase 8 — Festival Combos
app.use('/api/combos', require('./routes/combos'));
app.use('/api/admin/combos', require('./routes/adminCombos'));

// Phase 8 — Customer Reviews
app.use('/api/reviews', require('./routes/reviews'));
app.use('/api/admin/reviews', require('./routes/adminReviews'));

// Phase 8 — Contact Messages
app.use('/api/contact', require('./routes/contact'));
app.use('/api/admin/contact-messages', require('./routes/adminContact'));

// Phase 8 — Admin Settings
app.use('/api/admin/settings', require('./routes/adminSettings'));

// Public settings — used by customer-facing pages (e.g. freeDeliveryThreshold)
app.use('/api/settings', require('./routes/settings'));

// Phase 8 — Customer Management
app.use('/api/admin/customers', require('./routes/adminCustomers'));

// Phase 8 — Admin User Management
app.use('/api/admin/users', require('./routes/adminUsers'));

// Phase 8 — Reseller / Referral / Commission
app.use('/api/admin', require('./routes/adminResellers'));
app.use('/api/referral', require('./routes/referral'));
app.use('/api/reseller', require('./routes/referral'));

/* ---------- Static Frontend (customer-facing site) ----------
   Serve the top-level HTML/CSS/JS/assets so the whole application can be
   opened at http://localhost:5000/ (same origin) instead of file://.
   Registered AFTER the API routes so /api/* always resolves to Express
   routes first; unknown /api/* paths still fall through to the JSON 404
   handler below. Backend source, secrets, node_modules, logs and dotfiles
   are never exposed. */
const PROJECT_ROOT = path.join(__dirname, '..');
const SENSITIVE_PATH = /^\/backend\b|\/node_modules\b|\/\.git\b|\.env(\.|$)|\.log$/i;
app.use((req, res, next) => {
  const pathname = decodeURIComponent(req.path || '').toLowerCase();
  if (SENSITIVE_PATH.test(pathname)) {
    return res.status(404).json({ success: false, message: 'Route not found', errors: [] });
  }
  next();
});
app.use(express.static(PROJECT_ROOT, {
  index: 'index.html',
  dotfiles: 'deny',
  extensions: ['html']
}));

/* ---------- 404 Handler ---------- */
app.use(notFoundHandler);

/* ---------- Centralized Error Handler ---------- */
app.use(errorHandler);

module.exports = app;