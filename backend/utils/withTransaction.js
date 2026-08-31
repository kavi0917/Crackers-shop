/* ============================================================
   VENDHAN CRACKERS — Transaction Helper
   ============================================================ */

const mongoose = require('mongoose');

/**
 * Check if MongoDB supports multi-document transactions.
 * Transactions require a replica set (or mongos/sharded cluster).
 * A standalone MongoDB instance will NOT support them.
 */
function isTransactionSupported() {
  try {
    const topology = mongoose.connection;
    if (!topology) return false;
    // Check if the connection is to a replica set
    const desc = topology && topology.client && topology.client.topology
      ? topology.client.topology.description
      : null;
    if (!desc) return false;
    // Replica set descriptions: 'ReplicaSetWithPrimary', 'ReplicaSetNoPrimary'
    // Standalone: 'Single', 'Unknown', 'LoadBalanced', 'Sharded'
    return (
      desc.type === 'ReplicaSetWithPrimary' ||
      desc.type === 'ReplicaSetNoPrimary' ||
      desc.type === 'Sharded'
    );
  } catch (err) {
    return false;
  }
}

/**
 * Run a function inside a MongoDB transaction if supported.
 * Falls back to running the function directly without a transaction
 * for standalone MongoDB instances.
 *
 * Usage:
 *   const result = await withTransaction(async (session) => {
 *     // ... operations using session (may be null on fallback)
 *     return value;
 *   });
 *
 * When session is null (fallback), callers must use atomic operations
 * (e.g., findOneAndUpdate with stock guards) to maintain consistency.
 */
async function withTransaction(fn) {
  if (isTransactionSupported()) {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const result = await fn(session);
      await session.commitTransaction();
      session.endSession();
      return result;
    } catch (err) {
      await session.abortTransaction();
      session.endSession();
      throw err;
    }
  }

  // Fallback: no transaction support — run with null session.
  // Callers must use atomic updates to prevent race conditions.
  return fn(null);
}

module.exports = { withTransaction, isTransactionSupported };