# VENDHAN CRACKERS — Technical Blueprint
## Converting the UI Prototype into a Complete Functional Web Application

**Project:** Vendhan Crackers — "Celebrate Together"
**Purpose:** College Consultancy Mini-Project
**Stage:** UI Prototype → Full-Stack Web Application

---

# 1. CURRENT PROJECT ANALYSIS

The existing project is a **high-fidelity HTML/CSS/JavaScript UI prototype** comprising static pages with hard-coded sample data. It accurately represents the intended visual identity and functionality but has no backend, database, or real data integration.

## Current System Audit

### PAGES FOUND IN PROJECT

| File | Page | Type |
|------|------|------|
| index.html | Home | Customer |
| shop.html | Shop / Catalogue | Customer |
| product-details.html | Product Details | Customer |
| cart.html | Cart | Customer |
| checkout.html | Checkout | Customer |
| order-confirmation.html | Order Confirmation | Customer |
| orders.html | My Orders | Customer |
| about.html | About Us | Customer |
| contact.html | Contact | Customer |
| login.html | Login | Customer |
| register.html | Register | Customer |
| admin.html | Admin Dashboard | Admin |

### SUPPORTING FILES

| File | Purpose |
|------|---------|
| css/styles.css | Complete design system (colors, typography, components, responsive rules) |
| js/main.js | Cart state (localStorage), toasts, tabs, modals, form validation, admin section switching |

---

## Page-by-Page Audit

### PAGE: Home (index.html)
**Purpose:** First impression, brand showcase, feature discovery, traffic driver to shop.
**Existing UI sections:**
1. Sticky navbar (logo, links, search icon, cart icon, login button)
2. Hero with fireworks animation, headline, CTAs
3. Trust cards (Quality, Affordable, Easy Ordering, Trusted Service)
4. Shop by Category (6 category cards)
5. Featured Products (6 product cards)
6. Festival Banner ("Make This Celebration Special")
7. Build Your Festival Combo (₹500 / ₹1,000 / ₹2,000)
8. Customer Reviews (3 testimonials)
9. Shop Location (address, phone, hours, map placeholder)
10. Footer (logo, links, categories, contact, social)

**Existing user actions:** Click navbar links, click hero CTAs, click category cards, click product cards, click Add to Cart (works via localStorage), click combo CTAs, submit no forms.

**Data required:** Categories (6), Featured products (6), Combos (3), Reviews (3), Shop info, Trust features.

**Functionality currently missing:** Dynamic data loading, search, real category filtering, combo builder interaction, review submission, real map.

**Should be connected to:** `GET /api/home` (aggregated: categories, featured products, combos, reviews), or separate endpoints.

---

### PAGE: Shop (shop.html)
**Purpose:** Product discovery with filtering, sorting, searching.
**Existing UI sections:**
1. Page header + breadcrumb
2. Left filter sidebar (Category checkboxes, Price range slider, Availability radio, Discount checkboxes)
3. Search bar
4. Sort dropdown (Featured, Price L-H, Price H-L, Rating, Newest)
5. Grid/List view toggle
6. Product grid (9 products, 3 columns)
7. Pagination (8 pages)

**Existing user actions:** Filter toggles (visual only), search (visual only), sort (visual only), grid/list toggle (functional via JS), add to cart (works), pagination clicks (visual only).

**Data required:** Products list, Categories, Price boundaries, Stock statuses, Ratings.

**Functionality currently missing:** Real filtering, real search, real sorting, real pagination, loading states, empty states, error states.

**Should be connected to:** `GET /api/products?category=&price_min=&price_max=&availability=&discount=&q=&sort=&page=`

---

### PAGE: Product Details (product-details.html)
**Purpose:** Show detailed product information and drive purchase.
**Existing UI sections:**
1. Breadcrumb
2. Image gallery (main + 4 thumbnails, thumbnail switching works)
3. Product info (category, name, rating, badges, price, old price, save amount)
4. Description
5. Stock availability line
6. Quantity selector (functional)
7. Add to Cart button (works)
8. Buy Now button (navigates to checkout.html)
9. Wishlist heart (visual toggle)
10. Trust highlights (Free delivery, Licensed, Returns)
11. Tabs: Description, Specifications, Safety Information, Reviews (tab switching works)
12. Related products (3 cards)

**Data required:** Single product, product images (multiple), specifications, safety info, reviews, related products.

**Functionality currently missing:** Dynamic product loading by ID, real reviews from DB, real related products.

**Should be connected to:** `GET /api/products/:id`, `GET /api/products/:id/reviews`, `GET /api/products/:id/related`

---

### PAGE: Cart (cart.html)
**Purpose:** Review items before checkout.
**Existing UI sections:**
1. Cart items container (JS-rendered from localStorage)
2. Each item: image, name, price, qty selector, item total, remove button
3. Order summary (Subtotal, Discount 10%, Delivery, Grand Total)
4. Coupon code input (visual only)
5. Continue Shopping + Proceed to Checkout buttons
6. Empty-cart state (JS-rendered)

**Existing user actions:** Quantity +/- (works), Remove (works), Add-to-cart from other pages (works), checkout navigation (works).

**Data required:** Cart items (from localStorage currently), prices, stock, delivery rules.

**Functionality currently missing:** Server-side cart persistence, coupon validation, real delivery calculation based on settings, stock validation at cart stage.

**Should be connected to:** `GET/POST /api/cart`, `POST /api/coupon/validate`

---

### PAGE: Checkout (checkout.html)
**Purpose:** Multi-step order creation.
**Existing UI sections:**
1. 4-step progress tracker (Details → Delivery → Review → Confirm)
2. Step 1: Customer form (name, phone, email)
3. Step 2: Delivery form (address, city, state, pincode, instructions)
4. Step 3: Order review (items + place order)
5. Right sidebar: Order summary
6. Validation states (works client-side)

**Existing user actions:** Step navigation (works), form validation (works client-side), place order (redirects to confirmation, clears localStorage cart).

**Data required:** Customer info, delivery info, cart items, pricing.

**Functionality currently missing:** Real order creation in database, stock deduction, inventory update, order ID generation, payment record (COD), email/SMS notification (optional).

**Should be connected to:** `POST /api/orders`

---

### PAGE: Order Confirmation (order-confirmation.html)
**Purpose:** Post-order success feedback.
**Existing UI sections:** Success icon, order ID, date, total, delivery info, ordered products, Track Order + Continue Shopping buttons.
**Data required:** Order ID, items, totals, delivery info.
**Functionality currently missing:** Dynamic order lookup (currently static hard-coded).
**Should be connected to:** `GET /api/orders/:id`

---

### PAGE: My Orders (orders.html)
**Purpose:** Customer order history and tracking.
**Existing UI sections:**
1. Order cards (4 sample orders)
2. Each card: order ID, date, items count, total, payment method, status badge
3. Visual progress tracker (Pending → Confirmed → Packed → Delivered)
4. View Details button

**Data required:** Orders for logged-in user, statuses, items summary.
**Functionality currently missing:** Real order history per user, real-time status tracking, order detail view.
**Should be connected to:** `GET /api/orders/mine`, `GET /api/orders/:id`

---

### PAGE: About (about.html)
**Purpose:** Brand trust-building.
**Existing UI sections:** Our Story, Stats (40+ years, 200+ products, 50K+ customers, 1L+ orders), Why Choose Us, Mission banner.
**Data required:** Static content (may be stored in settings/DB for admin editing).
**Functionality currently missing:** None critical — static page acceptable.
**Should be connected to:** Static or `GET /api/settings` for contact info.

---

### PAGE: Contact (contact.html)
**Purpose:** Customer support / enquiries.
**Existing UI sections:** Info card, contact form (validated), map placeholder.
**Existing user actions:** Form submit (shows toast, no DB storage).
**Data required:** Contact messages.
**Functionality currently missing:** Saving messages to database, admin viewing messages, real map embed.
**Should be connected to:** `POST /api/contact`

---

### PAGE: Login (login.html)
**Purpose:** Customer authentication.
**Existing UI sections:** Split-screen auth layout, email/phone + password, remember me, forgot password link, register link.
**Data required:** User credentials.
**Functionality currently missing:** Real authentication, sessions, password hashing.
**Should be connected to:** `POST /api/auth/login`

---

### PAGE: Register (register.html)
**Purpose:** Customer signup.
**Existing UI sections:** Full name, email, phone, password, confirm password, terms checkbox.
**Data required:** New user record.
**Functionality currently missing:** Real user creation, duplicate email/phone checks, password hashing.
**Should be connected to:** `POST /api/auth/register`

---

### PAGE: Admin Dashboard (admin.html)
**Purpose:** Business management console.
**Existing UI sections (JS-switched panels):**

