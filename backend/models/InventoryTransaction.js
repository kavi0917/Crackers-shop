/* ============================================================
   VENDHAN CRACKERS — Inventory Transaction Model
   Tracks every stock change for auditability.
   ============================================================ */

const mongoose = require('mongoose');

const inventoryTransactionSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: [true, 'Product reference is required']
    },
    previousStock: {
      type: Number,
      required: [true, 'Previous stock is required'],
      min: [0, 'Previous stock cannot be negative']
    },
    newStock: {
      type: Number,
      required: [true, 'New stock is required'],
      min: [0, 'New stock cannot be negative']
    },
    changeAmount: {
      type: Number,
      required: [true, 'Change amount is required']
    },
    reason: {
      type: String,
      enum: ['SALE', 'ORDER_CANCELLED', 'ADMIN_ADJUSTMENT', 'INITIAL_STOCK'],
      required: [true, 'Reason is required']
    },
    referenceOrder: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      default: null
    },
    changedBy: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: 'changedByModel',
      default: null
    },
    changedByModel: {
      type: String,
      enum: ['User', 'Admin'],
      default: null
    },
    note: {
      type: String,
      default: null,
      trim: true,
      maxlength: [500, 'Note cannot exceed 500 characters']
    }
  },
  {
    timestamps: true
  }
);

/* ---------- Indexes ---------- */
inventoryTransactionSchema.index({ product: 1, createdAt: -1 });
inventoryTransactionSchema.index({ reason: 1 });
inventoryTransactionSchema.index({ referenceOrder: 1 });

module.exports = mongoose.model('InventoryTransaction', inventoryTransactionSchema);