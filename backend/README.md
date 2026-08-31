# VENDHAN CRACKERS — Backend Foundation (Phase 1)

**Project:** Vendhan Crackers — "Celebrate Together"
**Stack:** Node.js + Express + MongoDB + Mongoose + JWT + bcrypt

---

## Table of Contents

1. [Folder Structure](#folder-structure)
2. [Folder Responsibilities](#folder-responsibilities)
3. [Model Relationships](#model-relationships)
4. [Database Indexes](#database-indexes)
5. [Setup Instructions](#setup-instructions)
6. [Testing Instructions](#testing-instructions)
7. [Security](#security)

---

## Folder Structure

```
backend/
│
├── config/
│   ├── database.js          # MongoDB connection (connectDB, disconnectDB)
│   └── seed.js              # Seed script (npm run seed)
│
├── models/
│   ├── User.js              # Customer model
│   ├── Admin.js             # Admin model
│   ├── Category.js          # Category model
│   ├── Product.js           # Product model
│   ├── Cart.js              # Cart model
│   ├── Order.js             # Order model
│   ├── Review.js            # Review model
│   ├── ContactMessage.js    # Contact message model
│   ├── Combo.js             # Combo model
│   ├── Setting.js           # Shop settings model
│   └── index.js             # Model registry
│
├── controllers/             # Request handlers (added in later phases)
│   └── .gitkeep
│
├── routes/                  # Route definitions (added in later phases)
│
├── middleware/
│   └── errorHandler.js      # Centralized error handling
│
├── services/                # Business logic (added in later phases)
│   └── .gitkeep
│
├── validators/              # Request validation (added in later phases)
│   └── .gitkeep
│
├── utils/
│   ├── ApiError.js          # Custom error class
│   ├── asyncHandler.js      # Async route wrapper
│   ├── calculatePricing.js  # Order pricing calculator
│   ├── generateOrderNumber.js # VC-YYYY-XXXX generator
│   ├── generateSlug.js      # URL slug generator
│   └── paginate.js          # Pagination helpers
│
├── uploads/                 # Uploaded product images
│   └── .gitkeep
│
├── app.js                   # Express app configuration
├── server.js                # Server entry point
├── package.json
├── .env                     # Environment variables (never commit)
└── .env.example             # Environment variable template
```

---

## Folder Responsibilities

| Folder | Responsibility |
|--------|---------------|
| `config/` | Database connection and seed data |
| `models/` | Mongoose schemas — defines the data structure |
| `controllers/` | Request handlers — receive req/res, call services, send responses |
| `routes/` | Route definitions — map HTTP methods + paths to controllers |
| `middleware/` | Cross-cutting concerns — auth, validation, error handling |
| `services/` | Business logic — reusable operations (order pipeline, pricing) |
| `validators/` | Request validation schemas |
| `utils/` | Helper functions — response formatting, pagination, slug generation |
| `uploads/` | Static storage for uploaded product images |

---

## Model Relationships

### ObjectId References (populated via Mongoose `populate()`)

| Relationship | Type | Reference Field | Description |
|-------------|------|-----------------|-------------|
| User → Cart | One-to-One | `Cart.user` | Each user has exactly one cart |
| User → Orders | One-to-Many | `Order.user` | A user can place many orders |
| User → Reviews | One-to-Many | `Review.user` | A user can write many reviews |
| Category → Products | One-to-Many | `Product.category` | A category contains many products |
| Product → Reviews | One-to-Many | `Review.product` | A product receives many reviews |
| Product → Cart Items | Many-to-Many | `Cart.items[].product` | Products appear in many carts |
| Product → Order Items | Many-to-Many | `Order.items[].product` | Products appear in many orders |
| Combo → Products | Many-to-Many | `Combo.items[].product` | Combos contain many products |

### Embedded Data (denormalized snapshots)

| Model | Embedded Field | Why |
|-------|---------------|-----|
| Cart | `items[].productName`, `items[].price` | Display cart without extra queries |
| Order | `customer` (name, phone, email) | Preserve customer info at time of purchase |
| Order | `deliveryAddress` | Preserve delivery address at time of purchase |
| Order | `items[].productName`, `items[].price` | Preserve product price/name at time of purchase |
| Order | `pricing` (subtotal, discount, delivery, GST, total) | Preserve exact pricing breakdown |
| Order | `statusHistory` | Track status change timeline |
| Combo | `items[].quantity` | Store combo product quantities |

---

## Database Indexes

| Model | Index | Type |
|-------|-------|------|
| User | `email` | Unique |
| User | `phone` | Unique |
| User | `status` | Regular |
| Admin | `email` | Unique |
| Admin | `role` | Regular |
| Admin | `status` | Regular |
| Category | `slug` | Unique |
| Category | `status` | Regular |
| Product | `slug` | Unique |
| Product | `category` | Regular |
| Product | `status` | Regular |
| Product | `price` | Regular |
| Product | `isFeatured + rating` | Compound |
| Cart | `user` | Unique |
| Order | `orderId` | Unique |
| Order | `user` | Regular |
| Order | `status` | Regular |
| Order | `createdAt` | Regular (descending) |
| Review | `user + product` | Unique compound |
| Review | `product` | Regular |
| Review | `status` | Regular |
| ContactMessage | `status` | Regular |
| ContactMessage | `createdAt` | Regular (descending) |
| Combo | `status` | Regular |
| Combo | `price` | Regular |

---

## Setup Instructions

### Prerequisites

- Node.js (v18 or higher)
- MongoDB (local or MongoDB Atlas)

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Configure Environment Variables

```bash
# Copy the example file
cp .env.example .env
```

Edit `.env` and set your values:

```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/vendhan_crackers
JWT_SECRET=your_strong_secret_key_here_min_32_chars
JWT_EXPIRES_IN=7d
CLIENT_URL=http://localhost:3000
NODE_ENV=development
```

### 3. Seed the Database

```bash
npm run seed
```

This creates:
- 1 Admin account
- 3 Sample customers
- 6 Categories
- 12 Products
- 3 Combos (Starter ₹500, Family ₹1,000, Grand ₹2,000)
- Shop settings
- Sample reviews, orders, and contact messages

**Seed credentials:**
| Role | Email | Password |
|------|-------|----------|
| Admin | admin@vendhancrackers.in | admin123 |
| Customer | ramesh@example.com | customer123 |

> **IMPORTANT:** The seed script checks if data already exists and aborts if the database is not empty. It will NEVER overwrite existing production data.

### 4. Start the Server

```bash
# Development (with auto-reload)
npm run dev

# Production
npm start
```

### 5. Verify the Server

Open your browser or use curl:

```bash
curl http://localhost:5000/api/health
```

Expected response:
```json
{
  "success": true,
  "message": "Vendhan Crackers API is running"
}
```

---

## Testing Instructions

### Test 1: Server Starts

```bash
npm run dev
```

Expected output:
```
✅ MongoDB connected: localhost/vendhan_crackers
🚀 Vendhan Crackers API running on http://localhost:5000
🌍 Environment: development
```

### Test 2: MongoDB Connects

The server will NOT start if MongoDB is not running. You should see:
```
❌ MongoDB connection failed: <error message>
```

### Test 3: /api/health Works

```bash
curl http://localhost:5000/api/health
```

Expected:
```json
{
  "success": true,
  "message": "Vendhan Crackers API is running"
}
```

### Test 4: All Models Load Successfully

```bash
npm run seed
```

If all models load correctly, you'll see:
```
✅ MongoDB connected
🧹 Database is empty. Starting seed...
✅ Admin created: admin@vendhancrackers.in
✅ Users created: 3
✅ Categories created: 6
✅ Products created: 12
✅ Combos created: 3
✅ Settings created
✅ Reviews created
✅ Orders created: 3
✅ Contact messages created
🎆 Seed completed successfully!
```

### Test 5: Seed Script Does Not Overwrite

Run `npm run seed` a second time. Expected:
```
⚠️  Database already contains data. Seed aborted to avoid overwriting.
```

### Test 6: Duplicate Email is Rejected

The User model has a unique index on `email`. Attempting to create two users with the same email will throw a duplicate key error (code 11000), which the error handler converts to a 409 response.

### Test 7: Invalid Product Values are Rejected

The Product model validates:
- `price >= 0`
- `stock >= 0`
- `discount` between 0 and 100
- `reorderLevel >= 0`

Attempting to create a product with `price: -10` will throw a Mongoose ValidationError.

### Test 8: Passwords are Hashed

The User and Admin models use a pre-save hook that hashes passwords with bcrypt (10 salt rounds). Check MongoDB:

```bash
mongosh
use vendhan_crackers
db.users.findOne({ email: 'ramesh@example.com' })
```

The `password` field will be a bcrypt hash like `$2a$10$...`, never plain text.

### Test 9: Password Fields are Not Exposed

The User and Admin models set `select: false` on the password field. Normal queries will NOT return the password field.

---

## Security

| Layer | Implementation |
|-------|---------------|
| Password hashing | bcrypt with 10 salt rounds (pre-save hooks on User and Admin) |
| Password exposure | `select: false` on password fields — never returned in queries |
| Security headers | `helmet` middleware |
| CORS | Restricted to `CLIENT_URL` from `.env` |
| Rate limiting | 300 requests / 15 minutes per IP on all `/api` routes |
| Request logging | `morgan` (dev format in development, combined in production) |
| Error responses | Centralized handler — no stack traces in production |
| Environment variables | All secrets in `.env`, never hard-coded |
| ObjectId validation | Mongoose `CastError` handled by error handler → 400 response |
| Duplicate key handling | Mongoose code 11000 → 409 response |
| JSON body limit | 10mb limit on `express.json()` |
| Graceful shutdown | SIGINT/SIGTERM handlers close server + DB connection |

---

## Commands Summary

| Command | Purpose |
|---------|---------|
| `npm install` | Install all dependencies |
| `npm run dev` | Start server with nodemon (auto-reload) |
| `npm start` | Start server in production mode |
| `npm run seed` | Seed the database with sample data |