| Section | Existing UI |
|---------|-------------|
| Dashboard | KPI cards (Total Sales ₹4,82,500, Orders 1,248, Products 214, Customers 3,562), Sales overview bar chart (12 months), Orders-by-status donut, Recent orders table, Low stock alerts list, Top-selling products table, Category-wise sales donut |
| Products | Table (image, name, category, price, stock, status, actions), Add Product modal with full form |
| Categories | Table (category, product count, status, actions), Add Category modal |
| Orders | Status filter tabs (All/Pending/Confirmed/Packed/Delivered/Cancelled), Table (ID, customer, date, items, amount, status, view), Order detail modal with progress tracker |
| Customers | Table (customer, email, phone, orders, total spent, status) |
| Inventory | Table (product, current stock, status pill, reorder level, last updated) |
| Sales Reports | Monthly bar chart, download/period buttons |
| Settings | Shop config form (name, phone, address, delivery charge, free delivery threshold, GST, low-stock threshold) |

**Data required:** All business data — real products, orders, customers, inventory, settings.
**Functionality currently missing:** Real authentication, live data, real CRUD, real charts from DB, order status updates that affect data, low stock based on actual thresholds.
**Should be connected to:** All admin APIs (see Section 9).

---

# 2. EXISTING PAGES AND FEATURES (Summary)

| Feature | Status in UI | Needs Backend |
|---------|-------------|---------------|
| Navbar (sticky, responsive, hamburger) | ✅ Complete | No |
| Cart icon with count | ✅ Works (localStorage) | Sync with server |
| Hero + fireworks animation | ✅ Complete | No |
| Trust cards | ✅ Complete | Static |
| Category cards | ✅ Complete | Serve from DB |
| Product cards | ✅ Complete | Serve from DB |
| Add to Cart | ✅ Works (localStorage) | Persist to server |
| Festival banner | ✅ Complete | Static |
| Combo sections (₹500/1000/2000) | ✅ UI only | DB + logic |
| Reviews | ✅ Static | Serve from DB |
| Location + map placeholder | ✅ Placeholder | Embed real map |
| Footer | ✅ Complete | Static |
| Shop filters/sort/search | ⚠️ Visual only | Wire to API |
| Grid/List toggle | ✅ Works | No |
| Pagination | ⚠️ Visual only | Wire to API |
| Product gallery thumbs | ✅ Works | Serve images |
| Product tabs | ✅ Works | Serve data |
| Cart qty/remove | ✅ Works (localStorage) | Sync |
| Checkout steps/validation | ✅ Client-side works | Create real order |
| Order confirmation | ❌ Hard-coded | Dynamic |
| My Orders + progress | ❌ Hard-coded | Dynamic per user |
| Contact form | ⚠️ Toast only | Save to DB |
| Login/Register | ❌ No auth | Real auth |
| Admin KPIs/charts | ❌ Hard-coded | Calculate from DB |
| Admin CRUD tables | ❌ Static rows | Real CRUD |
| Admin modals | ✅ UI works | Wire to API |
| Admin settings form | ⚠️ UI only | Save to DB |

---

# 3. MISSING FUNCTIONALITY (Gap Analysis)

1. **No database** — all data hard-coded
2. **No backend/API** — no server, no endpoints
3. **No authentication** — login/register are visual only
4. **No session handling** — no user identity
5. **Cart is browser-only** — not synced to account
6. **No real order creation** — checkout doesn't create records
7. **No inventory updates** — stock never changes
8. **No admin CRUD** — tables are static HTML
9. **No dynamic dashboard** — KPIs/charts are hard-coded numbers
10. **No search/filter/sort logic** — UI controls are decorative
11. **No coupon validation**
12. **No image upload** — product images are Unsplash URLs
13. **No file storage management**
14. **No review submission**
15. **No contact message storage** — admin can't see messages
16. **No real map embed**
17. **No combo logic** — combo cards don't build carts
18. **No order status updates** from admin UI to customer UI
19. **No low-stock alerts** based on live thresholds
20. **No error/loading/empty states** for server data

---

# 4. FINAL SYSTEM ARCHITECTURE

```
┌─────────────────────────────────────────────────────────────┐
│                    CUSTOMER WEBSITE (Frontend)              │
│  Home · Shop · Product Details · Categories · Cart ·       │
│  Checkout · Confirmation · My Orders · Login · Register    │
│  About · Contact                                           │
└──────────────────────────┬──────────────────────────────────┘
                           │ HTTPS (Fetch API)
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                        BACKEND API                          │
│  Node.js + Express (REST API)                               │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Auth  │ Products │ Categories │ Cart │ Orders      │   │
│  │ Users │ Inventory│ Reviews    │ Combos│ Contact     │   │
│  │ Dashboard│ Reports│ Settings  │ Auth │ Admin       │   │
│  └─────────────────────────────────────────────────────┘   │
└──────────────────────────┬──────────────────────────────────┘
                           │ MySQL2 (parameterized queries)
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                      MYSQL DATABASE                         │
│  users · admins · categories · products · inventory ·      │
│  cart · cart_items · orders · order_items · reviews ·      │
│  contact_messages · combos · combo_items · sessions        │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                     ADMIN PANEL (Frontend)                  │
│  Admin Login · Dashboard · Products · Categories ·         │
│  Orders · Customers · Inventory · Reports · Settings       │
└─────────────────────────────────────────────────────────────┘
```

**Layout:** Multi-page frontend (current HTML pages) + REST API backend + MySQL database + JWT/session authentication.

---

# 5. CUSTOMER USER FLOW

```
START: Home
  │
  ├── Click "Shop Crackers" / "Explore Collection" / Category Card
  ▼
SHOP PAGE
  │  - Load products from GET /api/products (with filters)
  │  - Search / Filter by category / price / availability / discount
  │  - Sort by price / rating / newest
  │  - Grid/List toggle
  │  - Pagination
  ▼
PRODUCT DETAILS   (from product card click)
  │  - Load product via GET /api/products/:id
  │  - View gallery, description, specs, safety, reviews
  │  - Select quantity (validated against stock)
  │  - Click "Add to Cart"
  ▼
ADD TO CART LOGIC
  1. Validate availability (stock > 0)
  2. Validate quantity (1 ≤ qty ≤ stock)
  3. If logged in → POST /api/cart (server cart)
     If guest → store in localStorage (or require login at checkout)
  4. Update cart count badge
  5. Show success toast: "Added to cart"
  │
  ├── Continue shopping → back to Shop
  ├── Click cart icon
  ▼
CART PAGE
  │  - Load cart items (server if logged in / localStorage if guest)
  │  - Change quantity (re-validate stock)
  │  - Remove item
  │  - Apply coupon (optional)
  │  - See Subtotal / Discount / Delivery / Grand Total
  ▼
PROCEED TO CHECKOUT
  │
  ├── If NOT logged in → redirect to Login (with "continue checkout" redirect)
  ▼
CHECKOUT (4 steps)
  1. Customer Details (name, phone, email) — must be connected to user
  2. Delivery Details (address, city, state, pincode)
  3. Order Review (items, quantities, prices)
  4. Place Order
     - Server: validate all items still in stock
     - Server: validate quantities ≤ stock
     - Server: calculate subtotal, discount, delivery, GST, grand total
     - Server: create order (status = Pending)
     - Server: create order_items
     - Server: decrement inventory stock
     - Server: clear cart
     - Return order_id
  ▼
ORDER CONFIRMATION PAGE
  │  - Load order via GET /api/orders/:id
  │  - Show order ID, items, totals, delivery info
  ▼
MY ORDERS
  │  - Load via GET /api/orders/mine
  │  - View order status via progress tracker
  ▼
ORDER TRACKING
  - Status transitions: Pending → Confirmed → Packed → Delivered
  - Updated by admin; customer sees live status
```

---

# 6. ADMIN USER FLOW

