# 🎆 Vendhan Crackers — Full-Stack E-Commerce Web Application

**Celebrate Brighter. Celebrate Together.**

A complete full-stack e-commerce web application for an Indian fireworks shop, featuring an online storefront for customers and a management dashboard for the shop owner.

---

## 📋 Project Overview

| Component | Technology |
|-----------|-----------|
| Frontend | HTML5, CSS3, Vanilla JavaScript |
| Backend | Node.js + Express |
| Database | **MongoDB** (Mongoose ODM) |
| Authentication | bcrypt + JWT |
| Charts | CSS-based (Chart.js ready) |

---

## 🚀 Quick Start

### Prerequisites
- Node.js (v14+)
- MongoDB (v4.4+ / v5+ / v6+)
- npm

### Step 1: Configure Environment

Edit `backend/.env`:

```
PORT=5000
MONGODB_URI=mongodb://localhost:27017/vendhan_crackers
JWT_SECRET=your_secret_key
JWT_EXPIRES=7d
```

### Step 2: Install Backend Dependencies

```bash
cd backend
npm install
```

### Step 3: Seed the Database

```bash
cd backend
npm run seed
```

This creates the `vendhan_crackers` database with all collections and sample data.

### Step 4: Start the Backend Server

```bash
cd backend
npm start
```

You should see:
```
✅ MongoDB connected
🚀 Vendhan Crackers API running on http://localhost:5000
```

### Step 5: Open the Website

Open `index.html` in your browser (or use a local server like Live Server in VS Code).

---

## 🔑 Demo Credentials

### Admin Login
- **URL:** `admin-login.html`
- **Email:** `admin@vendhancrackers.in`
- **Password:** `admin123`

### Customer Login
- **URL:** `login.html`
- **Email:** `ramesh@example.com` (or phone `9840012345`)
- **Password:** `customer123`

---

## 📁 Project Structure

```
Crackers shop/
├── index.html              → Home page
├── shop.html               → Product catalogue
├── product-details.html    → Product details
├── cart.html               → Shopping cart
├── checkout.html           → Multi-step checkout
├── order-confirmation.html → Order success
├── orders.html             → My Orders
├── about.html              → About Us
├── contact.html            → Contact
├── login.html              → Customer login
├── register.html           → Customer register
├── admin-login.html        → Admin login
├── admin.html              → Admin dashboard
├── css/
│   └── styles.css          → Design system
├── js/
│   ├── main.js             → UI interactions
│   ├── api.js              → API integration layer
│   └── pages.js            → Page-specific API calls
├── backend/
│   ├── server.js           → Express server
│   ├── config/
│   │   ├── db.js           → MongoDB connection
│   │   └── seed.js         → Sample data seeder
│   ├── models/
│   │   ├── User.js         → User model
│   │   └── index.js        → All Mongoose models
│   ├── middleware/
│   │   └── auth.js         → JWT auth middleware
│   └── routes/
│       ├── auth.js         → Customer auth
│       ├── adminAuth.js    → Admin auth
│       ├── products.js     → Public products
│       ├── categories.js   → Public categories
│       ├── home.js         → Home aggregate
│       ├── contact.js      → Contact messages
│       ├── combos.js       → Festival combos
│       ├── cart.js         → Customer cart
│       ├── orders.js       → Customer orders
│       ├── coupon.js       → Coupon validation
│       ├── adminDashboard.js → Admin KPIs
│       ├── adminProducts.js  → Product CRUD
│       ├── adminCategories.js → Category CRUD
│       ├── adminOrders.js    → Order management
│       ├── adminCustomers.js → Customer list
│       ├── adminInventory.js → Inventory management
│       ├── adminReports.js   → Sales reports
│       ├── adminSettings.js  → Shop settings
│       ├── adminContact.js   → Contact inbox
│       └── adminCombos.js    → Combo management
└── TECHNICAL_BLUEPRINT.md → Full technical documentation
```

---

## ✨ Features

### Customer Website
- Browse products with search, filter, sort, pagination
- Product details with gallery, specs, safety info, reviews
- Server-backed shopping cart
- 4-step checkout with validation
- Order confirmation + tracking
- Festival Combo Builder (₹500 / ₹1,000 / ₹2,000)
- Contact form (saved to database)
- Customer authentication (register/login)

### Admin Panel
- Real-time dashboard (KPIs, charts, recent orders, low stock)
- Product CRUD (add/edit/delete)
- Category management
- Order management (filter, view, update status)
- Customer management
- Inventory management (stock levels, reorder alerts)
- Sales reports
- Shop settings (delivery, GST, thresholds)
- Contact message inbox

### Business Logic
- Stock deduction on order + restore on cancel
- Low stock alerts (automatic by threshold)
- Order total calculation (subtotal − discount + delivery + GST)
- Coupon system
- Role-based authorization (customer vs admin)

---

## 🔒 Security

- Passwords hashed with **bcrypt** (10 rounds)
- JWT authentication with role-based middleware
- MongoDB injection prevention via **Mongoose ODM** (parameterized queries)
- Server-side validation on all endpoints
- Order privacy (customers can only view their own orders)
- Admin routes protected with `requireAdmin` middleware

---

## 📊 MongoDB Collections

| Collection | Purpose |
|-----------|---------|
| users | Customer accounts |
| admins | Admin accounts |
| categories | Product categories |
| products | Product catalog (with embedded stock) |
| carts | User carts with embedded items |
| orders | Customer orders with embedded items |
| reviews | Product reviews |
| contactmessages | Contact form submissions |
| combos | Festival combos with embedded items |
| settings | Shop configuration (key-value) |
| coupons | Discount coupons |

---

## 🧪 Testing

1. **Customer flow:** Register → Browse → Add to cart → Checkout → Track order
2. **Admin flow:** Login → View dashboard → Manage products → Update order status → Check inventory
3. **Combo flow:** Home → Build My Combo → Add to cart → Checkout
4. **Validation:** Try empty cart, insufficient stock, duplicate email, wrong password

---

## 📄 Documentation

See `TECHNICAL_BLUEPRINT.md` for the complete technical documentation including:
- System architecture
- Database schema & relationships
- API structure
- User flows
- Development roadmap
- Viva preparation guide

---

© 2026 Vendhan Crackers. All rights reserved. | Celebrate Brighter. Celebrate Together.