/* ============================================================
   VENDHAN CRACKERS — Dedicated Auth Rate Limiters
   ============================================================
   Login/registration endpoints are deliberately excluded from the
   global /api limiter (see app.js) and instead get their own
   independent per-IP buckets. This guarantees that:

   - normal shopping/admin traffic (settings, cart, auth/me, admin
     panel data) can never exhaust an auth bucket and block a
     legitimate login, and
   - a brute-force attempt on the CUSTOMER login does NOT lock out
     the ADMIN login (and vice-versa), because each side has its own
     bucket.

   Thresholds follow REST_API_BLUEPRINT.md §15.6 / §18.5
   ("20 attempts / 15 minutes" for /api/auth/login,
   /api/admin/auth/login and /api/auth/register).
   ------------------------------------------------------------ */

const rateLimit = require('express-rate-limit');

const message = {
  success: false,
  message: 'Too many requests, please try again later.',
  errors: []
};

/** Customer login + register — 20 attempts per 15 minutes per IP. */
const customerAuthLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // 20 login/register attempts per 15 minutes per IP
  standardHeaders: true,
  legacyHeaders: false,
  message
});

/** Admin login — 20 attempts per 15 minutes per IP (independent bucket). */
const adminAuthLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // 20 login attempts per 15 minutes per IP
  standardHeaders: true,
  legacyHeaders: false,
  message
});

module.exports = { customerAuthLimiter, adminAuthLimiter };