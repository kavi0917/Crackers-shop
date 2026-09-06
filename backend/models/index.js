/* ============================================================
   VENDHAN CRACKERS — Model Registry
   ============================================================ */

const User = require('./User');
const Admin = require('./Admin');
const Category = require('./Category');
const Product = require('./Product');
const Cart = require('./Cart');
const Order = require('./Order');
const Review = require('./Review');
const ContactMessage = require('./ContactMessage');
const Combo = require('./Combo');
const Setting = require('./Setting');
const InventoryTransaction = require('./InventoryTransaction');
const Commission = require('./Commission');
const Wishlist = require('./Wishlist');
const Coupon = require('./Coupon');
const AuditLog = require('./AuditLog');

module.exports = {
  User,
  Admin,
  Category,
  Product,
  Cart,
  Order,
  Review,
  ContactMessage,
  Combo,
  Setting,
  InventoryTransaction,
  Commission,
  Wishlist,
  Coupon,
  AuditLog
};