```
START: Admin Login (admin-login.html or admin.html shows login first)
  │  - POST /api/admin/login
  │  - Verify credentials (email + hashed password)
  │  - Role must be 'admin'
  │  - Create admin session/token
  ▼
ADMIN DASHBOARD (default landing)
  │  - GET /api/admin/dashboard/stats → KPI cards (real values)
  │  - GET /api/admin/dashboard/sales-overview → monthly chart
  │  - GET /api/admin/dashboard/orders-by-status → donut chart
  │  - GET /api/admin/dashboard/top-products → top sellers
  │  - GET /api/admin/dashboard/category-sales → category donut
  │  - GET /api/admin/dashboard/recent-orders → recent table
  │  - GET /api/admin/inventory/low-stock → low stock alerts
  │
  ├── PRODUCTS
  │    • GET /api/admin/products (paginated, searchable)
  │    • POST /api/admin/products → Add
  │    • PUT /api/admin/products/:id → Edit (price, discount, stock, status)
  │    • DELETE /api/admin/products/:id → Delete
  │    • POST image upload
  │
  ├── CATEGORIES
  │    • GET /api/admin/categories (with product counts)
  │    • POST /api/admin/categories → Add
  │    • PUT /api/admin/categories/:id → Edit
  │    • DELETE /api/admin/categories/:id → Delete (block if products exist OR soft-deactivate)
  │
  ├── ORDERS
  │    • GET /api/admin/orders?status=&q= → list with filters
  │    • GET /api/admin/orders/:id → full detail
  │    • PUT /api/admin/orders/:id/status → update status
  │       (Pending → Confirmed → Packed → Delivered / Cancelled)
  │
  ├── CUSTOMERS
  │    • GET /api/admin/customers?q= → searchable list
  │    • Each row: order count, total spent, status (from DB)
  │
  ├── INVENTORY
  │    • GET /api/admin/inventory → stock levels
  │    • PUT /api/admin/inventory/:id → update stock / reorder level
  │    • Low/Out status derived automatically from stock vs reorder level
  │
  ├── SALES REPORTS
  │    • GET /api/admin/reports/monthly?year=
  │    • GET /api/admin/reports/top-products
  │    • GET /api/admin/reports/category-wise
  │    • GET /api/admin/reports/order-stats
  │    • Export CSV/PDF (optional)
  │
  └── SETTINGS
       • GET /api/admin/settings
       • PUT /api/admin/settings → shop name, phone, address, delivery charge, free delivery threshold, GST, low-stock threshold
```

---

# 7. COMPLETE DATABASE SCHEMA

## Table: users
| Column | Type | Key | Null | Default | Description |
|--------|------|-----|------|---------|-------------|
| id | INT UNSIGNED | PK, AUTO_INCREMENT | No | — | User ID |
| full_name | VARCHAR(100) | — | No | — | Customer full name |
| email | VARCHAR(120) | UNIQUE | No | — | Login email |
| phone | VARCHAR(15) | UNIQUE | No | — | Phone number |
| password_hash | VARCHAR(255) | — | No | — | bcrypt hash |
| address | VARCHAR(255) | — | Yes | NULL | Default address |
| city | VARCHAR(80) | — | Yes | NULL | City |
| state | VARCHAR(80) | — | Yes | NULL | State |
| pincode | VARCHAR(10) | — | Yes | NULL | Pincode |
| status | ENUM('active','inactive') | — | No | 'active' | User status |
| created_at | DATETIME | — | No | CURRENT_TIMESTAMP | Registered date |

## Table: admins
| Column | Type | Key | Null | Default | Description |
|--------|------|-----|------|---------|-------------|
| id | INT UNSIGNED | PK, AUTO_INCREMENT | No | — | Admin ID |
| full_name | VARCHAR(100) | — | No | — | Admin name |
| email | VARCHAR(120) | UNIQUE | No | — | Admin login email |
| password_hash | VARCHAR(255) | — | No | — | bcrypt hash |
| role | ENUM('super_admin','manager') | — | No | 'manager' | Admin role |
| status | ENUM('active','inactive') | — | No | 'active' | Admin status |
| last_login | DATETIME | — | Yes | NULL | Last login time |
| created_at | DATETIME | — | No | CURRENT_TIMESTAMP | Creation date |

## Table: categories
| Column | Type | Key | Null | Default | Description |
|--------|------|-----|------|---------|-------------|
| id | INT UNSIGNED | PK, AUTO_INCREMENT | No | — | Category ID |
| name | VARCHAR(100) | UNIQUE | No | — | Category name |
| description | TEXT | — | Yes | NULL | Short description |
| image_url | VARCHAR(255) | — | Yes | NULL | Category image URL |
| status | ENUM('active','inactive') | — | No | 'active' | Visibility status |
| created_at | DATETIME | — | No | CURRENT_TIMESTAMP | Creation date |

## Table: products
| Column | Type | Key | Null | Default | Description |
|--------|------|-----|------|---------|-------------|
| id | INT UNSIGNED | PK, AUTO_INCREMENT | No | — | Product ID |
| category_id | INT UNSIGNED | FK → categories.id | No | — | Category |
| name | VARCHAR(150) | — | No | — | Product name |
| sku | VARCHAR(50) | UNIQUE | Yes | NULL | Stock keeping unit |
| description | TEXT | — | Yes | NULL | Long description |
| short_description | VARCHAR(255) | — | Yes | NULL | Card description |
| price | DECIMAL(10,2) | — | No | — | Selling price |
| old_price | DECIMAL(10,2) | — | Yes | NULL | MRP (for discount display) |
| discount_percent | DECIMAL(5,2) | — | Yes | 0 | Computed or stored discount |
| main_image | VARCHAR(255) | — | Yes | NULL | Primary image URL |
| images_json | JSON | — | Yes | NULL | Additional images |
| rating_avg | DECIMAL(3,2) | — | Yes | 0 | Average rating (computed) |
| rating_count | INT | — | Yes | 0 | Number of ratings |
| status | ENUM('active','inactive') | — | No | 'active' | Product status |
| is_featured | TINYINT(1) | — | No | 0 | Featured on home |
| created_at | DATETIME | — | No | CURRENT_TIMESTAMP | Creation date |
| updated_at | DATETIME | — | No | CURRENT_TIMESTAMP ON UPDATE | Last update |

## Table: inventory
| Column | Type | Key | Null | Default | Description |
|--------|------|-----|------|---------|-------------|
| id | INT UNSIGNED | PK, AUTO_INCREMENT | No | — | Inventory ID |
| product_id | INT UNSIGNED | FK → products.id, UNIQUE | No | — | Product |
| quantity | INT | — | No | 0 | Current stock |
| reorder_level | INT | — | No | 20 | Low-stock threshold |
| last_updated | DATETIME | — | No | CURRENT_TIMESTAMP ON UPDATE | Last stock change |

## Table: cart
| Column | Type | Key | Null | Default | Description |
|--------|------|-----|------|---------|-------------|
| id | INT UNSIGNED | PK, AUTO_INCREMENT | No | — | Cart ID |
| user_id | INT UNSIGNED | FK → users.id, UNIQUE | No | — | Owner (1 cart per user) |
| created_at | DATETIME | — | No | CURRENT_TIMESTAMP | Creation date |
| updated_at | DATETIME | — | No | CURRENT_TIMESTAMP ON UPDATE | Last update |

## Table: cart_items
| Column | Type | Key | Null | Default | Description |
|--------|------|-----|------|---------|-------------|
| id | INT UNSIGNED | PK, AUTO_INCREMENT | No | — | Item ID |
| cart_id | INT UNSIGNED | FK → cart.id | No | — | Cart |
| product_id | INT UNSIGNED | FK → products.id | No | — | Product |
| quantity | INT | — | No | 1 | Quantity |
| price_at_add | DECIMAL(10,2) | — | No | — | Price snapshot |
| created_at | DATETIME | — | No | CURRENT_TIMESTAMP | Added date |
| UNIQUE(cart_id, product_id) | — | — | — | — | Prevents duplicates |

