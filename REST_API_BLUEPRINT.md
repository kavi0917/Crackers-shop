# VENDHAN CRACKERS — REST API Blueprint
## Node.js + Express + MongoDB + Mongoose

**Project:** Vendhan Crackers — "Celebrate Together"
**Backend:** Node.js + Express.js
**Database:** MongoDB + Mongoose
**Authentication:** JWT + bcrypt
**Stage:** API Blueprint (implementation-ready)

---

# TABLE OF CONTENTS

1. [Authentication APIs](#1-authentication-apis)
2. [Product APIs](#2-product-apis)
3. [Category APIs](#3-category-apis)
4. [Cart APIs](#4-cart-apis)
5. [Checkout APIs](#5-checkout-apis)
6. [Order APIs](#6-order-apis)
7. [Customer APIs](#7-customer-apis)
8. [Inventory APIs](#8-inventory-apis)
9. [Review APIs](#9-review-apis)
10. [Festival Combo APIs](#10-festival-combo-apis)
11. [Contact APIs](#11-contact-apis)
12. [Admin Dashboard APIs](#12-admin-dashboard-apis)
13. [Sales Report APIs](#13-sales-report-apis)
14. [Settings APIs](#14-settings-apis)
15. [Middleware](#15-middleware)
16. [API Response Format](#16-api-response-format)
17. [Backend Project Structure](#17-backend-project-structure)
18. [Security](#18-security)
19. [API Documentation Table](#19-api-documentation-table)
20. [API Implementation Order](#20-api-implementation-order)

---

# 1. AUTHENTICATION APIs

## 1.1 Customer Authentication

### POST /api/auth/register
**Purpose:** Create a new customer account.

**Request Body:**
```json
{
  "fullName": "Ramesh Kumar",
  "email": "ramesh@example.com",
  "phone": "9840012345",
  "password": "customer123"
}
```

**Validation Rules:**
| Field | Rule |
|-------|------|
| fullName | Required, string, 2–100 characters |
| email | Required, valid email format, unique, lowercase |
| phone | Required, exactly 10 digits, unique |
| password | Required, min 8 characters, at least 1 letter + 1 number |

**Authentication:** None (public endpoint)

**Success Response (201 Created):**
```json
{
  "success": true,
  "message": "Account created successfully",
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "60f7c5e9d5a2b3c4d5e6f7a8",
    "fullName": "Ramesh Kumar",
    "email": "ramesh@example.com",
    "phone": "9840012345"
  }
}
```

**Error Responses:**
| Status | Condition |
|--------|-----------|
| 400 | Missing required fields / invalid email / invalid phone / weak password |
| 409 | Email already registered / phone already registered |
| 500 | Server error |

**Side Effects:**
- Password hashed with bcrypt (10 rounds)
- Empty Cart document created for the user
- JWT issued with `{ id, email, role: 'customer' }`, expires in 7 days

---

### POST /api/auth/login
**Purpose:** Authenticate a customer and receive a JWT.

**Request Body:**
```json
{
  "email_or_phone": "ramesh@example.com",
  "password": "customer123"
}
```

**Validation Rules:**
| Field | Rule |
|-------|------|
| email_or_phone | Required — accepts email OR 10-digit phone |
| password | Required |

**Authentication:** None (public endpoint)

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "60f7c5e9d5a2b3c4d5e6f7a8",
    "fullName": "Ramesh Kumar",
    "email": "ramesh@example.com",
    "phone": "9840012345"
  }
}
```

**Error Responses:**
| Status | Condition |
|--------|-----------|
| 400 | Missing email/phone or password |
| 401 | Invalid credentials |
| 403 | Account is inactive |
| 500 | Server error |

**Logic:**
1. Find user by `$or: [{ email }, { phone }]`
2. Verify password with `bcrypt.compare()`
3. Check `status === 'active'`
4. Issue JWT with `{ id, email, role: 'customer' }`

---

### POST /api/auth/logout
**Purpose:** Invalidate the customer's session.

**Request Body:** None

**Authentication:** Customer JWT required (`Authorization: Bearer <token>`)

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

**Implementation Note:** Since JWT is stateless, logout is client-side token removal. Optionally maintain a token blacklist in Redis or a `TokenBlacklist` collection for enhanced security.

**Error Responses:**
| Status | Condition |
|--------|-----------|
| 401 | Missing/invalid token |

---

### GET /api/auth/me
**Purpose:** Fetch the currently authenticated customer's profile.

**Request Body:** None

**Authentication:** Customer JWT required

**Success Response (200 OK):**
```json
{
  "success": true,
  "user": {
    "id": "60f7c5e9d5a2b3c4d5e6f7a8",
    "fullName": "Ramesh Kumar",
    "email": "ramesh@example.com",
    "phone": "9840012345",
    "address": "12, Gandhi Street, T. Nagar",
    "city": "Chennai",
    "state": "Tamil Nadu",
    "pincode": "600017",
    "status": "active",
    "createdAt": "2026-01-15T10:30:00.000Z"
  }
}
```

**Error Responses:**
| Status | Condition |
|--------|-----------|
| 401 | Missing/invalid token |
| 404 | User not found |
| 500 | Server error |

**Security:** `passwordHash` must NEVER be returned.

---

## 1.2 Admin Authentication

### POST /api/admin/auth/login
**Purpose:** Authenticate an admin and receive a JWT with `role: 'admin'`.

**Request Body:**
```json
{
  "email": "admin@vendhancrackers.in",
  "password": "admin123"
}
```

**Validation Rules:**
| Field | Rule |
|-------|------|
| email | Required, valid email format |
| password | Required |

**Authentication:** None (public endpoint)

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Admin login successful",
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "admin": {
    "id": "60f7c5e9d5a2b3c4d5e6f7a8",
    "fullName": "Vendhan Kumar",
    "email": "admin@vendhancrackers.in",
    "role": "super_admin"
  }
}
```

**Error Responses:**
| Status | Condition |
|--------|-----------|
| 400 | Missing email or password |
| 401 | Invalid admin credentials |
| 403 | Admin account is inactive |
| 500 | Server error |

**Logic:**
1. Find admin by email
2. Verify password with `bcrypt.compare()`
3. Check `status === 'active'`
4. Update `lastLogin` timestamp
5. Issue JWT with `{ id, email, role: 'admin' }`

---

### GET /api/admin/auth/me
**Purpose:** Fetch the currently authenticated admin's profile.

**Request Body:** None

**Authentication:** Admin JWT required

**Success Response (200 OK):**
```json
{
  "success": true,
  "admin": {
    "id": "60f7c5e9d5a2b3c4d5e6f7a8",
    "fullName": "Vendhan Kumar",
    "email": "admin@vendhancrackers.in",
    "role": "super_admin",
    "status": "active",
    "lastLogin": "2026-08-13T06:00:00.000Z"
  }
}
```

**Error Responses:**
| Status | Condition |
|--------|-----------|
| 401 | Missing/invalid admin token |
| 404 | Admin not found |
| 500 | Server error |

**Security:** `passwordHash` must NEVER be returned.

---

# 2. PRODUCT APIs

## 2.1 Public Product APIs

### GET /api/products
**Purpose:** List active products with filtering, search, sorting, and pagination.

**Request Body:** None

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| q | string | Search by name or shortDescription (case-insensitive regex) |
| category_id | string | Filter by category ObjectId |
| price_min | number | Minimum price |
| price_max | number | Maximum price |
| availability | string | `in_stock` \| `low_stock` \| `out_of_stock` |
| discount | number | Minimum discount percent (e.g. `10` = 10%+ off) |
| sort | string | `featured` (default) \| `price_asc` \| `price_desc` \| `rating` \| `newest` |
| page | number | Page number (default 1) |
| limit | number | Items per page (default 9, max 50) |

**Authentication:** None (public endpoint)

**Success Response (200 OK):**
```json
{
  "success": true,
  "products": [
    {
      "id": "60f7c5e9d5a2b3c4d5e6f7a8",
      "name": "Deluxe Sparkler Pack (50 pcs)",
      "sku": "VC-SP-001",
      "shortDescription": "50 premium sparklers with golden glow",
      "price": 249,
      "oldPrice": 310,
      "discountPercent": 20,
      "mainImage": "https://...",
      "ratingAvg": 4.8,
      "ratingCount": 320,
      "category_id": "60f7c5e9d5a2b3c4d5e6f7b1",
      "category_name": "Sparklers",
      "stock": 120,
      "reorderLevel": 30,
      "stock_status": "in_stock"
    }
  ],
  "total": 12,
  "page": 1,
  "totalPages": 2
}
```

**Error Responses:**
| Status | Condition |
|--------|-----------|
| 500 | Server error |

**Filter Logic:**
- `q` → `$or: [{ name: { $regex: q, $options: 'i' } }, { shortDescription: { $regex: q, $options: 'i' } }]`
- `category_id` → `{ category: category_id }`
- `price_min` / `price_max` → `{ price: { $gte, $lte } }`
- `availability=in_stock` → `{ stock: { $gt: 0 } }`
- `availability=low_stock` → `{ stock: { $gt: 0, $lte: reorderLevel } }`
- `availability=out_of_stock` → `{ stock: 0 }`
- `discount` → `{ discountPercent: { $gte: Number(discount) } }`
- Always filter `{ status: 'active' }`

**Sort Logic:**
| sort value | Mongoose sort |
|------------|---------------|
| featured (default) | `{ isFeatured: -1, ratingAvg: -1 }` |
| price_asc | `{ price: 1 }` |
| price_desc | `{ price: -1 }` |
| rating | `{ ratingAvg: -1 }` |
| newest | `{ createdAt: -1 }` |

---

### GET /api/products/:id
**Purpose:** Fetch a single active product by ObjectId.

**Request Body:** None

**Path Parameters:** `id` — Product ObjectId

**Authentication:** None (public endpoint)

**Success Response (200 OK):**
```json
{
  "success": true,
  "product": {
    "id": "60f7c5e9d5a2b3c4d5e6f7a8",
    "name": "Deluxe Sparkler Pack (50 pcs)",
    "sku": "VC-SP-001",
    "description": "Our best-selling Deluxe Sparkler Pack...",
    "shortDescription": "50 premium sparklers with golden glow",
    "price": 249,
    "oldPrice": 310,
    "discountPercent": 20,
    "mainImage": "https://...",
    "images": ["https://...", "https://..."],
    "ratingAvg": 4.8,
    "ratingCount": 320,
    "category_id": "60f7c5e9d5a2b3c4d5e6f7b1",
    "category_name": "Sparklers",
    "stock": 120,
    "reorderLevel": 30,
    "stock_status": "in_stock"
  }
}
```

**Error Responses:**
| Status | Condition |
|--------|-----------|
| 404 | Product not found or inactive |
| 500 | Server error / invalid ObjectId |

---

### GET /api/products/slug/:slug
**Purpose:** Fetch a single active product by URL slug.

**Request Body:** None

**Path Parameters:** `slug` — Product slug (e.g. `deluxe-sparkler-pack-50-pcs`)

**Authentication:** None (public endpoint)

**Success Response (200 OK):** Same shape as `GET /api/products/:id`

**Error Responses:**
| Status | Condition |
|--------|-----------|
| 404 | Product not found or inactive |
| 500 | Server error |

**Implementation Note:** Requires adding a `slug` field to the Product model with a unique index. Generate slug from `name` on product creation.

---

### GET /api/products/:id/reviews
**Purpose:** Fetch approved reviews for a product.

**Request Body:** None

**Path Parameters:** `id` — Product ObjectId

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| page | number | Page number (default 1) |
| limit | number | Items per page (default 10) |

**Authentication:** None (public endpoint)

**Success Response (200 OK):**
```json
{
  "success": true,
  "reviews": [
    {
      "id": "60f7c5e9d5a2b3c4d5e6f7c1",
      "rating": 5,
      "reviewText": "These sparklers are amazing!",
      "full_name": "Ramesh Kumar",
      "createdAt": "2026-02-10T10:30:00.000Z"
    }
  ],
  "ratingAvg": 4.8,
  "ratingCount": 320,
  "total": 2,
  "page": 1,
  "totalPages": 1
}
```

**Error Responses:**
| Status | Condition |
|--------|-----------|
| 500 | Server error |

**Logic:** Query `Review.find({ product: id, status: 'approved' })`, populate `user` (only `fullName`), sort by `createdAt: -1`.

---

### GET /api/products/:id/related
**Purpose:** Fetch related products from the same category.

**Request Body:** None

**Path Parameters:** `id` — Product ObjectId

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| limit | number | Number of related products (default 3, max 8) |

**Authentication:** None (public endpoint)

**Success Response (200 OK):**
```json
{
  "success": true,
  "products": [
    {
      "id": "60f7c5e9d5a2b3c4d5e6f7a9",
      "name": "Classic Sparkler Combo (100 pcs)",
      "price": 390,
      "oldPrice": 600,
      "discountPercent": 35,
      "mainImage": "https://...",
      "ratingAvg": 4.2,
      "ratingCount": 75,
      "category_name": "Sparklers",
      "stock": 95,
      "stock_status": "in_stock"
    }
  ]
}
```

**Error Responses:**
| Status | Condition |
|--------|-----------|
| 404 | Product not found |
| 500 | Server error |

**Logic:** `Product.find({ category: product.category, _id: { $ne: product._id }, status: 'active' })`, sort by `ratingAvg: -1`, limit.

---

## 2.2 Admin Product APIs

### POST /api/admin/products
**Purpose:** Create a new product.

**Request Body:**
```json
{
  "name": "Deluxe Sparkler Pack (50 pcs)",
  "sku": "VC-SP-001",
  "categoryId": "60f7c5e9d5a2b3c4d5e6f7b1",
  "price": 249,
  "oldPrice": 310,
  "description": "Long description...",
  "shortDescription": "50 premium sparklers",
  "mainImage": "https://...",
  "images": ["https://...", "https://..."],
  "stock": 120,
  "reorderLevel": 30,
  "status": "active",
  "isFeatured": true
}
```

**Validation Rules:**
| Field | Rule |
|-------|------|
| name | Required, string |
| categoryId | Required, valid ObjectId, must exist |
| price | Required, number > 0 |
| sku | Optional, unique if provided |
| stock | Optional, integer ≥ 0 (default 0) |
| reorderLevel | Optional, integer ≥ 0 (default 20) |
| status | Optional, `active` \| `inactive` (default `active`) |

**Authentication:** Admin JWT required

**Success Response (201 Created):**
```json
{
  "success": true,
  "message": "Product created successfully",
  "id": "60f7c5e9d5a2b3c4d5e6f7a8"
}
```

**Error Responses:**
| Status | Condition |
|--------|-----------|
| 400 | Missing name/category/price, invalid data |
| 401 | Missing/invalid admin token |
| 409 | Duplicate SKU |
| 500 | Server error |

**Logic:**
- Auto-compute `discountPercent = ((oldPrice - price) / oldPrice) * 100` when `oldPrice > price`
- Auto-generate `slug` from `name`
- Create product document

---

### GET /api/admin/products
**Purpose:** List all products (including inactive) with pagination and search.

**Request Body:** None

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| page | number | Page number (default 1) |
| limit | number | Items per page (default 10) |
| q | string | Search by name or SKU |
| category_id | string | Filter by category |
| status | string | `active` \| `inactive` |

**Authentication:** Admin JWT required

**Success Response (200 OK):**
```json
{
  "success": true,
  "products": [
    {
      "id": "60f7c5e9d5a2b3c4d5e6f7a8",
      "name": "Deluxe Sparkler Pack (50 pcs)",
      "sku": "VC-SP-001",
      "price": 249,
      "oldPrice": 310,
      "discountPercent": 20,
      "mainImage": "https://...",
      "status": "active",
      "category_name": "Sparklers",
      "stock": 120,
      "stock_status": "in_stock"
    }
  ],
  "total": 12,
  "page": 1,
  "totalPages": 2
}
```

**Error Responses:**
| Status | Condition |
|--------|-----------|
| 401 | Missing/invalid admin token |
| 500 | Server error |

---

### GET /api/admin/products/:id
**Purpose:** Fetch a single product (including inactive) for admin editing.

**Request Body:** None

**Path Parameters:** `id` — Product ObjectId

**Authentication:** Admin JWT required

**Success Response (200 OK):**
```json
{
  "success": true,
  "product": {
    "id": "60f7c5e9d5a2b3c4d5e6f7a8",
    "name": "Deluxe Sparkler Pack (50 pcs)",
    "sku": "VC-SP-001",
    "category_id": "60f7c5e9d5a2b3c4d5e6f7b1",
    "category_name": "Sparklers",
    "price": 249,
    "oldPrice": 310,
    "discountPercent": 20,
    "description": "...",
    "shortDescription": "...",
    "mainImage": "https://...",
    "images": ["https://..."],
    "stock": 120,
    "reorderLevel": 30,
    "status": "active",
    "isFeatured": true,
    "createdAt": "2026-01-15T10:30:00.000Z",
    "updatedAt": "2026-08-01T10:30:00.000Z"
  }
}
```

**Error Responses:**
| Status | Condition |
|--------|-----------|
| 401 | Missing/invalid admin token |
| 404 | Product not found |
| 500 | Server error |

---

### PUT /api/admin/products/:id
**Purpose:** Update a product (full or partial update).

**Request Body:** Any subset of:
```json
{
  "name": "Updated Name",
  "sku": "VC-SP-001",
  "categoryId": "60f7c5e9d5a2b3c4d5e6f7b1",
  "price": 299,
  "oldPrice": 350,
  "description": "Updated description",
  "shortDescription": "Updated short description",
  "mainImage": "https://...",
  "images": ["https://..."],
  "stock": 150,
  "reorderLevel": 25,
  "status": "active",
  "isFeatured": false
}
```

**Authentication:** Admin JWT required

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Product updated successfully"
}
```

**Error Responses:**
| Status | Condition |
|--------|-----------|
| 400 | Invalid data |
| 401 | Missing/invalid admin token |
| 404 | Product not found |
| 409 | Duplicate SKU |
| 500 | Server error |

**Admin Capabilities via this endpoint:**
- Update price → `price`, `oldPrice`, auto-recompute `discountPercent`
- Update discount → `oldPrice` or direct `discountPercent`
- Update stock → `stock`
- Update category → `categoryId`
- Update product status → `status` (`active` / `inactive`)
- Update name, description, images, featured flag

---

### DELETE /api/admin/products/:id
**Purpose:** Delete a product.

**Request Body:** None

**Path Parameters:** `id` — Product ObjectId

**Authentication:** Admin JWT required

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Product deleted successfully"
}
```

**Error Responses:**
| Status | Condition |
|--------|-----------|
| 401 | Missing/invalid admin token |
| 404 | Product not found |
| 409 | Product has existing orders — must deactivate instead |
| 500 | Server error |

**Logic:**
1. Check if any Order contains this product in `items.product`
2. If yes → return 409 with message "Cannot delete product with existing orders. Deactivate instead."
3. Otherwise → delete product document

---

# 3. CATEGORY APIs

## 3.1 Public Category APIs

### GET /api/categories
**Purpose:** List all active categories with product counts.

**Request Body:** None

**Authentication:** None (public endpoint)

**Success Response (200 OK):**
```json
{
  "success": true,
  "categories": [
    {
      "id": "60f7c5e9d5a2b3c4d5e6f7b1",
      "name": "Sparklers",
      "description": "Bright golden sparklers for every celebration",
      "imageUrl": "https://...",
      "product_count": 3
    },
    {
      "id": "60f7c5e9d5a2b3c4d5e6f7b2",
      "name": "Flower Pots",
      "description": "Colourful fountains that bloom in the night sky",
      "imageUrl": "https://...",
      "product_count": 2
    }
  ]
}
```

**Error Responses:**
| Status | Condition |
|--------|-----------|
| 500 | Server error |

**Logic:** `Category.find({ status: 'active' })`, for each category count active products.

**Existing categories to seed:**
- Sparklers
- Flower Pots
- Rockets
- Ground Chakkars
- Fancy Crackers
- Gift Boxes

---

### GET /api/categories/:id
**Purpose:** Fetch a single active category.

**Request Body:** None

**Path Parameters:** `id` — Category ObjectId

**Authentication:** None (public endpoint)

**Success Response (200 OK):**
```json
{
  "success": true,
  "category": {
    "id": "60f7c5e9d5a2b3c4d5e6f7b1",
    "name": "Sparklers",
    "description": "Bright golden sparklers for every celebration",
    "imageUrl": "https://...",
    "product_count": 3
  }
}
```

**Error Responses:**
| Status | Condition |
|--------|-----------|
| 404 | Category not found or inactive |
| 500 | Server error |

---

### GET /api/categories/:id/products
**Purpose:** List active products in a category with pagination.

**Request Body:** None

**Path Parameters:** `id` — Category ObjectId

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| page | number | Page number (default 1) |
| limit | number | Items per page (default 9) |
| sort | string | Same sort options as `/api/products` |

**Authentication:** None (public endpoint)

**Success Response (200 OK):**
```json
{
  "success": true,
  "products": [
    {
      "id": "60f7c5e9d5a2b3c4d5e6f7a8",
      "name": "Deluxe Sparkler Pack (50 pcs)",
      "price": 249,
      "oldPrice": 310,
      "discountPercent": 20,
      "mainImage": "https://...",
      "ratingAvg": 4.8,
      "ratingCount": 320,
      "stock": 120,
      "stock_status": "in_stock"
    }
  ],
  "total": 3,
  "page": 1,
  "totalPages": 1
}
```

**Error Responses:**
| Status | Condition |
|--------|-----------|
| 404 | Category not found |
| 500 | Server error |

---

## 3.2 Admin Category APIs

### POST /api/admin/categories
**Purpose:** Create a new category.

**Request Body:**
```json
{
  "name": "Sparklers",
  "description": "Bright golden sparklers for every celebration",
  "imageUrl": "https://...",
  "status": "active"
}
```

**Validation Rules:**
| Field | Rule |
|-------|------|
| name | Required, unique, string |
| description | Optional |
| imageUrl | Optional |
| status | Optional, `active` \| `inactive` (default `active`) |

**Authentication:** Admin JWT required

**Success Response (201 Created):**
```json
{
  "success": true,
  "message": "Category created",
  "id": "60f7c5e9d5a2b3c4d5e6f7b1"
}
```

**Error Responses:**
| Status | Condition |
|--------|-----------|
| 400 | Missing name |
| 401 | Missing/invalid admin token |
| 409 | Duplicate category name |
| 500 | Server error |

---

### PUT /api/admin/categories/:id
**Purpose:** Update a category.

**Request Body:** Any subset of:
```json
{
  "name": "Updated Name",
  "description": "Updated description",
  "imageUrl": "https://...",
  "status": "inactive"
}
```

**Authentication:** Admin JWT required

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Category updated"
}
```

**Error Responses:**
| Status | Condition |
|--------|-----------|
| 400 | Invalid data |
| 401 | Missing/invalid admin token |
| 404 | Category not found |
| 409 | Duplicate category name |
| 500 | Server error |

---

### DELETE /api/admin/categories/:id
**Purpose:** Delete a category.

**Request Body:** None

**Path Parameters:** `id` — Category ObjectId

**Authentication:** Admin JWT required

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Category deleted"
}
```

**Error Responses:**
| Status | Condition |
|--------|-----------|
| 401 | Missing/invalid admin token |
| 404 | Category not found |
| 409 | Category has products — must deactivate instead |
| 500 | Server error |

**Logic:**
1. Count products in category
2. If count > 0 → return 409 "Cannot delete category with products. Deactivate instead."
3. Otherwise → delete category

---

# 4. CART APIs

All cart APIs require **Customer JWT** authentication.

### GET /api/cart
**Purpose:** Fetch the authenticated customer's cart with product details and subtotal.

**Request Body:** None

**Authentication:** Customer JWT required

**Success Response (200 OK):**
```json
{
  "success": true,
  "cartId": "60f7c5e9d5a2b3c4d5e6f7d1",
  "items": [
    {
      "product_id": "60f7c5e9d5a2b3c4d5e6f7a8",
      "quantity": 2,
      "priceAtAdd": 249,
      "name": "Deluxe Sparkler Pack (50 pcs)",
      "mainImage": "https://...",
      "price": 249,
      "oldPrice": 310,
      "discountPercent": 20,
      "stock": 120,
      "stock_status": "in_stock"
    }
  ],
  "subtotal": 498
}
```

**Error Responses:**
| Status | Condition |
|--------|-----------|
| 401 | Missing/invalid token |
| 500 | Server error |

**Logic:**
1. Find or create cart for `req.user.id`
2. Populate `items.product` with `name, mainImage, price, oldPrice, discountPercent, stock, reorderLevel`
3. Compute `subtotal = Σ(price × quantity)` using **current DB prices**

---

### POST /api/cart/items
**Purpose:** Add a product to the cart (or increase quantity if already present).

**Request Body:**
```json
{
  "productId": "60f7c5e9d5a2b3c4d5e6f7a8",
  "quantity": 2
}
```

**Validation Rules:**
| Field | Rule |
|-------|------|
| productId | Required, valid ObjectId |
| quantity | Optional, integer ≥ 1 (default 1) |

**Authentication:** Customer JWT required

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Added to cart",
  "cartId": "60f7c5e9d5a2b3c4d5e6f7d1",
  "items": [ ... ],
  "subtotal": 498
}
```

**Error Responses:**
| Status | Condition |
|--------|-----------|
| 400 | Missing productId / quantity < 1 / product unavailable |
| 401 | Missing/invalid token |
| 404 | Product not found |
| 409 | Out of stock / quantity exceeds available stock |
| 500 | Server error |

**Stock Validation Logic:**
1. Find product by `productId`
2. Check `product.status === 'active'` → else 400
3. Check `product.stock > 0` → else 409 "This product is out of stock"
4. If item exists in cart: `newQty = existing.quantity + quantity`
5. Check `newQty <= product.stock` → else 409 "Only X units available in stock"
6. If new item: push `{ product, quantity, priceAtAdd: product.price }`

---

### PUT /api/cart/items/:productId
**Purpose:** Update the quantity of a cart item (increase or decrease).

**Request Body:**
```json
{
  "quantity": 5
}
```

**Validation Rules:**
| Field | Rule |
|-------|------|
| quantity | Required, integer ≥ 1 |

**Authentication:** Customer JWT required

**Success Response (200 OK):**
```json
{
  "success": true,
  "cartId": "60f7c5e9d5a2b3c4d5e6f7d1",
  "items": [ ... ],
  "subtotal": 1245
}
```

**Error Responses:**
| Status | Condition |
|--------|-----------|
| 400 | Missing/invalid quantity |
| 401 | Missing/invalid token |
| 404 | Item not found in cart |
| 409 | Quantity exceeds available stock |
| 500 | Server error |

**Stock Validation:** `quantity <= product.stock` → else 409.

---

### DELETE /api/cart/items/:productId
**Purpose:** Remove a product from the cart.

**Request Body:** None

**Path Parameters:** `productId` — Product ObjectId

**Authentication:** Customer JWT required

**Success Response (200 OK):**
```json
{
  "success": true,
  "cartId": "60f7c5e9d5a2b3c4d5e6f7d1",
  "items": [ ... ],
  "subtotal": 0
}
```

**Error Responses:**
| Status | Condition |
|--------|-----------|
| 401 | Missing/invalid token |
| 500 | Server error |

**Logic:** Filter out the item from `cart.items`, save, return updated cart.

---

### DELETE /api/cart
**Purpose:** Clear the entire cart.

**Request Body:** None

**Authentication:** Customer JWT required

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Cart cleared"
}
```

**Error Responses:**
| Status | Condition |
|--------|-----------|
| 401 | Missing/invalid token |
| 500 | Server error |

**Logic:** Set `cart.items = []`, save.

---

# 5. CHECKOUT APIs

### POST /api/checkout/validate
**Purpose:** Validate the cart and delivery details before placing an order. Returns a full price breakdown without creating the order.

**Request Body:**
```json
{
  "address": "12, Gandhi Street, T. Nagar",
  "city": "Chennai",
  "state": "Tamil Nadu",
  "pincode": "600017",
  "couponCode": "DIWALI10"
}
```

**Validation Rules:**
| Field | Rule |
|-------|------|
| address | Required, string |
| city | Required, string |
| state | Required, string |
| pincode | Required, 6-digit string |
| couponCode | Optional, string |

**Authentication:** Customer JWT required

**Success Response (200 OK):**
```json
{
  "success": true,
  "valid": true,
  "items": [
    {
      "product_id": "60f7c5e9d5a2b3c4d5e6f7a8",
      "name": "Deluxe Sparkler Pack (50 pcs)",
      "price": 249,
      "quantity": 2,
      "total": 498
    }
  ],
  "pricing": {
    "subtotal": 678,
    "discountAmount": 67.8,
    "deliveryCharge": 0,
    "gstAmount": 109.84,
    "grandTotal": 720.04
  },
  "coupon": {
    "code": "DIWALI10",
    "discountType": "percent",
    "discountValue": 10
  }
}
```

**Error Responses:**
| Status | Condition |
|--------|-----------|
| 400 | Missing delivery fields / cart is empty |
| 401 | Missing/invalid token |
| 404 | User not found / product no longer available |
| 409 | Insufficient stock for one or more items |
| 500 | Server error |

**Validation Steps:**
1. Validate customer exists and is active
2. Validate delivery address fields
3. Load cart from server (never trust client totals)
4. Check cart is not empty
5. For each item: validate product exists + active + `quantity <= stock`
6. Calculate subtotal from **current DB prices**
7. Validate coupon if provided
8. Calculate discount, delivery charge, GST, grand total
9. Return price breakdown

---

### POST /api/checkout
**Purpose:** Place an order. Performs all validations, creates the order, reduces inventory, and clears the cart atomically.

**Request Body:**
```json
{
  "address": "12, Gandhi Street, T. Nagar",
  "city": "Chennai",
  "state": "Tamil Nadu",
  "pincode": "600017",
  "paymentMethod": "cod",
  "couponCode": "DIWALI10"
}
```

**Validation Rules:**
| Field | Rule |
|-------|------|
| address | Required, string |
| city | Required, string |
| state | Required, string |
| pincode | Required, 6-digit string |
| paymentMethod | Optional, `cod` \| `upi` \| `card` (default `cod`) |
| couponCode | Optional, string |

**Authentication:** Customer JWT required

**Success Response (201 Created):**
```json
{
  "success": true,
  "message": "Order placed successfully",
  "orderId": "60f7c5e9d5a2b3c4d5e6f7e1",
  "orderNumber": "VC-2026-0007",
  "grandTotal": 720.04
}
```

**Error Responses:**
| Status | Condition |
|--------|-----------|
| 400 | Missing delivery fields / cart is empty |
| 401 | Missing/invalid token |
| 404 | User not found / product no longer available |
| 409 | Insufficient stock for one or more items |
| 500 | Server error |

**Checkout Pipeline (15 steps):**

| Step | Operation |
|------|-----------|
| 1 | **Validate customer** — user exists, status active |
| 2 | **Validate delivery address** — all fields required, pincode 6 digits |
| 3 | **Validate cart** — cart exists, not empty |
| 4 | **Check product availability** — each product exists + `status === 'active'` |
| 5 | **Check stock** — each `quantity <= product.stock` |
| 6 | **Calculate subtotal** — `Σ(current DB price × quantity)` |
| 7 | **Calculate discount** — validate coupon, compute discount amount |
| 8 | **Calculate delivery charge** — `0` if subtotal ≥ free_delivery_threshold, else flat charge from settings |
| 9 | **Calculate GST** — `(subtotal − discount) × (gst_percent / 100)` if GST configured |
| 10 | **Calculate final total** — `subtotal − discount + delivery + GST` |
| 11 | **Create order** — status `pending`, payment status `pending` (COD) |
| 12 | **Create order items** — snapshot product name, image, price, quantity, total |
| 13 | **Reduce inventory** — decrement `product.stock` for each item |
| 14 | **Clear cart** — empty `cart.items` |
| 15 | **Return order confirmation** — orderId, orderNumber, grandTotal |

**Safe Database Operations (MongoDB Transactions):**
```
const session = await mongoose.startSession();
session.startTransaction();
try {
  // 1. Create order (within session)
  // 2. Decrement stock for each item (within session)
  // 3. Clear cart (within session)
  // 4. Increment coupon usedCount (within session)
  await session.commitTransaction();
} catch (err) {
  await session.abortTransaction();
  throw err;
} finally {
  session.endSession();
}
```

**Why transactions?** Prevents stock from being incorrectly reduced if any step fails mid-way. If order creation succeeds but stock deduction fails, the transaction rolls back — no partial state.

**Order Number Generation:**
```
VC-{year}-{zero-padded sequence}
Example: VC-2026-0007
```

---

# 6. ORDER APIs

## 6.1 Customer Order APIs

### GET /api/orders
**Purpose:** Fetch the authenticated customer's order history with pagination.

**Request Body:** None

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| page | number | Page number (default 1) |
| limit | number | Items per page (default 10) |
| status | string | Filter by status (optional) |

**Authentication:** Customer JWT required

**Success Response (200 OK):**
```json
{
  "success": true,
  "orders": [
    {
      "id": "60f7c5e9d5a2b3c4d5e6f7e1",
      "orderNumber": "VC-2026-0007",
      "subtotal": 678,
      "discountAmount": 67.8,
      "deliveryCharge": 0,
      "gstAmount": 109.84,
      "grandTotal": 720.04,
      "status": "pending",
      "paymentMethod": "cod",
      "paymentStatus": "pending",
      "createdAt": "2026-08-13T06:00:00.000Z",
      "item_count": 2
    }
  ],
  "total": 4,
  "page": 1,
  "totalPages": 1
}
```

**Error Responses:**
| Status | Condition |
|--------|-----------|
| 401 | Missing/invalid token |
| 500 | Server error |

**Security:** Query must filter `{ user: req.user.id }` — customers can only see their own orders.

---

### GET /api/orders/:id
**Purpose:** Fetch a single order with full details (own orders only).

**Request Body:** None

**Path Parameters:** `id` — Order ObjectId

**Authentication:** Customer JWT required

**Success Response (200 OK):**
```json
{
  "success": true,
  "order": {
    "id": "60f7c5e9d5a2b3c4d5e6f7e1",
    "orderNumber": "VC-2026-0007",
    "fullName": "Ramesh Kumar",
    "phone": "9840012345",
    "email": "ramesh@example.com",
    "address": "12, Gandhi Street, T. Nagar",
    "city": "Chennai",
    "state": "Tamil Nadu",
    "pincode": "600017",
    "subtotal": 678,
    "discountAmount": 67.8,
    "deliveryCharge": 0,
    "gstAmount": 109.84,
    "grandTotal": 720.04,
    "couponCode": "DIWALI10",
    "paymentMethod": "cod",
    "paymentStatus": "pending",
    "status": "pending",
    "createdAt": "2026-08-13T06:00:00.000Z",
    "updatedAt": "2026-08-13T06:00:00.000Z"
  },
  "items": [
    {
      "product": "60f7c5e9d5a2b3c4d5e6f7a8",
      "productName": "Deluxe Sparkler Pack (50 pcs)",
      "productImage": "https://...",
      "price": 249,
      "quantity": 2,
      "total": 498
    }
  ]
}
```

**Error Responses:**
| Status | Condition |
|--------|-----------|
| 401 | Missing/invalid token |
| 403 | Order belongs to another user |
| 404 | Order not found |
| 500 | Server error |

**Security:** Query must be `Order.findOne({ _id: id, user: req.user.id })` — returns 404 if not found (prevents leaking existence of other users' orders).

---

### GET /api/orders/:id/track
**Purpose:** Fetch order status and timeline for tracking.

**Request Body:** None

**Path Parameters:** `id` — Order ObjectId

**Authentication:** Customer JWT required

**Success Response (200 OK):**
```json
{
  "success": true,
  "orderNumber": "VC-2026-0007",
  "status": "packed",
  "timeline": {
    "pending": "2026-08-13T06:00:00.000Z",
    "confirmed": "2026-08-13T09:00:00.000Z",
    "packed": "2026-08-14T10:00:00.000Z",
    "delivered": null,
    "cancelled": null
  },
  "estimatedDelivery": "2026-08-16T00:00:00.000Z"
}
```

**Error Responses:**
| Status | Condition |
|--------|-----------|
| 401 | Missing/invalid token |
| 403 | Order belongs to another user |
| 404 | Order not found |
| 500 | Server error |

**Implementation Note:** Requires adding `statusHistory` array to Order model:
```js
statusHistory: [{
  status: { type: String, enum: ['pending', 'confirmed', 'packed', 'delivered', 'cancelled'] },
  changedAt: { type: Date, default: Date.now },
  note: { type: String, default: null }
}]
```

---

### POST /api/orders/:id/cancel
**Purpose:** Cancel an order (customer-initiated).

**Request Body:**
```json
{
  "reason": "Changed my mind"
}
```

**Validation Rules:**
| Field | Rule |
|-------|------|
| reason | Optional, string |

**Authentication:** Customer JWT required

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Order cancelled successfully",
  "order": {
    "id": "60f7c5e9d5a2b3c4d5e6f7e1",
    "orderNumber": "VC-2026-0007",
    "status": "cancelled"
  }
}
```

**Error Responses:**
| Status | Condition |
|--------|-----------|
| 400 | Order cannot be cancelled in current status |
| 401 | Missing/invalid token |
| 403 | Order belongs to another user |
| 404 | Order not found |
| 500 | Server error |

**Cancellation Validation Rules:**
| Current Status | Can Cancel? | Reason |
|----------------|-------------|--------|
| Pending | ✅ Yes | Order not yet processed |
| Confirmed | ✅ Yes | Order not yet packed |
| Packed | ✅ Yes | Order not yet delivered |
| Delivered | ❌ No | Already delivered |
| Cancelled | ❌ No | Already cancelled |

**Stock Restoration on Cancellation:**
- **If order is cancelled before delivery** (Pending/Confirmed/Packed): restore stock for each order item using `Product.findByIdAndUpdate(item.product, { $inc: { stock: item.quantity } })`
- **If order is already Delivered**: do NOT auto-restore — requires admin manual adjustment
- **If order is already Cancelled**: no action

---

## 6.2 Admin Order APIs

### GET /api/admin/orders
**Purpose:** List all orders with filtering, search, and pagination.

**Request Body:** None

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| status | string | `all` \| `pending` \| `confirmed` \| `packed` \| `delivered` \| `cancelled` |
| q | string | Search by order number, customer name, or phone |
| date_from | string | Filter orders from date (YYYY-MM-DD) |
| date_to | string | Filter orders to date (YYYY-MM-DD) |
| page | number | Page number (default 1) |
| limit | number | Items per page (default 10) |

**Authentication:** Admin JWT required

**Success Response (200 OK):**
```json
{
  "success": true,
  "orders": [
    {
      "id": "60f7c5e9d5a2b3c4d5e6f7e1",
      "orderNumber": "VC-2026-0007",
      "grandTotal": 720.04,
      "status": "pending",
      "createdAt": "2026-08-13T06:00:00.000Z",
      "paymentMethod": "cod",
      "customer": "Ramesh Kumar",
      "phone": "9840012345",
      "item_count": 2
    }
  ],
  "total": 6,
  "page": 1,
  "totalPages": 1
}
```

**Error Responses:**
| Status | Condition |
|--------|-----------|
| 401 | Missing/invalid admin token |
| 500 | Server error |

---

### GET /api/admin/orders/:id
**Purpose:** Fetch full order detail for admin.

**Request Body:** None

**Path Parameters:** `id` — Order ObjectId

**Authentication:** Admin JWT required

**Success Response (200 OK):**
```json
{
  "success": true,
  "order": {
    "id": "60f7c5e9d5a2b3c4d5e6f7e1",
    "orderNumber": "VC-2026-0007",
    "user": "60f7c5e9d5a2b3c4d5e6f7a8",
    "fullName": "Ramesh Kumar",
    "phone": "9840012345",
    "email": "ramesh@example.com",
    "address": "12, Gandhi Street, T. Nagar",
    "city": "Chennai",
    "state": "Tamil Nadu",
    "pincode": "600017",
    "subtotal": 678,
    "discountAmount": 67.8,
    "deliveryCharge": 0,
    "gstAmount": 109.84,
    "grandTotal": 720.04,
    "couponCode": "DIWALI10",
    "paymentMethod": "cod",
    "paymentStatus": "pending",
    "status": "pending",
    "statusHistory": [
      { "status": "pending", "changedAt": "2026-08-13T06:00:00.000Z" }
    ],
    "createdAt": "2026-08-13T06:00:00.000Z",
    "updatedAt": "2026-08-13T06:00:00.000Z"
  },
  "items": [
    {
      "product": "60f7c5e9d5a2b3c4d5e6f7a8",
      "productName": "Deluxe Sparkler Pack (50 pcs)",
      "productImage": "https://...",
      "price": 249,
      "quantity": 2,
      "total": 498
    }
  ]
}
```

**Error Responses:**
| Status | Condition |
|--------|-----------|
| 401 | Missing/invalid admin token |
| 404 | Order not found |
| 500 | Server error |

---

### PUT /api/admin/orders/:id/status
**Purpose:** Update an order's status.

**Request Body:**
```json
{
  "status": "confirmed",
  "note": "Order confirmed by admin"
}
```

**Validation Rules:**
| Field | Rule |
|-------|------|
| status | Required, one of `pending` \| `confirmed` \| `packed` \| `delivered` \| `cancelled` |
| note | Optional, string |

**Authentication:** Admin JWT required

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Order status updated",
  "order": {
    "id": "60f7c5e9d5a2b3c4d5e6f7e1",
    "orderNumber": "VC-2026-0007",
    "status": "confirmed"
  }
}
```

**Error Responses:**
| Status | Condition |
|--------|-----------|
| 400 | Invalid status / invalid transition |
| 401 | Missing/invalid admin token |
| 404 | Order not found |
| 500 | Server error |

**Order Flow:**
```
Pending ────► Confirmed ────► Packed ────► Delivered
    │              │              │
    └──────────────┴──────────────┴──────► Cancelled
```

**Valid Transitions:**
| From | To |
|------|-----|
| Pending | Confirmed, Cancelled |
| Confirmed | Packed, Cancelled |
| Packed | Delivered, Cancelled |
| Delivered | (final — no further changes) |
| Cancelled | (final) |

**Stock Restoration on Cancel:**
- If status changes to `cancelled` and current status is NOT `delivered` and NOT `cancelled`:
  - Restore stock for each order item: `Product.findByIdAndUpdate(item.product, { $inc: { stock: item.quantity } })`
- If already delivered → do NOT restore automatically

**Status History:** Append `{ status, changedAt: new Date(), note }` to `order.statusHistory`.

---

# 7. CUSTOMER APIs (Admin)

### GET /api/admin/customers
**Purpose:** List all customers with order statistics.

**Request Body:** None

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| q | string | Search by name, email, or phone |
| page | number | Page number (default 1) |
| limit | number | Items per page (default 10) |
| status | string | `active` \| `inactive` |

**Authentication:** Admin JWT required

**Success Response (200 OK):**
```json
{
  "success": true,
  "customers": [
    {
      "id": "60f7c5e9d5a2b3c4d5e6f7a8",
      "fullName": "Ramesh Kumar",
      "email": "ramesh@example.com",
      "phone": "9840012345",
      "status": "active",
      "createdAt": "2026-01-15T10:30:00.000Z",
      "order_count": 2,
      "total_spent": 1769.06
    }
  ],
  "total": 3,
  "page": 1,
  "totalPages": 1
}
```

**Error Responses:**
| Status | Condition |
|--------|-----------|
| 401 | Missing/invalid admin token |
| 500 | Server error |

**Logic:**
- Query users with `select('-passwordHash')`
- For each user: count orders + sum `grandTotal` (excluding cancelled)
- **Performance note:** Use MongoDB aggregation with `$lookup` for large datasets instead of N+1 queries

---

### GET /api/admin/customers/:id
**Purpose:** Fetch a single customer's full profile.

**Request Body:** None

**Path Parameters:** `id` — User ObjectId

**Authentication:** Admin JWT required

**Success Response (200 OK):**
```json
{
  "success": true,
  "customer": {
    "id": "60f7c5e9d5a2b3c4d5e6f7a8",
    "fullName": "Ramesh Kumar",
    "email": "ramesh@example.com",
    "phone": "9840012345",
    "address": "12, Gandhi Street, T. Nagar",
    "city": "Chennai",
    "state": "Tamil Nadu",
    "pincode": "600017",
    "status": "active",
    "createdAt": "2026-01-15T10:30:00.000Z",
    "order_count": 2,
    "total_spent": 1769.06
  }
}
```

**Error Responses:**
| Status | Condition |
|--------|-----------|
| 401 | Missing/invalid admin token |
| 404 | Customer not found |
| 500 | Server error |

---

### GET /api/admin/customers/:id/orders
**Purpose:** Fetch all orders placed by a specific customer.

**Request Body:** None

**Path Parameters:** `id` — User ObjectId

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| page | number | Page number (default 1) |
| limit | number | Items per page (default 10) |
| status | string | Filter by order status |

**Authentication:** Admin JWT required

**Success Response (200 OK):**
```json
{
  "success": true,
  "orders": [
    {
      "id": "60f7c5e9d5a2b3c4d5e6f7e1",
      "orderNumber": "VC-2026-0007",
      "grandTotal": 720.04,
      "status": "pending",
      "paymentMethod": "cod",
      "createdAt": "2026-08-13T06:00:00.000Z",
      "item_count": 2
    }
  ],
  "total": 2,
  "page": 1,
  "totalPages": 1
}
```

**Error Responses:**
| Status | Condition |
|--------|-----------|
| 401 | Missing/invalid admin token |
| 404 | Customer not found |
| 500 | Server error |

---

# 8. INVENTORY APIs

### GET /api/admin/inventory
**Purpose:** List all products with inventory status.

**Request Body:** None

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| status | string | `all` \| `low` \| `out` \| `in` |
| q | string | Search by product name or SKU |
| page | number | Page number (default 1) |
| limit | number | Items per page (default 20) |

**Authentication:** Admin JWT required

**Success Response (200 OK):**
```json
{
  "success": true,
  "inventory": [
    {
      "id": "60f7c5e9d5a2b3c4d5e6f7a8",
      "product_id": "60f7c5e9d5a2b3c4d5e6f7a8",
      "name": "Deluxe Sparkler Pack (50 pcs)",
      "sku": "VC-SP-001",
      "mainImage": "https://...",
      "quantity": 120,
      "reorderLevel": 30,
      "lastUpdated": "2026-08-13T06:00:00.000Z",
      "stock_status": "in_stock"
    }
  ],
  "total": 12,
  "page": 1,
  "totalPages": 1
}
```

**Error Responses:**
| Status | Condition |
|--------|-----------|
| 401 | Missing/invalid admin token |
| 500 | Server error |

**Status Rules:**
```
stock > reorderLevel          → "In Stock"     (green)
stock <= reorderLevel && > 0  → "Low Stock"    (orange)
stock = 0                     → "Out of Stock" (red)
```

---

### GET /api/admin/inventory/low-stock
**Purpose:** List products with low stock (stock ≤ reorderLevel and stock > 0).

**Request Body:** None

**Authentication:** Admin JWT required

**Success Response (200 OK):**
```json
{
  "success": true,
  "inventory": [
    {
      "id": "60f7c5e9d5a2b3c4d5e6f7a8",
      "product_id": "60f7c5e9d5a2b3c4d5e6f7a8",
      "name": "Sky Rocket Trio (Pack of 3)",
      "sku": "VC-RK-003",
      "mainImage": "https://...",
      "quantity": 8,
      "reorderLevel": 20,
      "lastUpdated": "2026-08-13T06:00:00.000Z",
      "stock_status": "low_stock"
    }
  ],
  "total": 2
}
```

**Error Responses:**
| Status | Condition |
|--------|-----------|
| 401 | Missing/invalid admin token |
| 500 | Server error |

**Logic:** `Product.find({ stock: { $gt: 0, $lte: '$reorderLevel' } })` — use `$expr` for field comparison.

---

### GET /api/admin/inventory/out-of-stock
**Purpose:** List products that are out of stock.

**Request Body:** None

**Authentication:** Admin JWT required

**Success Response (200 OK):**
```json
{
  "success": true,
  "inventory": [
    {
      "id": "60f7c5e9d5a2b3c4d5e6f7a8",
      "product_id": "60f7c5e9d5a2b3c4d5e6f7a8",
      "name": "Festival Gift Box — Deluxe",
      "sku": "VC-GB-006",
      "mainImage": "https://...",
      "quantity": 0,
      "reorderLevel": 15,
      "lastUpdated": "2026-08-13T06:00:00.000Z",
      "stock_status": "out_of_stock"
    }
  ],
  "total": 1
}
```

**Error Responses:**
| Status | Condition |
|--------|-----------|
| 401 | Missing/invalid admin token |
| 500 | Server error |

**Logic:** `Product.find({ stock: 0 })`

---

### PUT /api/admin/inventory/:productId
**Purpose:** Update stock quantity and/or reorder level for a product.

**Request Body:**
```json
{
  "quantity": 150,
  "reorderLevel": 25
}
```

**Validation Rules:**
| Field | Rule |
|-------|------|
| quantity | Optional, integer ≥ 0 |
| reorderLevel | Optional, integer ≥ 0 |
| At least one field required | |

**Authentication:** Admin JWT required

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Inventory updated"
}
```

**Error Responses:**
| Status | Condition |
|--------|-----------|
| 400 | No fields provided / invalid values |
| 401 | Missing/invalid admin token |
| 404 | Product not found |
| 500 | Server error |

**Logic:** Update `stock` and/or `reorderLevel` on the Product document. `lastUpdated` is automatically set by `timestamps: true`.

---

# 9. REVIEW APIs

### POST /api/products/:productId/reviews
**Purpose:** Submit a review for a product.

**Request Body:**
```json
{
  "rating": 5,
  "reviewText": "These sparklers are amazing! They burn bright and last long."
}
```

**Validation Rules:**
| Field | Rule |
|-------|------|
| rating | Required, integer 1–5 |
| reviewText | Optional, string, max 1000 characters |

**Authentication:** Customer JWT required

**Success Response (201 Created):**
```json
{
  "success": true,
  "message": "Review submitted successfully",
  "reviewId": "60f7c5e9d5a2b3c4d5e6f7c1"
}
```

**Error Responses:**
| Status | Condition |
|--------|-----------|
| 400 | Missing/invalid rating |
| 401 | Missing/invalid token |
| 404 | Product not found |
| 409 | User has already reviewed this product |
| 500 | Server error |

**Duplicate Review Prevention:**
- The Review model has a unique compound index: `reviewSchema.index({ user: 1, product: 1 }, { unique: true })`
- Before creating, check `Review.findOne({ user: req.user.id, product: productId })`
- If exists → return 409 "You have already reviewed this product"

**Side Effects:**
- Recompute product `ratingAvg` and `ratingCount`:
  ```
  ratingCount = total approved reviews
  ratingAvg = average rating of approved reviews
  ```

---

### PUT /api/reviews/:id
**Purpose:** Update a customer's own review.

**Request Body:**
```json
{
  "rating": 4,
  "reviewText": "Updated review text"
}
```

**Validation Rules:**
| Field | Rule |
|-------|------|
| rating | Optional, integer 1–5 |
| reviewText | Optional, string, max 1000 characters |
| At least one field required | |

**Authentication:** Customer JWT required

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Review updated successfully"
}
```

**Error Responses:**
| Status | Condition |
|--------|-----------|
| 400 | No fields provided / invalid values |
| 401 | Missing/invalid token |
| 403 | Review belongs to another user |
| 404 | Review not found |
| 500 | Server error |

**Security:** Query must be `Review.findOne({ _id: id, user: req.user.id })`.

**Side Effects:** Recompute product `ratingAvg` and `ratingCount`.

---

### DELETE /api/reviews/:id
**Purpose:** Delete a customer's own review.

**Request Body:** None

**Path Parameters:** `id` — Review ObjectId

**Authentication:** Customer JWT required

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Review deleted successfully"
}
```

**Error Responses:**
| Status | Condition |
|--------|-----------|
| 401 | Missing/invalid token |
| 403 | Review belongs to another user |
| 404 | Review not found |
| 500 | Server error |

**Security:** Query must be `Review.findOneAndDelete({ _id: id, user: req.user.id })`.

**Side Effects:** Recompute product `ratingAvg` and `ratingCount`.

---

### GET /api/products/:productId/reviews
**Purpose:** Fetch approved reviews for a product (public).

**Request Body:** None

**Path Parameters:** `productId` — Product ObjectId

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| page | number | Page number (default 1) |
| limit | number | Items per page (default 10) |

**Authentication:** None (public endpoint)

**Success Response (200 OK):**
```json
{
  "success": true,
  "reviews": [
    {
      "id": "60f7c5e9d5a2b3c4d5e6f7c1",
      "rating": 5,
      "reviewText": "These sparklers are amazing!",
      "full_name": "Ramesh Kumar",
      "createdAt": "2026-02-10T10:30:00.000Z"
    }
  ],
  "ratingAvg": 4.8,
  "ratingCount": 320,
  "total": 2,
  "page": 1,
  "totalPages": 1
}
```

**Error Responses:**
| Status | Condition |
|--------|-----------|
| 500 | Server error |

---

### GET /api/admin/reviews
**Purpose:** List all reviews (including pending/rejected) for moderation.

**Request Body:** None

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| status | string | `pending` \| `approved` \| `rejected` |
| page | number | Page number (default 1) |
| limit | number | Items per page (default 20) |

**Authentication:** Admin JWT required

**Success Response (200 OK):**
```json
{
  "success": true,
  "reviews": [
    {
      "id": "60f7c5e9d5a2b3c4d5e6f7c1",
      "rating": 5,
      "reviewText": "These sparklers are amazing!",
      "status": "approved",
      "full_name": "Ramesh Kumar",
      "product_name": "Deluxe Sparkler Pack (50 pcs)",
      "createdAt": "2026-02-10T10:30:00.000Z"
    }
  ],
  "total": 5,
  "page": 1,
  "totalPages": 1
}
```

**Error Responses:**
| Status | Condition |
|--------|-----------|
| 401 | Missing/invalid admin token |
| 500 | Server error |

---

### DELETE /api/admin/reviews/:id
**Purpose:** Delete any review (moderation).

**Request Body:** None

**Path Parameters:** `id` — Review ObjectId

**Authentication:** Admin JWT required

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Review deleted successfully"
}
```

**Error Responses:**
| Status | Condition |
|--------|-----------|
| 401 | Missing/invalid admin token |
| 404 | Review not found |
| 500 | Server error |

**Side Effects:** Recompute product `ratingAvg` and `ratingCount`.

---

# 10. FESTIVAL COMBO APIs

### GET /api/combos
**Purpose:** List all active festival combos with included products.

**Request Body:** None

**Authentication:** None (public endpoint)

**Success Response (200 OK):**
```json
{
  "success": true,
  "combos": [
    {
      "id": "60f7c5e9d5a2b3c4d5e6f7f1",
      "name": "Starter Combo",
      "price": 500,
      "description": "Perfect for small family celebrations.",
      "tag": null,
      "image": "https://...",
      "discount": 15,
      "items": [
        {
          "product_id": "60f7c5e9d5a2b3c4d5e6f7a8",
          "name": "Deluxe Sparkler Pack (50 pcs)",
          "mainImage": "https://...",
          "price": 249,
          "quantity": 2
        }
      ],
      "item_total": 588,
      "savings": 88
    }
  ]
}
```

**Error Responses:**
| Status | Condition |
|--------|-----------|
| 500 | Server error |

**Existing combos to seed:**
| Combo | Price | Description |
|-------|-------|-------------|
| Starter Combo | ₹500 | Small family celebrations |
| Family Combo | ₹1,000 | Most popular — whole family |
| Grand Combo | ₹2,000 | Ultimate celebration pack |

---

### GET /api/combos/:id
**Purpose:** Fetch a single active combo with full details.

**Request Body:** None

**Path Parameters:** `id` — Combo ObjectId

**Authentication:** None (public endpoint)

**Success Response (200 OK):**
```json
{
  "success": true,
  "combo": {
    "id": "60f7c5e9d5a2b3c4d5e6f7f1",
    "name": "Starter Combo",
    "price": 500,
    "description": "Perfect for small family celebrations.",
    "tag": null,
    "image": "https://...",
    "discount": 15,
    "items": [
      {
        "product_id": "60f7c5e9d5a2b3c4d5e6f7a8",
        "name": "Deluxe Sparkler Pack (50 pcs)",
        "mainImage": "https://...",
        "price": 249,
        "quantity": 2
      }
    ],
    "item_total": 588,
    "savings": 88
  }
}
```

**Error Responses:**
| Status | Condition |
|--------|-----------|
| 404 | Combo not found or inactive |
| 500 | Server error |

---

### POST /api/combos/:id/add-to-cart
**Purpose:** Add all products in a combo to the customer's cart.

**Request Body:** None

**Path Parameters:** `id` — Combo ObjectId

**Authentication:** Customer JWT required

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Combo added to cart successfully",
  "cartId": "60f7c5e9d5a2b3c4d5e6f7d1",
  "items": [ ... ],
  "subtotal": 588
}
```

**Error Responses:**
| Status | Condition |
|--------|-----------|
| 400 | Combo has no products / a product is unavailable |
| 401 | Missing/invalid token |
| 404 | Combo not found |
| 409 | Insufficient stock for a combo item |
| 500 | Server error |

**Logic:**
1. Find active combo, populate `items.product`
2. For each combo item:
   - Validate product exists + active
   - Validate `product.stock >= item.quantity`
   - If product already in cart: `newQty = existing.quantity + item.quantity`, validate `newQty <= product.stock`
   - Add or update cart item
3. Save cart

**Combo Discount Handling:**
- Combo has its own `price` (discounted bundle price)
- Items are added at individual product prices
- The difference (`item_total − combo.price`) is the combo savings
- Optionally store `comboDiscount` on the cart or apply at checkout

---

## Admin Combo APIs

### POST /api/admin/combos
**Purpose:** Create a new festival combo.

**Request Body:**
```json
{
  "name": "Starter Combo",
  "price": 500,
  "description": "Perfect for small family celebrations.",
  "tag": "Best Value",
  "status": "active",
  "image": "https://...",
  "discount": 15,
  "items": [
    { "productId": "60f7c5e9d5a2b3c4d5e6f7a8", "quantity": 2 },
    { "productId": "60f7c5e9d5a2b3c4d5e6f7b3", "quantity": 4 }
  ]
}
```

**Validation Rules:**
| Field | Rule |
|-------|------|
| name | Required, string |
| price | Required, number > 0 |
| items | Required, array of `{ productId, quantity }` |
| description | Optional |
| tag | Optional |
| status | Optional, `active` \| `inactive` |
| image | Optional, string URL |
| discount | Optional, number 0–100 |

**Authentication:** Admin JWT required

**Success Response (201 Created):**
```json
{
  "success": true,
  "message": "Combo created",
  "id": "60f7c5e9d5a2b3c4d5e6f7f1"
}
```

**Error Responses:**
| Status | Condition |
|--------|-----------|
| 400 | Missing name/price/items |
| 401 | Missing/invalid admin token |
| 500 | Server error |

---

### PUT /api/admin/combos/:id
**Purpose:** Update a combo.

**Request Body:** Any subset of the create body.

**Authentication:** Admin JWT required

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Combo updated"
}
```

**Error Responses:**
| Status | Condition |
|--------|-----------|
| 400 | Invalid data |
| 401 | Missing/invalid admin token |
| 404 | Combo not found |
| 500 | Server error |

---

### DELETE /api/admin/combos/:id
**Purpose:** Delete a combo.

**Request Body:** None

**Path Parameters:** `id` — Combo ObjectId

**Authentication:** Admin JWT required

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Combo deleted"
}
```

**Error Responses:**
| Status | Condition |
|--------|-----------|
| 401 | Missing/invalid admin token |
| 404 | Combo not found |
| 500 | Server error |

---

# 11. CONTACT APIs

### POST /api/contact
**Purpose:** Submit a contact/enquiry message.

**Request Body:**
```json
{
  "name": "Karthik",
  "email": "karthik@example.com",
  "phone": "9840012345",
  "subject": "Bulk order enquiry",
  "message": "I would like to place a bulk order for Diwali."
}
```

**Validation Rules:**
| Field | Rule |
|-------|------|
| name | Required, string, 2–100 characters |
| email | Required, valid email format |
| phone | Optional, 10 digits |
| subject | Required, string, 3–150 characters |
| message | Required, string, 10–2000 characters |

**Authentication:** None (public endpoint)

**Success Response (201 Created):**
```json
{
  "success": true,
  "message": "Your message has been sent successfully",
  "messageId": "60f7c5e9d5a2b3c4d5e6f7d1"
}
```

**Error Responses:**
| Status | Condition |
|--------|-----------|
| 400 | Missing required fields / invalid email |
| 500 | Server error |

---

### GET /api/admin/contact-messages
**Purpose:** List all contact messages.

**Request Body:** None

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| status | string | `new` \| `read` \| `replied` \| `closed` |
| q | string | Search by name, email, or subject |
| page | number | Page number (default 1) |
| limit | number | Items per page (default 20) |

**Authentication:** Admin JWT required

**Success Response (200 OK):**
```json
{
  "success": true,
  "messages": [
    {
      "id": "60f7c5e9d5a2b3c4d5e6f7d1",
      "name": "Karthik",
      "email": "karthik@example.com",
      "phone": "9840012345",
      "subject": "Bulk order enquiry",
      "message": "I would like to place a bulk order for Diwali.",
      "status": "new",
      "createdAt": "2026-08-13T06:00:00.000Z"
    }
  ],
  "total": 1,
  "page": 1,
  "totalPages": 1
}
```

**Error Responses:**
| Status | Condition |
|--------|-----------|
| 401 | Missing/invalid admin token |
| 500 | Server error |

---

### GET /api/admin/contact-messages/:id
**Purpose:** Fetch a single contact message.

**Request Body:** None

**Path Parameters:** `id` — ContactMessage ObjectId

**Authentication:** Admin JWT required

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": {
    "id": "60f7c5e9d5a2b3c4d5e6f7d1",
    "name": "Karthik",
    "email": "karthik@example.com",
    "phone": "9840012345",
    "subject": "Bulk order enquiry",
    "message": "I would like to place a bulk order for Diwali.",
    "status": "new",
    "createdAt": "2026-08-13T06:00:00.000Z"
  }
}
```

**Error Responses:**
| Status | Condition |
|--------|-----------|
| 401 | Missing/invalid admin token |
| 404 | Message not found |
| 500 | Server error |

---

### PUT /api/admin/contact-messages/:id
**Purpose:** Update a contact message (e.g. mark as read/replied/closed).

**Request Body:**
```json
{
  "status": "read"
}
```

**Validation Rules:**
| Field | Rule |
|-------|------|
| status | Required, one of `new` \| `read` \| `replied` \| `closed` |

**Authentication:** Admin JWT required

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Message status updated"
}
```

**Error Responses:**
| Status | Condition |
|--------|-----------|
| 400 | Invalid status |
| 401 | Missing/invalid admin token |
| 404 | Message not found |
| 500 | Server error |

---

### DELETE /api/admin/contact-messages/:id
**Purpose:** Delete a contact message.

**Request Body:** None

**Path Parameters:** `id` — ContactMessage ObjectId

**Authentication:** Admin JWT required

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Message deleted"
}
```

**Error Responses:**
| Status | Condition |
|--------|-----------|
| 401 | Missing/invalid admin token |
| 404 | Message not found |
| 500 | Server error |

---

# 12. ADMIN DASHBOARD APIs

All dashboard values are **computed from MongoDB** — never hard-coded.

### GET /api/admin/dashboard/summary
**Purpose:** Fetch KPI summary cards for the dashboard.

**Request Body:** None

**Authentication:** Admin JWT required

**Success Response (200 OK):**
```json
{
  "success": true,
  "summary": {
    "totalSales": 482500,
    "totalOrders": 1248,
    "totalProducts": 214,
    "totalCustomers": 3562,
    "activeProducts": 200,
    "lowStockProducts": 12,
    "outOfStockProducts": 3,
    "pendingOrders": 45,
    "avgOrderValue": 386.62
  }
}
```

**Error Responses:**
| Status | Condition |
|--------|-----------|
| 401 | Missing/invalid admin token |
| 500 | Server error |

**Aggregation Logic:**
| Metric | MongoDB Aggregation |
|--------|---------------------|
| totalSales | `Order.aggregate([{ $match: { status: { $ne: 'cancelled' } } }, { $group: { _id: null, total: { $sum: '$grandTotal' } } }])` |
| totalOrders | `Order.countDocuments()` |
| totalProducts | `Product.countDocuments()` |
| totalCustomers | `User.countDocuments()` |
| activeProducts | `Product.countDocuments({ status: 'active' })` |
| lowStockProducts | `Product.countDocuments({ $expr: { $and: [{ $gt: ['$stock', 0] }, { $lte: ['$stock', '$reorderLevel'] }] } })` |
| outOfStockProducts | `Product.countDocuments({ stock: 0 })` |
| pendingOrders | `Order.countDocuments({ status: 'pending' })` |
| avgOrderValue | `Order.aggregate([{ $match: { status: { $ne: 'cancelled' } } }, { $group: { _id: null, avg: { $avg: '$grandTotal' } } }])` |

---

### GET /api/admin/dashboard/sales
**Purpose:** Fetch sales data for charts (daily, monthly, yearly).

**Request Body:** None

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| period | string | `daily` \| `monthly` \| `yearly` (default `monthly`) |
| year | number | Year for monthly/daily (default current year) |

**Authentication:** Admin JWT required

**Success Response (200 OK):**
```json
{
  "success": true,
  "period": "monthly",
  "year": 2026,
  "data": [
    { "label": "Jan", "total": 35000, "order_count": 95 },
    { "label": "Feb", "total": 42000, "order_count": 110 },
    { "label": "Mar", "total": 38000, "order_count": 102 }
  ]
}
```

**Error Responses:**
| Status | Condition |
|--------|-----------|
| 401 | Missing/invalid admin token |
| 500 | Server error |

**Aggregation Logic:**
- **Daily:** `$group` by `{ $dayOfMonth: '$createdAt' }` for a given month
- **Monthly:** `$group` by `{ $month: '$createdAt' }` for a given year
- **Yearly:** `$group` by `{ $year: '$createdAt' }`

---

### GET /api/admin/dashboard/orders
**Purpose:** Fetch order statistics by status for the donut chart.

**Request Body:** None

**Authentication:** Admin JWT required

**Success Response (200 OK):**
```json
{
  "success": true,
  "orders": [
    { "status": "pending", "count": 45 },
    { "status": "confirmed", "count": 32 },
    { "status": "packed", "count": 28 },
    { "status": "delivered", "count": 1100 },
    { "status": "cancelled", "count": 43 }
  ]
}
```

**Error Responses:**
| Status | Condition |
|--------|-----------|
| 401 | Missing/invalid admin token |
| 500 | Server error |

**Aggregation Logic:** `Order.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }])`

---

### GET /api/admin/dashboard/top-products
**Purpose:** Fetch top-selling products.

**Request Body:** None

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| limit | number | Number of products (default 5) |

**Authentication:** Admin JWT required

**Success Response (200 OK):**
```json
{
  "success": true,
  "products": [
    {
      "product_id": "60f7c5e9d5a2b3c4d5e6f7a8",
      "name": "Deluxe Sparkler Pack (50 pcs)",
      "mainImage": "https://...",
      "units_sold": 320,
      "revenue": 79680
    }
  ]
}
```

**Error Responses:**
| Status | Condition |
|--------|-----------|
| 401 | Missing/invalid admin token |
| 500 | Server error |

**Aggregation Logic:**
```js
Order.aggregate([
  { $match: { status: { $ne: 'cancelled' } } },
  { $unwind: '$items' },
  { $group: {
      _id: '$items.product',
      name: { $first: '$items.productName' },
      mainImage: { $first: '$items.productImage' },
      units_sold: { $sum: '$items.quantity' },
      revenue: { $sum: '$items.total' }
  } },
  { $sort: { units_sold: -1 } },
  { $limit: limit }
])
```

---

### GET /api/admin/dashboard/category-sales
**Purpose:** Fetch category-wise sales for the donut chart.

**Request Body:** None

**Authentication:** Admin JWT required

**Success Response (200 OK):**
```json
{
  "success": true,
  "categories": [
    { "name": "Sparklers", "amount": 125000 },
    { "name": "Flower Pots", "amount": 98000 },
    { "name": "Rockets", "amount": 87000 }
  ]
}
```

**Error Responses:**
| Status | Condition |
|--------|-----------|
| 401 | Missing/invalid admin token |
| 500 | Server error |

**Aggregation Logic:**
```js
Order.aggregate([
  { $match: { status: { $ne: 'cancelled' } } },
  { $unwind: '$items' },
  { $lookup: { from: 'products', localField: 'items.product', foreignField: '_id', as: 'product' } },
  { $unwind: { path: '$product', preserveNullAndEmptyArrays: true } },
  { $lookup: { from: 'categories', localField: 'product.category', foreignField: '_id', as: 'category' } },
  { $unwind: { path: '$category', preserveNullAndEmptyArrays: true } },
  { $group: { _id: '$category.name', amount: { $sum: '$items.total' } } },
  { $sort: { amount: -1 } }
])
```

---

### GET /api/admin/dashboard/recent-orders
**Purpose:** Fetch the most recent orders for the dashboard table.

**Request Body:** None

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| limit | number | Number of orders (default 5) |

**Authentication:** Admin JWT required

**Success Response (200 OK):**
```json
{
  "success": true,
  "orders": [
    {
      "id": "60f7c5e9d5a2b3c4d5e6f7e1",
      "orderNumber": "VC-2026-0007",
      "grandTotal": 720.04,
      "status": "pending",
      "createdAt": "2026-08-13T06:00:00.000Z",
      "customer": "Ramesh Kumar"
    }
  ]
}
```

**Error Responses:**
| Status | Condition |
|--------|-----------|
| 401 | Missing/invalid admin token |
| 500 | Server error |

**Logic:** `Order.find().populate('user', 'fullName').sort({ createdAt: -1 }).limit(limit)`

---

### GET /api/admin/dashboard/low-stock
**Purpose:** Fetch low-stock and out-of-stock products for alerts.

**Request Body:** None

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| limit | number | Number of products (default 10) |

**Authentication:** Admin JWT required

**Success Response (200 OK):**
```json
{
  "success": true,
  "inventory": [
    {
      "product_id": "60f7c5e9d5a2b3c4d5e6f7a8",
      "name": "Sky Rocket Trio (Pack of 3)",
      "mainImage": "https://...",
      "quantity": 8,
      "reorderLevel": 20,
      "stock_status": "low_stock"
    }
  ]
}
```

**Error Responses:**
| Status | Condition |
|--------|-----------|
| 401 | Missing/invalid admin token |
| 500 | Server error |

**Logic:** `Product.find({ $expr: { $lte: ['$stock', '$reorderLevel'] } }).sort({ stock: 1 }).limit(limit)`

---

# 13. SALES REPORT APIs

### GET /api/admin/reports/sales
**Purpose:** Fetch sales report with date range and grouping.

**Request Body:** None

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| from | string | Start date (YYYY-MM-DD) |
| to | string | End date (YYYY-MM-DD) |
| group_by | string | `daily` \| `monthly` \| `yearly` (default `monthly`) |

**Authentication:** Admin JWT required

**Success Response (200 OK):**
```json
{
  "success": true,
  "report": {
    "from": "2026-01-01",
    "to": "2026-12-31",
    "group_by": "monthly",
    "total_revenue": 482500,
    "total_orders": 1248,
    "avg_order_value": 386.62,
    "data": [
      { "label": "Jan", "revenue": 35000, "order_count": 95 },
      { "label": "Feb", "revenue": 42000, "order_count": 110 }
    ]
  }
}
```

**Error Responses:**
| Status | Condition |
|--------|-----------|
| 400 | Invalid date range |
| 401 | Missing/invalid admin token |
| 500 | Server error |

**Aggregation Logic:**
```js
Order.aggregate([
  { $match: { status: { $ne: 'cancelled' }, createdAt: { $gte: from, $lte: to } } },
  { $group: {
      _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } },
      revenue: { $sum: '$grandTotal' },
      order_count: { $sum: 1 }
  } },
  { $sort: { _id: 1 } }
])
```

---

### GET /api/admin/reports/products
**Purpose:** Fetch top-selling products report.

**Request Body:** None

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| from | string | Start date (YYYY-MM-DD) |
| to | string | End date (YYYY-MM-DD) |
| limit | number | Number of products (default 10) |

**Authentication:** Admin JWT required

**Success Response (200 OK):**
```json
{
  "success": true,
  "report": {
    "from": "2026-01-01",
    "to": "2026-12-31",
    "products": [
      {
        "product_id": "60f7c5e9d5a2b3c4d5e6f7a8",
        "name": "Deluxe Sparkler Pack (50 pcs)",
        "mainImage": "https://...",
        "units_sold": 320,
        "revenue": 79680,
        "order_count": 150
      }
    ]
  }
}
```

**Error Responses:**
| Status | Condition |
|--------|-----------|
| 400 | Invalid date range |
| 401 | Missing/invalid admin token |
| 500 | Server error |

---

### GET /api/admin/reports/categories
**Purpose:** Fetch category-wise sales report.

**Request Body:** None

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| from | string | Start date (YYYY-MM-DD) |
| to | string | End date (YYYY-MM-DD) |

**Authentication:** Admin JWT required

**Success Response (200 OK):**
```json
{
  "success": true,
  "report": {
    "from": "2026-01-01",
    "to": "2026-12-31",
    "categories": [
      {
        "name": "Sparklers",
        "amount": 125000,
        "order_count": 320,
        "units_sold": 850
      }
    ]
  }
}
```

**Error Responses:**
| Status | Condition |
|--------|-----------|
| 400 | Invalid date range |
| 401 | Missing/invalid admin token |
| 500 | Server error |

**Export Support (Future):**
- Add `?format=csv` or `?format=pdf` query parameter
- Use a library like `json2csv` or `pdfkit` for export
- Return file download response

---

# 14. SETTINGS APIs

### GET /api/admin/settings
**Purpose:** Fetch all shop settings.

**Request Body:** None

**Authentication:** Admin JWT required

**Success Response (200 OK):**
```json
{
  "success": true,
  "settings": {
    "shop_name": "Vendhan Crackers",
    "shop_tagline": "Celebrate Together",
    "shop_phone": "+91 98400 12345",
    "shop_email": "hello@vendhancrackers.in",
    "shop_address": "42, Festival Street, Near Old Bus Stand, Chennai - 600001",
    "delivery_charge": "49",
    "free_delivery_threshold": "1000",
    "gst_percent": "18",
    "low_stock_threshold": "20",
    "opening_hours": "9:00 AM - 9:00 PM",
    "about_text": "Vendhan Crackers began as a small family shop...",
    "map_embed_url": ""
  }
}
```

**Error Responses:**
| Status | Condition |
|--------|-----------|
| 401 | Missing/invalid admin token |
| 500 | Server error |

---

### PUT /api/admin/settings
**Purpose:** Update shop settings.

**Request Body:** Any subset of:
```json
{
  "shop_name": "Vendhan Crackers",
  "shop_tagline": "Celebrate Together",
  "shop_phone": "+91 98400 12345",
  "shop_email": "hello@vendhancrackers.in",
  "shop_address": "42, Festival Street, Near Old Bus Stand, Chennai - 600001",
  "delivery_charge": "49",
  "free_delivery_threshold": "1000",
  "gst_percent": "18",
  "low_stock_threshold": "20",
  "opening_hours": "9:00 AM - 9:00 PM",
  "about_text": "About text...",
  "map_embed_url": "https://maps.google.com/..."
}
```

**Authentication:** Admin JWT required

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Settings updated successfully"
}
```

**Error Responses:**
| Status | Condition |
|--------|-----------|
| 400 | Invalid setting key |
| 401 | Missing/invalid admin token |
| 500 | Server error |

**Allowed Setting Keys:**
```
shop_name, shop_tagline, shop_phone, shop_email, shop_address,
delivery_charge, free_delivery_threshold, gst_percent,
low_stock_threshold, opening_hours, about_text, map_embed_url
```

**Logic:** For each key-value pair, use `Setting.findOneAndUpdate({ settingKey: key }, { settingValue: String(value) }, { upsert: true })`.

---

# 15. MIDDLEWARE

## 15.1 authenticateUser
**Purpose:** Verify customer JWT and attach user to request.

**File:** `backend/middleware/auth.js`

**Behavior:**
1. Extract `Authorization: Bearer <token>` header
2. If missing → 401 `{ success: false, message: 'Authentication required' }`
3. Verify JWT with `process.env.JWT_SECRET`
4. Check `decoded.role === 'customer'`
5. Attach `req.user = { id: decoded.id, email: decoded.email }`
6. On failure → 401 `{ success: false, message: 'Invalid or expired token' }`

**Usage:** Applied to all `/api/cart/*`, `/api/orders/*`, `/api/checkout/*`, `/api/reviews/*` (POST/PUT/DELETE), `/api/auth/me`, `/api/auth/logout`.

---

## 15.2 authenticateAdmin
**Purpose:** Verify admin JWT and attach admin to request.

**File:** `backend/middleware/auth.js`

**Behavior:**
1. Extract `Authorization: Bearer <token>` header
2. If missing → 401 `{ success: false, message: 'Admin authentication required' }`
3. Verify JWT with `process.env.JWT_SECRET`
4. Check `decoded.role === 'admin'`
5. Attach `req.admin = { id: decoded.id, email: decoded.email }`
6. On failure → 401 `{ success: false, message: 'Invalid or expired admin token' }`

**Usage:** Applied to all `/api/admin/*` routes.

---

## 15.3 authorizeRole
**Purpose:** Role-based access control for fine-grained permissions.

**File:** `backend/middleware/authorize.js`

**Behavior:**
```js
function authorizeRole(...roles) {
  return (req, res, next) => {
    const user = req.user || req.admin;
    if (!user) return res.status(401).json({ success: false, message: 'Authentication required' });
    if (!roles.includes(user.role)) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }
    next();
  };
}
```

**Usage:**
```js
router.post('/', authenticateAdmin, authorizeRole('super_admin'), handler);
```

**Roles:** `customer`, `admin`, `super_admin`, `manager`

---

## 15.4 validateRequest
**Purpose:** Validate request body/query/params against a schema.

**File:** `backend/middleware/validate.js`

**Behavior:**
```js
function validateRequest(schema) {
  return (req, res, next) => {
    const { error } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: error.details.map(d => d.message)
      });
    }
    next();
  };
}
```

**Implementation:** Use `Joi` or `express-validator` for schema definitions.

**Example validators:**
- `registerValidator` — fullName, email, phone, password
- `loginValidator` — email_or_phone, password
- `productValidator` — name, categoryId, price
- `orderValidator` — address, city, state, pincode
- `reviewValidator` — rating, reviewText
- `contactValidator` — name, email, subject, message

---

## 15.5 errorHandler
**Purpose:** Centralized error handling for all routes.

**File:** `backend/middleware/errorHandler.js`

**Behavior:**
```js
function errorHandler(err, req, res, next) {
  console.error(`[${new Date().toISOString()}]`, err.message);

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: Object.values(err.errors).map(e => e.message)
    });
  }

  // Mongoose duplicate key error
  if (err.code === 11000) {
    return res.status(409).json({
      success: false,
      message: 'Duplicate value: ' + Object.keys(err.keyValue).join(', ')
    });
  }

  // Cast error (invalid ObjectId)
  if (err.name === 'CastError') {
    return res.status(400).json({
      success: false,
      message: 'Invalid ID format'
    });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired token'
    });
  }

  // Default
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error'
  });
}
```

**Usage:** Registered last in `app.js` after all routes.

---

## 15.6 Rate Limiting
**Purpose:** Prevent brute-force attacks and API abuse.

**File:** `backend/middleware/rateLimiter.js`

**Implementation:** Use `express-rate-limit`.

```js
const rateLimit = require('express-rate-limit');

// Global API limiter
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300,
  message: { success: false, message: 'Too many requests, please try again later' }
});

// Auth-specific limiter (stricter)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { success: false, message: 'Too many login attempts, please try again later' }
});

// Contact form limiter
const contactLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  message: { success: false, message: 'Too many messages sent, please try again later' }
});
```

**Usage:**
- `apiLimiter` → applied globally to all `/api` routes
- `authLimiter` → applied to `/api/auth/login`, `/api/admin/auth/login`, `/api/auth/register`
- `contactLimiter` → applied to `/api/contact`

---

## 15.7 Logging
**Purpose:** Request logging for debugging and monitoring.

**File:** `backend/middleware/logger.js`

**Implementation:** Use `morgan` for HTTP request logging.

```js
const morgan = require('morgan');

// Development: colorful, detailed
app.use(morgan('dev'));

// Production: combined format
app.use(morgan('combined'));
```

**Additional structured logging:**
```js
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms`);
  });
  next();
});
```

---

## 15.8 CORS
**Purpose:** Allow cross-origin requests from the frontend.

**File:** `backend/middleware/cors.js`

**Implementation:**
```js
const cors = require('cors');

// Development: allow all origins
app.use(cors());

// Production: restrict to specific origins
app.use(cors({
  origin: ['http://localhost:3000', 'https://vendhancrackers.in'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
```

---

# 16. API RESPONSE FORMAT

## 16.1 Success Response

```json
{
  "success": true,
  "message": "Optional success message",
  "data": {}
}
```

**Notes:**
- `message` is optional — include for actions (create, update, delete)
- `data` contains the actual response payload
- For list endpoints, `data` includes pagination metadata

**Example (list with pagination):**
```json
{
  "success": true,
  "data": {
    "products": [ ... ],
    "total": 12,
    "page": 1,
    "totalPages": 2
  }
}
```

## 16.2 Error Response

```json
{
  "success": false,
  "message": "Human-readable error message",
  "errors": []
}
```

**Notes:**
- `errors` is optional — array of field-specific validation errors
- `message` should be user-friendly, not technical

**Example (validation error):**
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    "Email is required",
    "Password must be at least 8 characters"
  ]
}
```

## 16.3 HTTP Status Codes

| Status Code | Meaning | Usage |
|-------------|---------|-------|
| 200 | OK | Successful GET, PUT, DELETE |
| 201 | Created | Successful POST (register, create product, place order) |
| 400 | Bad Request | Missing/invalid fields, validation failure |
| 401 | Unauthorized | Missing/invalid/expired token |
| 403 | Forbidden | Authenticated but insufficient role/permission |
| 404 | Not Found | Resource does not exist |
| 409 | Conflict | Duplicate value, insufficient stock, invalid state transition |
| 422 | Unprocessable Entity | Semantic errors (e.g. invalid coupon for order) |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Unexpected server error |

---

# 17. BACKEND PROJECT STRUCTURE

```
backend/
│
├── config/
│   ├── database.js          # MongoDB connection (mongoose.connect)
│   ├── seed.js              # Seed script (categories, products, combos, settings, users, orders)
│   └── env.js               # Environment variable loading/validation
│
├── models/
│   ├── User.js              # Customer model (fullName, email, phone, passwordHash, address, status)
│   ├── Admin.js             # Admin model (fullName, email, passwordHash, role, status, lastLogin)
│   ├── Category.js          # Category model (name, description, imageUrl, status)
│   ├── Product.js           # Product model (category ref, name, sku, price, stock, reorderLevel, images, status)
│   ├── Cart.js              # Cart model (user ref, items[])
│   ├── Order.js             # Order model (user ref, items[], totals, status, statusHistory)
│   ├── Review.js            # Review model (user ref, product ref, rating, reviewText, status)
│   ├── ContactMessage.js    # Contact message model (name, email, phone, subject, message, status)
│   ├── Combo.js             # Combo model (name, price, description, tag, status, items[])
│   ├── Setting.js           # Setting model (settingKey, settingValue)
│   ├── Coupon.js            # Coupon model (code, discountType, discountValue, validity, usage)
│   └── index.js             # Model registry (exports all models)
│
├── controllers/
│   ├── authController.js        # register, login, logout, me
│   ├── adminAuthController.js   # adminLogin, adminMe
│   ├── productController.js     # listProducts, getProduct, getProductBySlug, getReviews, getRelated
│   ├── categoryController.js    # listCategories, getCategory, getCategoryProducts
│   ├── cartController.js        # getCart, addItem, updateItem, removeItem, clearCart
│   ├── checkoutController.js    # validateCheckout, placeOrder
│   ├── orderController.js       # myOrders, getOrder, trackOrder, cancelOrder
│   ├── reviewController.js      # createReview, updateReview, deleteReview
│   ├── comboController.js       # listCombos, getCombo, addComboToCart
│   ├── contactController.js     # submitContact
│   ├── adminProductController.js    # create, list, get, update, delete
│   ├── adminCategoryController.js   # create, list, update, delete
│   ├── adminOrderController.js      # list, get, updateStatus
│   ├── adminCustomerController.js   # list, get, getOrders
│   ├── adminInventoryController.js  # list, lowStock, outOfStock, update
│   ├── adminReviewController.js     # list, delete
│   ├── adminComboController.js      # create, list, update, delete
│   ├── adminContactController.js    # list, get, update, delete
│   ├── adminDashboardController.js  # summary, sales, orders, topProducts, categorySales, recentOrders, lowStock
│   ├── adminReportController.js     # sales, products, categories
│   ├── adminSettingController.js    # get, update
│   └── homeController.js            # homeAggregate
│
├── routes/
│   ├── auth.js               # POST /register, POST /login, POST /logout, GET /me
│   ├── adminAuth.js          # POST /login, GET /me
│   ├── products.js           # GET /, GET /:id, GET /slug/:slug, GET /:id/reviews, GET /:id/related
│   ├── categories.js         # GET /, GET /:id, GET /:id/products
│   ├── cart.js               # GET /, POST /items, PUT /items/:productId, DELETE /items/:productId, DELETE /
│   ├── checkout.js           # POST /validate, POST /
│   ├── orders.js             # GET /, GET /:id, GET /:id/track, POST /:id/cancel
│   ├── reviews.js            # POST /products/:productId/reviews, PUT /:id, DELETE /:id
│   ├── combos.js             # GET /, GET /:id, POST /:id/add-to-cart
│   ├── contact.js            # POST /
│   ├── home.js               # GET /
│   ├── coupon.js             # POST /validate
│   ├── adminProducts.js      # GET /, POST /, GET /:id, PUT /:id, DELETE /:id
│   ├── adminCategories.js    # GET /, POST /, PUT /:id, DELETE /:id
│   ├── adminOrders.js        # GET /, GET /:id, PUT /:id/status
│   ├── adminCustomers.js     # GET /, GET /:id, GET /:id/orders
│   ├── adminInventory.js     # GET /, GET /low-stock, GET /out-of-stock, PUT /:productId
│   ├── adminReviews.js       # GET /, DELETE /:id
│   ├── adminCombos.js        # GET /, POST /, PUT /:id, DELETE /:id
│   ├── adminContact.js       # GET /, GET /:id, PUT /:id, DELETE /:id
│   ├── adminDashboard.js     # GET /summary, /sales, /orders, /top-products, /category-sales, /recent-orders, /low-stock
│   ├── adminReports.js       # GET /sales, /products, /categories
│   ├── adminSettings.js      # GET /, PUT /
│   └── index.js              # Route registry (mounts all routes)
│
├── middleware/
│   ├── auth.js               # authenticateUser, authenticateAdmin
│   ├── authorize.js          # authorizeRole
│   ├── validate.js           # validateRequest
│   ├── errorHandler.js       # errorHandler
│   ├── rateLimiter.js        # apiLimiter, authLimiter, contactLimiter
│   ├── logger.js             # request logging
│   └── cors.js               # CORS configuration
│
├── services/
│   ├── authService.js        # JWT sign/verify, password hashing
│   ├── cartService.js        # Cart operations, stock validation
│   ├── orderService.js       # Order creation pipeline, price calculation
│   ├── inventoryService.js   # Stock deduction/restoration
│   ├── reviewService.js      # Rating aggregation
│   ├── dashboardService.js   # Dashboard aggregations
│   ├── reportService.js      # Report aggregations
│   └── settingService.js     # Settings get/update
│
├── validators/
│   ├── authValidator.js      # register, login schemas
│   ├── productValidator.js   # create, update schemas
│   ├── categoryValidator.js  # create, update schemas
│   ├── cartValidator.js      # addItem, updateItem schemas
│   ├── orderValidator.js     # placeOrder, cancelOrder schemas
│   ├── reviewValidator.js    # create, update schemas
│   ├── comboValidator.js     # create, update schemas
│   ├── contactValidator.js   # submitContact schema
│   └── settingsValidator.js  # updateSettings schema
│
├── utils/
│   ├── ApiError.js           # Custom error class with status code
│   ├── ApiResponse.js        # Success/error response helpers
│   ├── asyncHandler.js       # Wraps async route handlers
│   ├── generateOrderNumber.js # VC-YYYY-XXXX generator
│   ├── generateSlug.js       # Slug generator from name
│   ├── calculatePricing.js   # Subtotal, discount, delivery, GST, total
│   └── paginate.js           # Pagination helper
│
├── uploads/                  # Uploaded product images (multer)
│
├── app.js                    # Express app setup (middleware, routes, error handler)
├── server.js                 # Server entry point (connect DB, start listening)
├── package.json
└── .env
```

## Folder Responsibilities

| Folder | Responsibility |
|--------|---------------|
| `config/` | Database connection, seed data, environment configuration |
| `models/` | Mongoose schemas and models — defines the data structure |
| `controllers/` | Request handlers — receive req/res, call services, send responses |
| `routes/` | Route definitions — map HTTP methods + paths to controllers |
| `middleware/` | Cross-cutting concerns — auth, validation, error handling, rate limiting, logging, CORS |
| `services/` | Business logic — reusable operations (order pipeline, pricing, inventory) |
| `validators/` | Request validation schemas (Joi/express-validator) |
| `utils/` | Helper functions — response formatting, pagination, slug generation |
| `uploads/` | Static storage for uploaded product images |

---

# 18. SECURITY

## 18.1 Authentication & Authorization

| Layer | Implementation |
|-------|---------------|
| Password hashing | bcrypt with 10 salt rounds — never store plain text |
| JWT signing | `jsonwebtoken` with `process.env.JWT_SECRET` |
| JWT expiry | 7 days (`JWT_EXPIRES=7d` in `.env`) |
| Customer routes | Protected by `authenticateUser` middleware |
| Admin routes | Protected by `authenticateAdmin` middleware |
| Role-based access | `authorizeRole('super_admin', 'manager')` for fine-grained control |
| Password never exposed | Always `select('-passwordHash')` or map responses to exclude it |

## 18.2 Input Validation

| Layer | Implementation |
|-------|---------------|
| Request body validation | Joi schemas via `validateRequest` middleware |
| Query parameter validation | Validate types, ranges, allowed values |
| Path parameter validation | Validate ObjectId format (Mongoose `CastError` handled) |
| Sanitization | Trim strings, lowercase emails, escape HTML in review/contact text |

## 18.3 MongoDB Injection Prevention

| Layer | Implementation |
|-------|---------------|
| Mongoose ODM | Automatically escapes queries — no raw string concatenation |
| Parameterized queries | Use Mongoose query methods (`find`, `findOne`, `aggregate`) |
| `$regex` escaping | Escape user input in regex searches: `q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')` |
| No `$where` | Never use `$where` with user input |
| Schema validation | Mongoose schema types + validators reject invalid data |

## 18.4 CORS Configuration

```js
// Development
app.use(cors());

// Production — restrict origins
app.use(cors({
  origin: ['http://localhost:3000', 'https://vendhancrackers.in'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
```

## 18.5 Rate Limiting

| Endpoint | Limit |
|----------|-------|
| All `/api` routes | 300 requests / 15 minutes |
| `/api/auth/login` | 20 attempts / 15 minutes |
| `/api/admin/auth/login` | 20 attempts / 15 minutes |
| `/api/auth/register` | 20 attempts / 15 minutes |
| `/api/contact` | 5 messages / 1 hour |

## 18.6 Secure Error Responses

| Rule | Implementation |
|------|---------------|
| No stack traces | Never return `err.stack` in production responses |
| Generic messages | `"Internal server error"` instead of `"MongoServerError: ..."` |
| Log details server-side | `console.error` full error details, return generic message |
| Validation errors | Return field-specific messages (safe, user-friendly) |
| 404 for hidden resources | Return 404 (not 403) for other users' orders to prevent existence leaks |

## 18.7 Environment Variables

```env
# backend/.env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/vendhan_crackers
JWT_SECRET=your_strong_secret_key_here
JWT_EXPIRES=7d
NODE_ENV=development
CORS_ORIGIN=http://localhost:3000
```

**Rules:**
- Never commit `.env` to version control (add to `.gitignore`)
- Provide `.env.example` with placeholder values
- Use a strong, random JWT secret (min 32 characters)
- Rotate JWT secret periodically

## 18.8 Additional Security Measures

| Measure | Implementation |
|---------|---------------|
| Helmet.js | Set secure HTTP headers: `app.use(helmet())` |
| Express JSON limit | `app.use(express.json({ limit: '10mb' }))` |
| File upload validation | Multer with file type filter (jpg/png/webp) + size limit (2MB) |
| Order ownership | `Order.findOne({ _id, user: req.user.id })` |
| Cart isolation | Cart fetched by `req.user.id` only |
| Review ownership | `Review.findOne({ _id, user: req.user.id })` |
| Admin-only routes | All `/api/admin/*` behind `authenticateAdmin` |
| HTTPS | Required in production |

---

# 19. API DOCUMENTATION TABLE

## 19.1 PUBLIC APIs

| # | Method | Endpoint | Access | Purpose | Request Body | Query Parameters | Response | Status Codes |
|---|--------|----------|--------|---------|--------------|------------------|----------|--------------|
| 1 | POST | `/api/auth/register` | Public | Create customer account | `{ fullName, email, phone, password }` | — | `{ success, message, token, user }` | 201, 400, 409, 500 |
| 2 | POST | `/api/auth/login` | Public | Customer login | `{ email_or_phone, password }` | — | `{ success, message, token, user }` | 200, 400, 401, 403, 500 |
| 3 | GET | `/api/products` | Public | List products with filters | — | `q, category_id, price_min, price_max, availability, discount, sort, page, limit` | `{ success, products, total, page, totalPages }` | 200, 500 |
| 4 | GET | `/api/products/:id` | Public | Get product by ID | — | — | `{ success, product }` | 200, 404, 500 |
| 5 | GET | `/api/products/slug/:slug` | Public | Get product by slug | — | — | `{ success, product }` | 200, 404, 500 |
| 6 | GET | `/api/products/:id/reviews` | Public | Get product reviews | — | `page, limit` | `{ success, reviews, ratingAvg, ratingCount, total, page, totalPages }` | 200, 500 |
| 7 | GET | `/api/products/:id/related` | Public | Get related products | — | `limit` | `{ success, products }` | 200, 404, 500 |
| 8 | GET | `/api/categories` | Public | List active categories | — | — | `{ success, categories }` | 200, 500 |
| 9 | GET | `/api/categories/:id` | Public | Get category by ID | — | — | `{ success, category }` | 200, 404, 500 |
| 10 | GET | `/api/categories/:id/products` | Public | Get products in category | — | `page, limit, sort` | `{ success, products, total, page, totalPages }` | 200, 404, 500 |
| 11 | GET | `/api/combos` | Public | List active combos | — | — | `{ success, combos }` | 200, 500 |
| 12 | GET | `/api/combos/:id` | Public | Get combo by ID | — | — | `{ success, combo }` | 200, 404, 500 |
| 13 | POST | `/api/contact` | Public | Submit contact message | `{ name, email, phone, subject, message }` | — | `{ success, message, messageId }` | 201, 400, 500 |
| 14 | GET | `/api/home` | Public | Home page aggregate | — | — | `{ success, featuredProducts, categories, combos, testimonials, stats, settings }` | 200, 500 |

## 19.2 CUSTOMER APIs

| # | Method | Endpoint | Access | Purpose | Request Body | Query Parameters | Response | Status Codes |
|---|--------|----------|--------|---------|--------------|------------------|----------|--------------|
| 1 | POST | `/api/auth/logout` | Customer | Logout | — | — | `{ success, message }` | 200, 401 |
| 2 | GET | `/api/auth/me` | Customer | Get profile | — | — | `{ success, user }` | 200, 401, 404, 500 |
| 3 | GET | `/api/cart` | Customer | Get cart | — | — | `{ success, cartId, items, subtotal }` | 200, 401, 500 |
| 4 | POST | `/api/cart/items` | Customer | Add to cart | `{ productId, quantity }` | — | `{ success, message, cartId, items, subtotal }` | 200, 400, 401, 404, 409, 500 |
| 5 | PUT | `/api/cart/items/:productId` | Customer | Update cart item qty | `{ quantity }` | — | `{ success, cartId, items, subtotal }` | 200, 400, 401, 404, 409, 500 |
| 6 | DELETE | `/api/cart/items/:productId` | Customer | Remove cart item | — | — | `{ success, cartId, items, subtotal }` | 200, 401, 500 |
| 7 | DELETE | `/api/cart` | Customer | Clear cart | — | — | `{ success, message }` | 200, 401, 500 |
| 8 | POST | `/api/checkout/validate` | Customer | Validate checkout | `{ address, city, state, pincode, couponCode }` | — | `{ success, valid, items, pricing, coupon }` | 200, 400, 401, 404, 409, 500 |
| 9 | POST | `/api/checkout` | Customer | Place order | `{ address, city, state, pincode, paymentMethod, couponCode }` | — | `{ success, message, orderId, orderNumber, grandTotal }` | 201, 400, 401, 404, 409, 500 |
| 10 | GET | `/api/orders` | Customer | My orders | — | `page, limit, status` | `{ success, orders, total, page, totalPages }` | 200, 401, 500 |
| 11 | GET | `/api/orders/:id` | Customer | Order detail | — | — | `{ success, order, items }` | 200, 401, 403, 404, 500 |
| 12 | GET | `/api/orders/:id/track` | Customer | Track order | — | — | `{ success, orderNumber, status, timeline, estimatedDelivery }` | 200, 401, 403, 404, 500 |
| 13 | POST | `/api/orders/:id/cancel` | Customer | Cancel order | `{ reason }` | — | `{ success, message, order }` | 200, 400, 401, 403, 404, 500 |
| 14 | POST | `/api/products/:productId/reviews` | Customer | Submit review | `{ rating, reviewText }` | — | `{ success, message, reviewId }` | 201, 400, 401, 404, 409, 500 |
| 15 | PUT | `/api/reviews/:id` | Customer | Update review | `{ rating, reviewText }` | — | `{ success, message }` | 200, 400, 401, 403, 404, 500 |
| 16 | DELETE | `/api/reviews/:id` | Customer | Delete review | — | — | `{ success, message }` | 200, 401, 403, 404, 500 |
| 17 | POST | `/api/combos/:id/add-to-cart` | Customer | Add combo to cart | — | — | `{ success, message, cartId, items, subtotal }` | 200, 400, 401, 404, 409, 500 |
| 18 | POST | `/api/coupon/validate` | Customer | Validate coupon | `{ code, subtotal }` | — | `{ success, message, discountAmount, coupon }` | 200, 400, 401, 404, 500 |

## 19.3 ADMIN APIs

| # | Method | Endpoint | Access | Purpose | Request Body | Query Parameters | Response | Status Codes |
|---|--------|----------|--------|---------|--------------|------------------|----------|--------------|
| 1 | POST | `/api/admin/auth/login` | Public | Admin login | `{ email, password }` | — | `{ success, message, token, admin }` | 200, 400, 401, 403, 500 |
| 2 | GET | `/api/admin/auth/me` | Admin | Get admin profile | — | — | `{ success, admin }` | 200, 401, 404, 500 |
| 3 | GET | `/api/admin/dashboard/summary` | Admin | Dashboard KPIs | — | — | `{ success, summary }` | 200, 401, 500 |
| 4 | GET | `/api/admin/dashboard/sales` | Admin | Sales chart data | — | `period, year` | `{ success, period, year, data }` | 200, 401, 500 |
| 5 | GET | `/api/admin/dashboard/orders` | Admin | Orders by status | — | — | `{ success, orders }` | 200, 401, 500 |
| 6 | GET | `/api/admin/dashboard/top-products` | Admin | Top selling products | — | `limit` | `{ success, products }` | 200, 401, 500 |
| 7 | GET | `/api/admin/dashboard/category-sales` | Admin | Category sales | — | — | `{ success, categories }` | 200, 401, 500 |
| 8 | GET | `/api/admin/dashboard/recent-orders` | Admin | Recent orders | — | `limit` | `{ success, orders }` | 200, 401, 500 |
| 9 | GET | `/api/admin/dashboard/low-stock` | Admin | Low stock alerts | — | `limit` | `{ success, inventory }` | 200, 401, 500 |
| 10 | GET | `/api/admin/products` | Admin | List all products | — | `page, limit, q, category_id, status` | `{ success, products, total, page, totalPages }` | 200, 401, 500 |
| 11 | POST | `/api/admin/products` | Admin | Create product | `{ name, categoryId, price, oldPrice, description, shortDescription, mainImage, images, stock, reorderLevel, status, isFeatured, sku }` | — | `{ success, message, id }` | 201, 400, 401, 409, 500 |
| 12 | GET | `/api/admin/products/:id` | Admin | Get product for edit | — | — | `{ success, product }` | 200, 401, 404, 500 |
| 13 | PUT | `/api/admin/products/:id` | Admin | Update product | Any subset of create body | — | `{ success, message }` | 200, 400, 401, 404, 409, 500 |
| 14 | DELETE | `/api/admin/products/:id` | Admin | Delete product | — | — | `{ success, message }` | 200, 401, 404, 409, 500 |
| 15 | GET | `/api/admin/categories` | Admin | List all categories | — | — | `{ success, categories }` | 200, 401, 500 |
| 16 | POST | `/api/admin/categories` | Admin | Create category | `{ name, description, imageUrl, status }` | — | `{ success, message, id }` | 201, 400, 401, 409, 500 |
| 17 | PUT | `/api/admin/categories/:id` | Admin | Update category | Any subset of create body | — | `{ success, message }` | 200, 400, 401, 404, 409, 500 |
| 18 | DELETE | `/api/admin/categories/:id` | Admin | Delete category | — | — | `{ success, message }` | 200, 401, 404, 409, 500 |
| 19 | GET | `/api/admin/orders` | Admin | List all orders | — | `status, q, date_from, date_to, page, limit` | `{ success, orders, total, page, totalPages }` | 200, 401, 500 |
| 20 | GET | `/api/admin/orders/:id` | Admin | Order detail | — | — | `{ success, order, items }` | 200, 401, 404, 500 |
| 21 | PUT | `/api/admin/orders/:id/status` | Admin | Update order status | `{ status, note }` | — | `{ success, message, order }` | 200, 400, 401, 404, 500 |
| 22 | GET | `/api/admin/customers` | Admin | List customers | — | `q, page, limit, status` | `{ success, customers, total, page, totalPages }` | 200, 401, 500 |
| 23 | GET | `/api/admin/customers/:id` | Admin | Customer detail | — | — | `{ success, customer }` | 200, 401, 404, 500 |
| 24 | GET | `/api/admin/customers/:id/orders` | Admin | Customer orders | — | `page, limit, status` | `{ success, orders, total, page, totalPages }` | 200, 401, 404, 500 |
| 25 | GET | `/api/admin/inventory` | Admin | List inventory | — | `status, q, page, limit` | `{ success, inventory, total, page, totalPages }` | 200, 401, 500 |
| 26 | GET | `/api/admin/inventory/low-stock` | Admin | Low stock items | — | — | `{ success, inventory, total }` | 200, 401, 500 |
| 27 | GET | `/api/admin/inventory/out-of-stock` | Admin | Out of stock items | — | — | `{ success, inventory, total }` | 200, 401, 500 |
| 28 | PUT | `/api/admin/inventory/:productId` | Admin | Update stock/reorder | `{ quantity, reorderLevel }` | — | `{ success, message }` | 200, 400, 401, 404, 500 |
| 29 | GET | `/api/admin/reviews` | Admin | List all reviews | — | `status, page, limit` | `{ success, reviews, total, page, totalPages }` | 200, 401, 500 |
| 30 | DELETE | `/api/admin/reviews/:id` | Admin | Delete review | — | — | `{ success, message }` | 200, 401, 404, 500 |
| 31 | GET | `/api/admin/combos` | Admin | List all combos | — | — | `{ success, combos }` | 200, 401, 500 |
| 32 | POST | `/api/admin/combos` | Admin | Create combo | `{ name, price, description, tag, status, image, discount, items }` | — | `{ success, message, id }` | 201, 400, 401, 500 |
| 33 | PUT | `/api/admin/combos/:id` | Admin | Update combo | Any subset of create body | — | `{ success, message }` | 200, 400, 401, 404, 500 |
| 34 | DELETE | `/api/admin/combos/:id` | Admin | Delete combo | — | — | `{ success, message }` | 200, 401, 404, 500 |
| 35 | GET | `/api/admin/contact-messages` | Admin | List contact messages | — | `status, q, page, limit` | `{ success, messages, total, page, totalPages }` | 200, 401, 500 |
| 36 | GET | `/api/admin/contact-messages/:id` | Admin | Get contact message | — | — | `{ success, message }` | 200, 401, 404, 500 |
| 37 | PUT | `/api/admin/contact-messages/:id` | Admin | Update message status | `{ status }` | — | `{ success, message }` | 200, 400, 401, 404, 500 |
| 38 | DELETE | `/api/admin/contact-messages/:id` | Admin | Delete message | — | — | `{ success, message }` | 200, 401, 404, 500 |
| 39 | GET | `/api/admin/reports/sales` | Admin | Sales report | — | `from, to, group_by` | `{ success, report }` | 200, 400, 401, 500 |
| 40 | GET | `/api/admin/reports/products` | Admin | Product report | — | `from, to, limit` | `{ success, report }` | 200, 400, 401, 500 |
| 41 | GET | `/api/admin/reports/categories` | Admin | Category report | — | `from, to` | `{ success, report }` | 200, 400, 401, 500 |
| 42 | GET | `/api/admin/settings` | Admin | Get settings | — | — | `{ success, settings }` | 200, 401, 500 |
| 43 | PUT | `/api/admin/settings` | Admin | Update settings | Any subset of settings keys | — | `{ success, message }` | 200, 400, 401, 500 |

---

# 20. API IMPLEMENTATION ORDER

Recommended coding order for the complete backend:

| Step | Task | Files | Dependencies | Description |
|------|------|-------|--------------|-------------|
| 1 | **Express setup** | `app.js`, `server.js`, `package.json`, `.env` | Node.js, npm | Initialize Express app, middleware (cors, json, urlencoded), static uploads, 404 handler, error handler |
| 2 | **MongoDB connection** | `config/database.js` | Step 1 | Connect to MongoDB via Mongoose, handle connection errors, export connection |
| 3 | **Models** | `models/*.js`, `models/index.js` | Step 2 | Define all Mongoose schemas: User, Admin, Category, Product, Cart, Order, Review, ContactMessage, Combo, Setting, Coupon |
| 4 | **Authentication** | `routes/auth.js`, `routes/adminAuth.js`, `controllers/authController.js`, `controllers/adminAuthController.js`, `middleware/auth.js`, `services/authService.js`, `validators/authValidator.js` | Step 3 | Register, login, logout, me, admin login, admin me. bcrypt hashing + JWT issue/verify |
| 5 | **Categories** | `routes/categories.js`, `routes/adminCategories.js`, `controllers/categoryController.js`, `controllers/adminCategoryController.js` | Step 3, 4 | Public category listing + admin CRUD |
| 6 | **Products** | `routes/products.js`, `routes/adminProducts.js`, `controllers/productController.js`, `controllers/adminProductController.js`, `services/inventoryService.js` | Step 3, 4, 5 | Public product listing (filters/sort/pagination), product detail, related, admin CRUD |
| 7 | **Cart** | `routes/cart.js`, `controllers/cartController.js`, `services/cartService.js`, `validators/cartValidator.js` | Step 3, 4, 6 | Get cart, add item, update qty, remove item, clear cart. Stock validation |
| 8 | **Checkout** | `routes/checkout.js`, `controllers/checkoutController.js`, `services/orderService.js`, `utils/calculatePricing.js`, `utils/generateOrderNumber.js` | Step 3, 4, 6, 7 | Validate checkout, place order. Full pipeline: validate → calculate → create order → reduce stock → clear cart. Use MongoDB transactions |
| 9 | **Orders** | `routes/orders.js`, `routes/adminOrders.js`, `controllers/orderController.js`, `controllers/adminOrderController.js` | Step 3, 4, 8 | Customer: my orders, order detail, track, cancel. Admin: list, detail, update status. Stock restoration on cancel |
| 10 | **Inventory** | `routes/adminInventory.js`, `controllers/adminInventoryController.js` | Step 3, 4, 6 | List inventory, low stock, out of stock, update stock/reorder level |
| 11 | **Reviews** | `routes/reviews.js`, `routes/adminReviews.js`, `controllers/reviewController.js`, `controllers/adminReviewController.js`, `services/reviewService.js` | Step 3, 4, 6 | Customer: create/update/delete review. Public: product reviews. Admin: list/delete. Rating aggregation |
| 12 | **Combos** | `routes/combos.js`, `routes/adminCombos.js`, `controllers/comboController.js`, `controllers/adminComboController.js` | Step 3, 4, 6, 7 | Public: list combos, combo detail. Customer: add combo to cart. Admin: CRUD |
| 13 | **Customers** | `routes/adminCustomers.js`, `controllers/adminCustomerController.js` | Step 3, 4, 8 | List customers with order count + total spent, customer detail, customer orders |
| 14 | **Admin dashboard** | `routes/adminDashboard.js`, `controllers/adminDashboardController.js`, `services/dashboardService.js` | Step 3, 4, 6, 8, 9 | Summary KPIs, sales chart, orders by status, top products, category sales, recent orders, low stock |
| 15 | **Reports** | `routes/adminReports.js`, `controllers/adminReportController.js`, `services/reportService.js` | Step 3, 4, 8, 9 | Sales report, product report, category report with date ranges |
| 16 | **Contact** | `routes/contact.js`, `routes/adminContact.js`, `controllers/contactController.js`, `controllers/adminContactController.js` | Step 3, 4 | Public: submit message. Admin: list, get, update status, delete |
| 17 | **Settings** | `routes/adminSettings.js`, `controllers/adminSettingController.js`, `services/settingService.js` | Step 3, 4 | Get settings, update settings |
| 18 | **Error handling** | `middleware/errorHandler.js`, `utils/ApiError.js`, `utils/asyncHandler.js` | All steps | Centralized error handler, custom error class, async wrapper |
| 19 | **Security** | `middleware/rateLimiter.js`, `middleware/logger.js`, `middleware/cors.js`, `middleware/validate.js` | All steps | Rate limiting, request logging, CORS config, request validation |
| 20 | **Testing** | Test scripts, Postman collection | All steps | Test all customer flows (browse → search → filter → add → cart → checkout → orders), all admin flows (CRUD, status updates, inventory), validation/error cases |

---

## Summary

This blueprint defines **57 REST API endpoints** across 3 access levels:

| Access Level | Endpoints |
|--------------|-----------|
| **Public** | 14 |
| **Customer** | 18 |
| **Admin** | 43 |

The architecture uses:
- **Node.js + Express** for the REST API server
- **MongoDB + Mongoose** for data persistence
- **JWT + bcrypt** for authentication and password security
- **MongoDB transactions** for safe checkout operations
- **Mongoose aggregation pipelines** for dashboard and report calculations
- **Joi validation** for request validation
- **express-rate-limit** for rate limiting
- **Centralized error handling** for consistent error responses