## Table: orders
| Column | Type | Key | Null | Default | Description |
|--------|------|-----|------|---------|-------------|
| id | INT UNSIGNED | PK, AUTO_INCREMENT | No | — | Order ID |
| order_number | VARCHAR(30) | UNIQUE | No | — | Human-readable (#VC-2026-XXXX) |
| user_id | INT UNSIGNED | FK → users.id | No | — | Customer |
| full_name | VARCHAR(100) | — | No | — | Snapshot: customer name |
| phone | VARCHAR(15) | — | No | — | Snapshot: phone |
| email | VARCHAR(120) | — | No | — | Snapshot: email |
| address | VARCHAR(255) | — | No | — | Delivery address |
| city | VARCHAR(80) | — | No | — | City |
| state | VARCHAR(80) | — | No | — | State |
| pincode | VARCHAR(10) | — | No | — | Pincode |
| subtotal | DECIMAL(10,2) | — | No | — | Sum of items |
| discount_amount | DECIMAL(10,2) | — | No | 0 | Coupon/discount |
| delivery_charge | DECIMAL(10,2) | — | No | 0 | Delivery fee |
| gst_amount | DECIMAL(10,2) | — | No | 0 | GST amount |
| grand_total | DECIMAL(10,2) | — | No | — | Final amount |
| coupon_code | VARCHAR(30) | — | Yes | NULL | Applied coupon |
| payment_method | ENUM('cod','upi','card') | — | No | 'cod' | Payment type |
| payment_status | ENUM('pending','paid','failed','refunded') | — | No | 'pending' | Payment state |
| status | ENUM('pending','confirmed','packed','delivered','cancelled') | — | No | 'pending' | Order status |
| created_at | DATETIME | — | No | CURRENT_TIMESTAMP | Order date |
| updated_at | DATETIME | — | No | CURRENT_TIMESTAMP ON UPDATE | Status update time |

## Table: order_items
| Column | Type | Key | Null | Default | Description |
|--------|------|-----|------|---------|-------------|
| id | INT UNSIGNED | PK, AUTO_INCREMENT | No | — | Item ID |
| order_id | INT UNSIGNED | FK → orders.id | No | — | Order |
| product_id | INT UNSIGNED | FK → products.id | No | — | Product |
| product_name | VARCHAR(150) | — | No | — | Snapshot |
| product_image | VARCHAR(255) | — | Yes | NULL | Snapshot |
| price | DECIMAL(10,2) | — | No | — | Unit price at order |
| quantity | INT | — | No | — | Qty ordered |
| total | DECIMAL(10,2) | — | No | — | price × qty |

## Table: reviews
| Column | Type | Key | Null | Default | Description |
|--------|------|-----|------|---------|-------------|
| id | INT UNSIGNED | PK, AUTO_INCREMENT | No | — | Review ID |
| user_id | INT UNSIGNED | FK → users.id | No | — | Reviewer |
| product_id | INT UNSIGNED | FK → products.id | No | — | Product |
| rating | TINYINT | — | No | — | 1–5 stars |
| review_text | TEXT | — | Yes | NULL | Review body |
| status | ENUM('pending','approved','rejected') | — | No | 'pending' | Moderation |
| created_at | DATETIME | — | No | CURRENT_TIMESTAMP | Review date |
| UNIQUE(user_id, product_id) | — | — | — | — | One review per user per product |

## Table: contact_messages
| Column | Type | Key | Null | Default | Description |
|--------|------|-----|------|---------|-------------|
| id | INT UNSIGNED | PK, AUTO_INCREMENT | No | — | Message ID |
| name | VARCHAR(100) | — | No | — | Sender name |
| email | VARCHAR(120) | — | No | — | Sender email |
| phone | VARCHAR(15) | — | Yes | NULL | Sender phone |
| subject | VARCHAR(150) | — | No | — | Subject |
| message | TEXT | — | No | — | Message body |
| status | ENUM('new','read','replied') | — | No | 'new' | Admin handling |
| created_at | DATETIME | — | No | CURRENT_TIMESTAMP | Received date |

## Table: combos (Festival Combo feature)
| Column | Type | Key | Null | Default | Description |
|--------|------|-----|------|---------|-------------|
| id | INT UNSIGNED | PK, AUTO_INCREMENT | No | — | Combo ID |
| name | VARCHAR(100) | — | No | — | Combo name (Starter/Family/Grand) |
| price | DECIMAL(10,2) | — | No | — | Combo price (500/1000/2000) |
| description | TEXT | — | Yes | NULL | Description |
| tag | VARCHAR(50) | — | Yes | NULL | e.g. "Most Popular" |
| status | ENUM('active','inactive') | — | No | 'active' | Availability |
| created_at | DATETIME | — | No | CURRENT_TIMESTAMP | Creation date |

## Table: combo_items
| Column | Type | Key | Null | Default | Description |
|--------|------|-----|------|---------|-------------|
| id | INT UNSIGNED | PK, AUTO_INCREMENT | No | — | Item ID |
| combo_id | INT UNSIGNED | FK → combos.id | No | — | Combo |
| product_id | INT UNSIGNED | FK → products.id | No | — | Product |
| quantity | INT | — | No | 1 | Qty included |
| UNIQUE(combo_id, product_id) | — | — | — | — | Prevents duplicates |

## Table: settings
| Column | Type | Key | Null | Default | Description |
|--------|------|-----|------|---------|-------------|
| id | INT UNSIGNED | PK, AUTO_INCREMENT | No | — | Setting ID |
| setting_key | VARCHAR(50) | UNIQUE | No | — | e.g. shop_name |
| setting_value | TEXT | — | No | — | Value |
| updated_at | DATETIME | — | No | CURRENT_TIMESTAMP ON UPDATE | Last update |

Pre-seed keys: `shop_name`, `shop_phone`, `shop_email`, `shop_address`, `delivery_charge`, `free_delivery_threshold`, `gst_percent`, `low_stock_threshold`, `about_text`, `map_embed_url`.

## Table: coupons (optional but useful)
| Column | Type | Key | Null | Default | Description |
|--------|------|-----|------|---------|-------------|
| id | INT UNSIGNED | PK, AUTO_INCREMENT | No | — | Coupon ID |
| code | VARCHAR(30) | UNIQUE | No | — | e.g. DIWALI10 |
| discount_type | ENUM('percent','fixed') | — | No | 'percent' | Type |
| discount_value | DECIMAL(10,2) | — | No | — | Value |
| min_order_amount | DECIMAL(10,2) | — | Yes | NULL | Minimum subtotal |
| max_discount | DECIMAL(10,2) | — | Yes | NULL | Cap |
| valid_from | DATETIME | — | Yes | NULL | Start |
| valid_to | DATETIME | — | Yes | NULL | End |
| usage_limit | INT | — | Yes | NULL | Total uses |
| used_count | INT | — | No | 0 | Uses so far |
| status | ENUM('active','inactive') | — | No | 'active' | Status |

---

# 8. DATABASE RELATIONSHIPS

```
users 1 ─── 1 cart
cart 1 ──── N cart_items
cart_items N ─── 1 products

users 1 ──── N orders
orders 1 ──── N order_items
order_items N ─── 1 products

categories 1 ──── N products
products 1 ──── 1 inventory

users 1 ──── N reviews
reviews N ─── 1 products

combos 1 ──── N combo_items
combo_items N ─── 1 products

contact_messages (independent)
admins (independent)
settings (independent, key-value)
```

### Relationship Details

| Relationship | Type | Cardinality | Explanation |
|-------------|------|-------------|-------------|
| User → Cart | One-to-One | 1 user : 1 cart | Each user has exactly one active cart |
| Cart → Cart Items | One-to-Many | 1 cart : N items | Cart contains multiple items |
| Cart Items → Product | Many-to-One | N items : 1 product | Each item references one product |
| User → Orders | One-to-Many | 1 user : N orders | User places many orders |
| Order → Order Items | One-to-Many | 1 order : N items | Order contains line items |
| Order Items → Product | Many-to-One | N items : 1 product | Line item references product |
| Category → Product | One-to-Many | 1 category : N products | Category groups many products |
| Product → Inventory | One-to-One | 1 product : 1 inventory | Each product has exactly one stock row |
| User → Reviews | One-to-Many | 1 user : N reviews | User writes many reviews |
| Product → Reviews | One-to-Many | 1 product : N reviews | Product receives many reviews |
| Combo → Combo Items | One-to-Many | 1 combo : N items | Combo contains many products |
| Combo Items → Product | Many-to-One | N items : 1 product | Combo references products |

**Many-to-Many (via junction tables):**
- Products ↔ Combos via `combo_items` (a product can be in many combos; a combo has many products)
- Products ↔ Carts via `cart_items`
- Products ↔ Orders via `order_items`

---

# 9. API STRUCTURE

Base URL: `/api`

## PUBLIC APIs (no auth)
| Method | Endpoint | Purpose | Request Data | Response Data |
|--------|----------|---------|--------------|---------------|
| GET | /api/products | List products with filters | query: category_id, q, price_min, price_max, availability, discount, sort, page, limit | { products[], total, page, totalPages } |
| GET | /api/products/:id | Product details | path: id | { product, images[], specs, reviewsSummary } |
| GET | /api/products/:id/reviews | Product reviews | path: id, query: page | { reviews[], ratingAvg, ratingCount } |
| GET | /api/products/:id/related | Related products | path: id, query: limit | { products[] } |
| GET | /api/categories | All active categories | — | { categories[] } |
| GET | /api/categories/:id/products | Products in category | path: id, query: page | { products[], total } |
| GET | /api/combos | Active festival combos | — | { combos[], each with items } |
| GET | /api/combos/:id | Single combo detail | path: id | { combo, items[] } |
| GET | /api/reviews/latest | Home testimonials | query: limit | { reviews[] } |
| GET | /api/home | Home page aggregate | — | { featured[], categories[], combos[], testimonials[], stats } |
| POST | /api/contact | Submit contact message | { name, email, phone, subject, message } | { success, messageId } |
| GET | /api/public/settings | Non-sensitive settings | — | { shopName, phone, email, address, hours, mapEmbedUrl } |

## CUSTOMER APIs (requires user JWT/session)
| Method | Endpoint | Purpose | Request Data | Response Data |
|--------|----------|---------|--------------|---------------|
| POST | /api/auth/register | Create account | { fullName, email, phone, password } | { token, user } |
| POST | /api/auth/login | Login | { email_or_phone, password } | { token, user } |
| POST | /api/auth/logout | Logout | — | { success } |
| GET | /api/auth/me | Current user profile | — | { user } |
| GET | /api/cart | Get my cart | — | { items[], subtotal } |
| POST | /api/cart/items | Add to cart | { productId, quantity } | { cart } |
| PUT | /api/cart/items/:productId | Update quantity | { quantity } | { cart } |
| DELETE | /api/cart/items/:productId | Remove item | — | { cart } |
| DELETE | /api/cart | Clear cart | — | { success } |
| POST | /api/coupon/validate | Validate coupon | { code, subtotal } | { discountAmount } |
| POST | /api/orders | Place order | { items (or cart), address, city, state, pincode, paymentMethod, couponCode } | { orderId, orderNumber, grandTotal } |
| GET | /api/orders/mine | My orders | query: page | { orders[] } |
| GET | /api/orders/:id | Order detail (own only) | path: id | { order, items[], statusHistory } |
| POST | /api/reviews | Submit review (after purchased) | { productId, rating, reviewText } | { success, reviewId } |
| PUT | /api/users/profile | Update profile | { fullName, phone, address, city, state, pincode } | { user } |
| PUT | /api/users/password | Change password | { currentPassword, newPassword } | { success } |

## ADMIN APIs (requires admin JWT/session)
| Method | Endpoint | Purpose | Request Data | Response Data |
|--------|----------|---------|--------------|---------------|
| POST | /api/admin/auth/login | Admin login | { email, password } | { token, admin } |
| GET | /api/admin/dashboard/stats | KPI cards | — | { totalSales, totalOrders, totalProducts, totalCustomers, growth... } |
| GET | /api/admin/dashboard/sales-overview | Monthly sales chart | query: year | { months[] } |
| GET | /api/admin/dashboard/orders-by-status | Status donut | — | { pending, confirmed, packed, delivered, cancelled } |
| GET | /api/admin/dashboard/top-products | Top sellers | query: limit | { products[] } |
| GET | /api/admin/dashboard/category-sales | Category sales | — | { categories[], amounts[] } |
| GET | /api/admin/dashboard/recent-orders | Recent orders table | query: limit | { orders[] } |
| GET | /api/admin/products | All products (paginated) | query: page, q, category_id, status | { products[], total } |
| POST | /api/admin/products | Add product | { name, categoryId, price, oldPrice, description, stock, status, images, sku } | { product } |
| PUT | /api/admin/products/:id | Update product | same as above | { product } |
| DELETE | /api/admin/products/:id | Delete product | — | { success } |
| POST | /api/admin/products/:id/images | Upload image | multipart file | { imageUrl } |
| GET | /api/admin/categories | All categories + counts | — | { categories[], each with productCount } |
| POST | /api/admin/categories | Add category | { name, description, image, status } | { category } |
| PUT | /api/admin/categories/:id | Update category | same | { category } |
| DELETE | /api/admin/categories/:id | Delete/deactivate | — | { success } |
| GET | /api/admin/orders | All orders | query: status, q, date_from, date_to, page | { orders[], total } |
| GET | /api/admin/orders/:id | Order detail | path: id | { order, items[], customer, address, statusHistory } |
| PUT | /api/admin/orders/:id/status | Update status | { status } | { order } |
| GET | /api/admin/customers | All customers | query: q, page | { customers[], each with orderCount, totalSpent } |
| GET | /api/admin/inventory | Inventory list | query: status (low/out/all) | { inventory[], with product info } |
| PUT | /api/admin/inventory/:productId | Update stock / reorder | { quantity, reorderLevel } | { inventory } |
| GET | /api/admin/reports/monthly | Monthly sales | query: year | { months[], totals[] } |
| GET | /api/admin/reports/top-products | Top selling products | query: period | { products[] } |
| GET | /api/admin/reports/category-wise | Category sales | — | { data[] } |
| GET | /api/admin/reports/order-stats | Order statistics | — | { total, byStatus, avgValue } |
| GET | /api/admin/settings | Get settings | — | { settings{} } |
| PUT | /api/admin/settings | Update settings | { key: value... } | { success } |
| GET | /api/admin/contact-messages | Enquiries list | query: status | { messages[] } |
| PUT | /api/admin/contact-messages/:id/status | Mark read/replied | { status } | { success } |
| GET | /api/admin/combos | Combo management | — | { combos[] } |
| POST | /api/admin/combos | Create combo | { name, price, description, tag, items[] } | { combo } |
| PUT | /api/admin/combos/:id | Update combo | same | { combo } |
| DELETE | /api/admin/combos/:id | Delete combo | — | { success } |

---

# 10. AUTHENTICATION & AUTHORIZATION

## Customer Auth
- **Registration:** Email and phone must be unique. Password hashed with **bcrypt** (10 rounds).
- **Login:** Accepts email OR phone + password. Issues a **JWT** (expires 7 days) or server session.
- **Session storage:** JWT stored in `localStorage` (simple for demo) — or `httpOnly` cookie (more secure; recommend cookie for the mini project to be safe).
- **Guard:** All `/api/cart/*`, `/api/orders/*`, `/api/users/*`, `/api/auth/me` require valid token.
- **Ownership checks:** `GET /api/orders/:id` — verify `order.user_id === req.user.id`. Otherwise 403.
- **Cart isolation:** Each user sees only their own cart.

## Admin Auth
- **Separate table** (`admins`), separate login endpoint.
- JWT with `role: 'admin'` claim.
- Middleware `requireAdmin` checks token + role.
- All `/api/admin/*` routes use `requireAdmin`.
- Admin UI: `admin.html` shows login form first if no token. Dashboard hidden until authenticated.

## Authorization Matrix
| Resource | Guest | Customer | Admin |
|----------|-------|----------|-------|
| Browse products/categories | ✅ | ✅ | ✅ |
| Product details/reviews | ✅ | ✅ | ✅ |
| Add to cart | ✅ (local only) | ✅ (server) | ✅ |
| Checkout / place order | ❌ (must login) | ✅ | ✅ |
| View own orders | ❌ | ✅ | ✅ |
| View other users' orders | ❌ | ❌ (403) | ✅ |
| Submit review | ❌ | ✅ | ✅ |
| Admin dashboard | ❌ | ❌ (403) | ✅ |
| Product CRUD | ❌ | ❌ | ✅ |
| Order status update | ❌ | ❌ | ✅ |
| Inventory update | ❌ | ❌ | ✅ |
| Settings update | ❌ | ❌ | ✅ |

## Password Rules (Server-side)
- Minimum 8 characters
- At least 1 letter + 1 number
- Never store plain text — only bcrypt hash
- Never return hash in responses

---

# 11. CART AND CHECKOUT LOGIC

## Cart Logic
| Scenario | Rule |
|----------|------|
| Guest adds to cart | Store in localStorage; on login, **merge** localStorage cart into server cart |
| Logged-in user adds item | `POST /api/cart/items` — validates product active + stock > 0 |
| Quantity change | Must be 1 ≤ qty ≤ current stock; else error |
| Duplicate product | Update existing row quantity (UNIQUE constraint) |
| Price display | Show current price from DB at all times (price_at_add is a snapshot for order) |
| Max cart items | Configurable limit (e.g. 50) — prevent abuse |

## Checkout Flow (Server-Side `POST /api/orders`)
1. **Authenticate** user (JWT required)
2. **Load cart** from server (never trust client totals)
3. `IF cart empty → 400 "Cart is empty"`
4. For each item:
   - Validate product exists + active
   - Validate `quantity <= inventory.quantity` → else 409 "Insufficient stock for X"
5. Calculate:
   - `subtotal = Σ(price × qty)`
   - `discount_amount` (coupon if valid; see below)
   - `delivery_charge = 0` if `subtotal >= free_delivery_threshold` (from settings), else `delivery_charge` (from settings)
   - `gst_amount = (subtotal − discount) × (gst_percent/100)`
   - `grand_total = subtotal − discount + delivery_charge + gst_amount`
6. Validate customer/delivery fields (name, phone, email, address, city, state, pincode)
7. Generate `order_number` (e.g. `VC-2026-XXXX` where XXXX = zero-padded order ID or random)
8. Insert `orders` row (status = `pending`, payment_status = `pending` for COD)
9. Insert `order_items` rows (with product snapshots)
10. **Decrement inventory** for each item
11. **Clear cart**
12. Return `{ orderId, orderNumber, grandTotal }`
13. Frontend redirects to `order-confirmation.html?order=ORDER_NUMBER`

## Coupon Logic
- Validate code exists + active + within dates
- Apply `discount_type` (percent or fixed)
- Respect `min_order_amount` and `max_discount` cap
- Increment `used_count`
- Allow only one coupon per order

## Prevention Rules
| Issue | Prevention |
|-------|-----------|
| Ordering unavailable product | Check product.status = active |
| Ordering more than stock | Check qty ≤ inventory.quantity before insert |
| Negative quantities | Server always clamps / validates qty ≥ 1 |
| Invalid prices | Server uses DB price, never client price |
| Empty cart | Reject with 400 |
| Invalid customer details | Required field validation + email/phone format check |
| Duplicate order submission | Idempotency key OR disable button client-side + verify cart cleared |
| Viewing others' orders | Ownership check in route |

---

# 12. ORDER MANAGEMENT LOGIC

## Status Flow (Admin-Controlled)
```
Pending ────► Confirmed ────► Packed ────► Delivered
    │              │              │
    └──────────────┴──────────────┴──────► Cancelled
```

Valid transitions:
- Pending → Confirmed / Cancelled
- Confirmed → Packed / Cancelled
- Packed → Delivered / Cancelled
- Delivered → (final — no further changes)
- Cancelled → (final)

## Stock Restoration Rule
- **When an order is Cancelled:**
  - Restore inventory quantity for each `order_item` (only if order was not already delivered)
  - If already delivered → do NOT restore automatically (requires admin manual adjustment)
- **When an order is Confirmed/Packed/Delivered:**
  - Stock stays deducted (already deducted at order creation)

## Order Detail View (Admin)
- Customer snapshot (name, phone, email)
- Delivery address snapshot
- Items list (name, image, qty, unit price, line total)
- Subtotal / Discount / Delivery / GST / Grand Total
- Payment method + payment status
- Status timeline (created_at, confirmed_at, packed_at, delivered_at / cancelled_at)
- Update Status button (dropdown or "next status" button)

## Customer View
- My Orders: list of own orders, order_number, date, items count, total, status badge
- View Details: items, delivery info, progress tracker synced to status
- Progress tracker maps status → step (see Section 13)

---

# 13. INVENTORY LOGIC

## Status Determination (automatic, from DB)
```
IF quantity = 0                → "Out of Stock" (red)
ELSE IF quantity <= reorder_level → "Low Stock" (orange)
ELSE                           → "In Stock" (green)
```

## Stock Rules
| Event | Effect on inventory.quantity |
|-------|------------------------------|
| Order placed (pending) | −qty for each order_item |
| Order cancelled (before delivery) | +qty restored |
| Order cancelled (after delivery) | Manual admin adjustment only |
| Admin edits stock | Set to entered value |
| Admin sets reorder_level | Updates threshold (affects status display) |
| Product deleted | Cascade delete inventory row (or soft-delete product instead) |

## Low-Stock Notifications
- `GET /api/admin/inventory?status=low|out` filters by rule
- Dashboard "Low Stock Alerts" section calls this endpoint with threshold
- Optional: `low_stock_threshold` setting can flag global threshold; per-product `reorder_level` is primary

## Important Note
- Deduct stock **at order creation** (Pending) to prevent overselling.
- If order is cancelled, restore stock — dashboard inventory will reflect this live.

---

# 14. FESTIVAL COMBO LOGIC

## Data Structure
```
combos table           → combo row (name, price, tag, status)
combo_items table      → (combo_id, product_id, quantity)
```

Existing combos to seed:

| Combo | Price | Items |
|-------|-------|-------|
| Starter Combo | ₹500 | 6 Sparkler Packs, 4 Ground Chakkars, 2 Flower Pots, 1 gift wrap |
| Family Combo | ₹1,000 | 12 Sparklers, 8 Chakkars, 4 Flower Pots, 2 Rockets, free wrap+delivery |
| Grand Combo | ₹2,000 | 20 Sparklers, 12 Chakkars, 8 Flower Pots, 5 Rockets, premium box + free delivery |

## Customer Flow
```
Home → "Build My Combo" → Combo detail (GET /api/combos/:id)
  → Shows included products + quantities + combo price
  → "Add Combo to Cart"
      → For each combo_item: add product×qty to cart (validating stock)
      → Show toast: "Combo added to cart"
  → Proceed to checkout normally
```

## Combo Price Handling
- Combo has its own `price` (the discounted bundle price)
- The cart add operation could add items at individual prices, then apply a **combo discount** (price difference) — OR add a special "Combo Product" line.
- **Simplest approach for the mini project:** Add each included product×qty to cart at its normal price, then store `combo_discount = Σ(item prices) − combo.price` and apply as an automatic discount line in cart/checkout. This keeps inventory logic uniform.
- Alternative: create a hidden bundle product per combo. (More complex; not recommended.)

## Admin Combo Management
- CRUD combos (name, price, tag, status)
- Manage combo items (add/remove products + quantities)
- Combo price validation: warn admin if combo price > sum of item prices

---

# 15. ADMIN DASHBOARD LOGIC

All dashboard values are **computed from the database** (never hard-coded).

## KPI Cards (GET /api/admin/dashboard/stats)
| Card | SQL Logic |
|------|-----------|
| Total Sales | `SUM(grand_total) FROM orders WHERE status != 'cancelled'` |
| Total Orders | `COUNT(*) FROM orders` |
| Total Products | `COUNT(*) FROM products WHERE status = 'active'` |
| Total Customers | `COUNT(*) FROM users WHERE status = 'active'` |
| Growth % | Compare current month vs previous month (period-over-period) |

## Sales Overview (Monthly Chart)
```
SELECT MONTH(created_at) AS month, SUM(grand_total) AS total
FROM orders
WHERE status != 'cancelled' AND YEAR(created_at) = ?
GROUP BY MONTH(created_at)
```
Returns 12 values → bar chart.

## Orders by Status (Donut)
```
SELECT status, COUNT(*) FROM orders GROUP BY status
```

## Top-Selling Products
```
SELECT p.name, p.image, SUM(oi.quantity) AS units_sold,
       SUM(oi.total) AS revenue
FROM order_items oi
JOIN orders o ON o.id = oi.order_id
JOIN products p ON p.id = oi.product_id
WHERE o.status != 'cancelled'
GROUP BY p.id
ORDER BY units_sold DESC
LIMIT 5
```

## Category-wise Sales
```
SELECT c.name, SUM(oi.total) AS amount
FROM order_items oi
JOIN orders o ON o.id = oi.order_id
JOIN products p ON p.id = oi.product_id
JOIN categories c ON c.id = p.category_id
WHERE o.status != 'cancelled'
GROUP BY c.id
```

## Recent Orders
```
SELECT o.*, u.full_name
FROM orders o JOIN users u ON u.id = o.user_id
ORDER BY o.created_at DESC
LIMIT 5
```

## Low Stock Alerts
```
SELECT p.id, p.name, p.image, i.quantity, i.reorder_level
FROM inventory i
JOIN products p ON p.id = i.product_id
WHERE i.quantity <= i.reorder_level
ORDER BY i.quantity ASC
```

---

# 16. UI ISSUES AND IMPROVEMENTS

| # | Current Issue | Required Fix | Priority |
|---|--------------|--------------|----------|
| 1 | Product images are unrelated Unsplash photos (nature, landscapes) | Use real cracker/festival product images (download real festive product photos or generate branded placeholder images) | HIGH |
| 2 | Dashboard KPIs are hard-coded (₹4,82,500 etc.) | Compute from DB via API | HIGH |
| 3 | Charts are static CSS bars/donuts | Render from live API data (Chart.js) | HIGH |
| 4 | Order statuses in admin don't change data | Wire status updates to DB, refresh tables | HIGH |
| 5 | Add/Edit/Delete product buttons do nothing | Wire to CRUD APIs + refresh table | HIGH |
| 6 | Inventory shows static rows | Query inventory table, auto-compute status pills | HIGH |
| 7 | Settings form doesn't persist | Save to settings table | HIGH |
| 8 | Login/Register forms don't authenticate | Connect to auth API + session storage | HIGH |
| 9 | Cart is localStorage-only | Merge with server cart for logged-in users | HIGH |
| 10 | Place Order doesn't create records | Implement POST /api/orders | HIGH |
| 11 | Order confirmation page is static | Fetch order by number from API | HIGH |
| 12 | My Orders is static | Fetch user's real orders | HIGH |
| 13 | Contact form only shows toast | Save to contact_messages; add admin view | HIGH |
| 14 | Search/filter/sort do nothing | Wire to query parameters on /api/products | HIGH |
| 15 | Pagination is decorative | Wire to API pagination | HIGH |
| 16 | Map is a placeholder | Embed Google Maps iframe with shop address | MEDIUM |
| 17 | Reviews are static text | Load from reviews table + allow customer submission | MEDIUM |
| 18 | Combo cards link to shop.html only | Create combo detail modal/page + add to cart | HIGH |
| 19 | Coupon input not functional | Implement coupon validation API | MEDIUM |
| 20 | Notify Me button on out-of-stock does nothing | Skip or implement stock-notify (optional) | LOW |
| 21 | Wishlist is visual only | Optionally store in user_profiles or skip; if kept, add wishlist table | LOW |
| 22 | Admin hamburger margin has small issue | Fix mobile admin sidebar toggle visibility (CSS: `.admin-hamburger { display: block }` at mobile) | MEDIUM |
| 23 | Toast messages may overlap on mobile | Stack properly (already handled) | LOW |
| 24 | Product card image heights inconsistent across cards | Standardize image aspect-ratio / object-fit | MEDIUM |
| 25 | Order summary in checkout is static example | Calculate from real cart | HIGH |

---

# 17. RESPONSIVE DESIGN PLAN

The existing CSS already handles most responsive behavior. Confirm/extend:

| Component | Desktop | Tablet (≤1024px) | Mobile (≤768px) |
|-----------|---------|------------------|-----------------|
| Navbar | Full links + actions | Hamburger + compact | Hamburger only |
| Mobile menu | Hidden | Slide-down drawer | Slide-down drawer |
| Hero | 2-column | Single column, stacked | Single column |
| Product grid | 3 columns | 2 columns | 1 column |
| Shop filters | Sticky sidebar | Hidden, toggle button | Bottom-sheet style panel |
| Cart | 2-column (items+summary) | Stacked | Stacked, sticky checkout bar |
| Checkout | 2-column | Single column | Single column, sticky summary |
| Forms | 2-col grid | 2-col/1-col | 1 column |
| Tables (customer) | Full table | Horizontal scroll | Cards |
| Admin sidebar | Fixed left | Off-canvas (slides in) | Off-canvas + overlay |
| Admin tables | Full table | Horizontal scroll | Horizontal scroll (min-width) |
| Dashboard charts | 2-col grids | 1-col stacked | 1-col stacked |
| Admin topbar search | Visible | Hidden | Hidden |

**New requirements to add:**
- Admin table wrapper uses `overflow-x: auto` (already in CSS `.table-wrap`)
- Add admin mobile overlay backdrop when sidebar opens
- Sticky mobile "Proceed to Checkout" bar on cart page for better UX
- Apply `aspect-ratio` on product images for consistent card heights

---

# 18. SECURITY REQUIREMENTS

| Layer | Requirement |
|-------|-------------|
| Passwords | bcrypt hash (10 rounds), never plain text, never returned |
| Sessions | JWT (access token) with expiry; or server-side session with httpOnly cookie |
| Authorization | role-based middleware: `requireAuth` (customer), `requireAdmin` (admin) |
| SQL Injection | Use **prepared statements / parameterized queries** (mysql2 `?` placeholders) — never string-concatenate |
| Input validation | Server-side validation on every endpoint (not just client-side) |
| XSS | Escape/sanitize all user input before rendering; use textContent or escape HTML in templates |
| CSRF | If using cookies, add CSRF protection; if using JWT in Authorization header, CSRF risk is reduced |
| Route protection | Admin routes must reject tokens without admin role (403) |
| Order privacy | Order route checks `order.user_id === req.user.id` |
| Cart privacy | Cart route fetches cart by `req.user.id` only |
| File upload | Validate file type (jpg/png/webp), size limit (≤2MB), store outside web root or with random names |
| Rate limiting | Simple: limit login attempts (e.g. 5 per 15 min) |
| Error messages | Generic server errors — don't leak SQL details |
| HTTPS | Required in production; localhost is fine for development |
| Secrets | `.env` file for DB credentials + JWT secret — never commit |

---

# 19. ER DIAGRAM SPECIFICATION

```
┌───────────┐      1       ┌────────┐      1      N ┌────────────┐
│   users   │◄─────────────┤  cart  │──────────────►│ cart_items │
└───────────┘              └────────┘               └─────┬──────┘
      │                                                   │ N
      │ 1                                                 │
      │ N                                                 │ 1
┌───────────┐       ┌────────────┐               ┌───────┴────┐
│  orders   │   N   │ order_items│──────────────►│  products  │
└───────────┘ ─────►└────────────┘               └─────┬─────┘
      │                                                │
      │ 1                                               │ 1
      │                                                │
      │ N                                          ┌────┴────┐
┌───────────┐  ┌───────────┐               ┌───────┤inventory│
│  reviews  │  │   combos  │               │ N     └─────────┘
└─────┬─────┘  └─────┬─────┘               │
      │ N            │ 1                  │ 1
      │              │ N                  │
      │         ┌────┴──────┐        ┌────┴──────┐
      └────────►│combo_items│────────►│categories │
                └───────────┘         └───────────┘

┌───────────────┐  ┌───────────────┐  ┌──────────────┐
│ contact_messages│  │     admins     │  │   settings   │
└───────────────┘  └───────────────┘  └──────────────┘
  (independent)      (independent)      (key-value)
```

### Relationship Summary
| Entity A | Entity B | Type | Via |
|----------|----------|------|-----|
| User | Cart | 1:1 | cart.user_id |
| Cart | Cart Item | 1:N | cart_items.cart_id |
| Cart Item | Product | N:1 | cart_items.product_id |
| User | Order | 1:N | orders.user_id |
| Order | Order Item | 1:N | order_items.order_id |
| Order Item | Product | N:1 | order_items.product_id |
| Category | Product | 1:N | products.category_id |
| Product | Inventory | 1:1 | inventory.product_id |
| User | Review | 1:N | reviews.user_id |
| Product | Review | 1:N | reviews.product_id |
| Combo | Combo Item | 1:N | combo_items.combo_id |
| Combo Item | Product | N:1 | combo_items.product_id |
| Product | Combo | M:N | combo_items (junction) |
| Product | Cart | M:N | cart_items (junction) |
| Product | Order | M:N | order_items (junction) |

---

# 20. RECOMMENDED TECHNOLOGY STACK

**Note on current project:** The existing site is pure HTML/CSS/JS (static). No framework is currently used.

For a college consultancy mini-project, recommend the following **simple, easy-to-demonstrate, full-stack** stack:

| Layer | Technology | Why |
|-------|-----------|-----|
| Frontend | HTML5 + CSS3 + Vanilla JS (current) OR minimal Bootstrap 5 for speed | Preserves current design system, easy to explain |
| Frontend Data Loading | `fetch()` API + template literals | No build step needed, simple |
| Backend | **Node.js + Express** | Simple, popular, easy to demo |
| OR alternative | **PHP (core + PDO)** | Even simpler for some colleges; connects natively to MySQL |
| Database | **MySQL** (via mysql2 driver for Node, or PDO for PHP) | Required/recommended by task; relational fits perfectly |
| Authentication | bcrypt + JWT (jsonwebtoken) | Simple stateless auth |
| File Uploads | Multer (Node) | Easy image upload for products |
| Charts | Chart.js (CDN) | Clean charts for dashboard |
| Icons | Font Awesome (already used) | Keep consistent |
| Toasts | Custom (already built) | Keep consistent |
| Environment | `.env` for secrets, `dotenv` | Good practice |
| Deployment | Localhost + optional shared hosting (or cPanel) | Easy for college demo |
| Version Control | Git + GitHub | Standard practice |

### Alternative (even simpler) option
- **XAMPP + PHP + MySQL** — single folder `htdocs`, no npm install needed, very easy to run on any lab PC.
- If the college requires, PHP with mysqli/PDO is the easiest to demonstrate CRUD and MySQL.

### Recommended final (primary) stack
```
Frontend:  Current HTML/CSS/JS pages + fetch()
Backend:   Node.js + Express
Database:  MySQL (mysql2 with prepared statements)
Auth:      bcrypt + jsonwebtoken
Charts:    Chart.js (CDN)
Uploads:   Multer
Run:       npm install && npm start
```

---

# 21. COMPLETE DEVELOPMENT ROADMAP

## PHASE 1 — Project Setup
**Tasks:**
- Create folder structure: `backend/`, `backend/routes/`, `backend/controllers/`, `backend/middleware/`, `backend/config/`, `uploads/`
- Initialize `package.json`, install express, mysql2, bcrypt, jsonwebtoken, multer, dotenv, cors
- Add `.env` (PORT, DB_HOST, DB_USER, DB_PASS, DB_NAME, JWT_SECRET)
- Update `admin.html`/pages to use `/api` endpoints later
**Files affected:** backend/*, .env, package.json
**Dependencies:** Node.js, npm
**Expected output:** Express server starts, connects to MySQL

## PHASE 2 — Database
**Tasks:**
- Create database `vendhan_crackers`
- Write `schema.sql` (all tables from Section 7)
- Write `seed.sql` (6 categories, 12+ products, inventory rows, 3 combos, sample users/admins, settings, sample orders)
- Test with MySQL Workbench / CLI
**Files affected:** backend/config/schema.sql, backend/config/seed.sql
**Dependencies:** MySQL installed
**Expected output:** Fully seeded database

## PHASE 3 — Authentication
**Tasks:**
- `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me`
- `POST /api/admin/auth/login`
- bcrypt hashing, JWT issue/verify, `requireAuth` + `requireAdmin` middleware
- Update login.html/register.html to call API, store token, redirect
- Owner-ship guard on orders
**Files affected:** backend/routes/auth.js, backend/routes/adminAuth.js, backend/middleware/*.js, login.html, register.html
**Dependencies:** PHASE 2
**Expected output:** Users/admins can register, log in, access protected routes

## PHASE 4 — Product & Category Management
**Tasks:**
- `GET /api/products` (filters, sort, page), `GET /api/products/:id`, related
- `GET /api/categories`
- Admin CRUD: products + categories + image upload
- Wire shop.html to live product cards from API
- Wire admin Products and Categories sections
**Files affected:** backend/routes/products.js, categories.js, adminProducts.js; shop.html, product-details.html, admin.html
**Dependencies:** PHASE 2
**Expected output:** Real products displayed & manageable by admin

## PHASE 5 — Customer Shopping Flow
**Tasks:**
- Home page aggregate endpoint (`GET /api/home`)
- Wire hero, categories, featured, combos, testimonials from DB
- Contact form → `POST /api/contact`
- Map embed (replace placeholder)
**Files affected:** index.html, contact.html, backend/routes/home.js, contact.js
**Dependencies:** PHASE 4
**Expected output:** Home/About/Contact driven by real data

## PHASE 6 — Cart & Checkout
**Tasks:**
- Server cart APIs (`GET/POST/PUT/DELETE /api/cart/*`)
- Merge localStorage cart on login
- Coupon validate endpoint
- `POST /api/orders` — full order creation with calculations, stock deduction, cart clear
- Wire cart.html, checkout.html to live APIs
- Dynamic order summary calculations
**Files affected:** backend/routes/cart.js, orders.js, coupons.js; cart.html, checkout.html, js/main.js
**Dependencies:** PHASE 3, 4
**Expected output:** Full purchase flow works end-to-end

## PHASE 7 — Order Management
**Tasks:**
- `GET /api/orders/mine`, `GET /api/orders/:id`
- Admin: list all orders, filter by status/search, view detail, update status
- Status transitions (Pending → Confirmed → Packed → Delivered / Cancelled)
- Cancellation restores stock
- Wire orders.html (My Orders) + progress trackers
- Wire order-confirmation.html dynamic lookup
- Wire admin Orders section + modal
**Files affected:** backend/routes/orders.js, adminOrders.js; orders.html, order-confirmation.html, admin.html
**Dependencies:** PHASE 6
**Expected output:** Orders appear in customer + admin views with live status

## PHASE 8 — Inventory
**Tasks:**
- `GET /api/admin/inventory`, `PUT /api/admin/inventory/:productId`
- Status pill logic (In/Low/Out) computed from `quantity` vs `reorder_level`
- Low-stock endpoint for dashboard alerts
- Wire admin Inventory section
**Files affected:** backend/routes/inventory.js; admin.html
**Dependencies:** PHASE 2, 4
**Expected output:** Live inventory with alerts

## PHASE 9 — Admin Dashboard
**Tasks:**
- All dashboard endpoints (stats, sales overview, orders by status, top products, category sales, recent orders)
- Chart.js integration replacing static CSS charts
- KPI cards from real data
- Low-stock widget from real data
**Files affected:** backend/routes/dashboard.js; admin.html
**Dependencies:** PHASE 4–8
**Expected output:** Real-time admin dashboard

## PHASE 10 — Reports
**Tasks:**
- Monthly sales report endpoint
- Top products, category-wise, order stats
- Date-range filter (optional)
- Wire Sales Reports section
**Files affected:** backend/routes/reports.js; admin.html
**Dependencies:** PHASE 9
**Expected output:** Usable sales reports

## PHASE 11 — Festival Combo
**Tasks:**
- `GET /api/combos`, `GET /api/combos/:id`
- Combo detail modal/page on home
- "Add Combo to Cart" → adds all included products, applies combo discount
- Admin combo CRUD (`/api/admin/combos`)
- Wire combo cards + admin Combo management (new sidebar item or under Products)
**Files affected:** backend/routes/combos.js, adminCombos.js; index.html, cart.html, admin.html
**Dependencies:** PHASE 6
**Expected output:** Working Festival Combo feature (₹500/1000/2000)

## PHASE 12 — Testing
**Tasks:**
- Test all customer flows (browse → search → filter → add → cart → checkout → orders)
- Test all admin flows (CRUD, status updates, inventory)
- Test validation/error cases (empty cart, insufficient stock, duplicate email, wrong password)
- Test responsive on mobile/tablet/desktop
- Manual test checklist document
**Files affected:** all
**Dependencies:** PHASE 1–11
**Expected output:** Bug-free demonstration build

## PHASE 13 — Deployment
**Tasks:**
- Local demo: `npm start` + MySQL running
- Optional: deploy to free host (Railway/Render for Node, or cPanel PHP)
- Set production env variables
- Create README with setup instructions
**Files affected:** README.md, .env.example
**Dependencies:** PHASE 12
**Expected output:** Runnable deployment + documentation

## PHASE 14 — Documentation
**Tasks:**
- This blueprint as project documentation
- ER diagram image
- README (setup, credentials for demo admin)
- Presentation/slides structure for viva
- Screenshots of final working app
**Files affected:** docs/
**Dependencies:** PHASE 13
**Expected output:** Complete handover-ready project

---

# 22. FINAL PROJECT FEATURE LIST

## Customer Website
1. ✅ Home (hero, categories, featured, combos, reviews, location, footer)
2. ✅ Shop with real search/filter/sort/pagination
3. ✅ Product details with gallery, specs, safety, reviews
4. ✅ Categories browsing
5. ✅ Cart (server-backed, qty, remove, coupon)
6. ✅ Checkout (4-step, validated, order summary)
7. ✅ Order confirmation (dynamic)
8. ✅ My Orders + status progress tracking
9. ✅ Login / Register (real auth)
10. ✅ About + Contact (contact saved to DB)
11. ✅ Build Your Festival Combo (₹500/₹1,000/₹2,000) — functional add-to-cart

## Admin Panel
12. ✅ Admin Login (separate)
13. ✅ Dashboard (real KPIs + charts)
14. ✅ Products CRUD (+ image upload)
15. ✅ Categories CRUD
16. ✅ Orders (filter, view, update status)
17. ✅ Customers (search, totals)
18. ✅ Inventory (stock levels, reorder, alerts)
19. ✅ Sales Reports (charts)
20. ✅ Settings (persisted)
21. ✅ Contact Messages inbox (optional but recommended)

## Business Logic
22. ✅ Low stock alerts (automatic by threshold)
23. ✅ Stock deduction on order + restore on cancel
24. ✅ Order total calculation (subtotal − discount + delivery + GST)
25. ✅ Coupon system
26. ✅ Role-based authorization (customer vs admin)

---

# 23. SUGGESTED MINI-PROJECT / VIVA EXPLANATION

## One-Sentence Summary
> "Vendhan Crackers is a full-stack e-commerce web application for an Indian fireworks shop, featuring an online storefront for customers and a management dashboard for the shop owner — built with Node.js, Express, and MySQL."

## Suggested Viva Q&A

**Q: What problem does your project solve?**
> Crackers shops traditionally operate offline. Customers must visit the shop to browse and buy. Our system lets the shop (Vendhan Crackers) reach customers online — customers can browse products, build festival combos, place orders, and track delivery. The owner gets a dashboard to manage products, inventory, orders, and sales reports.

**Q: What are the two main modules?**
> 1. Customer Website — browse, filter, search, cart, checkout, order tracking
> 2. Admin Panel — product/category CRUD, order status management, inventory, low-stock alerts, sales reports, settings

**Q: What special feature did you implement?**
> "Build Your Festival Combo" — customers pick a budget (₹500 / ₹1,000 / ₹2,000), view the included products, and add the full combo to cart with one click. This is a real business feature that drives higher order value.

**Q: What is your database design?**
> Normalized relational MySQL database with tables: users, admins, categories, products, inventory, carts, cart_items, orders, order_items, reviews, contact_messages, combos, combo_items, settings. Relationships are enforced with foreign keys.

**Q: How is security handled?**
> Passwords are hashed with bcrypt. Authentication uses JWT tokens. Admin routes are protected by middleware that checks the admin role. All SQL uses prepared statements to prevent injection. Orders are access-controlled so customers can only view their own orders.

**Q: Explain the order calculation.**
> Subtotal = sum of (price × qty). Discount is applied from a valid coupon. Delivery is free above a threshold (from settings), otherwise a flat charge. GST is added as a percentage. Grand total = subtotal − discount + delivery + GST.

**Q: How does inventory work?**
> Each product has a quantity and reorder level. When stock = 0, status is "Out of Stock". When stock ≤ reorder level, it's "Low Stock". When an order is placed, stock decreases automatically. If the order is cancelled before delivery, stock is restored.

**Q: What is the tech stack?**
> Frontend: HTML5, CSS3, JavaScript (existing design preserved). Backend: Node.js with Express. Database: MySQL. Authentication: bcrypt + JWT. Charts: Chart.js.

**Q: What did you learn?**
> Full-stack development (frontend + backend + database), REST API design, relational database normalization, authentication & authorization, CRUD operations, inventory management logic, and building a complete business application from a UI prototype.