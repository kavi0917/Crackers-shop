/* ============================================================
   VENDHAN CRACKERS — MongoDB Connection
   ============================================================ */

const mongoose = require('mongoose');

/**
 * Connect to MongoDB using the MONGODB_URI from environment variables.
 * The server will not start if the database connection fails.
 */
async function connectDB() {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      // Mongoose 8+ uses these by default; kept explicit for clarity
      serverSelectionTimeoutMS: 5000
    });

    console.log(`✅ MongoDB connected: ${conn.connection.host}/${conn.connection.name}`);

    // Handle connection errors after initial connection
    mongoose.connection.on('error', (err) => {
      console.error('❌ MongoDB connection error:', err.message);
    });

    // Handle graceful shutdown
    mongoose.connection.on('disconnected', () => {
      console.warn('⚠️ MongoDB disconnected');
    });

    return conn;
  } catch (err) {
    console.error('❌ MongoDB connection failed:', err.message);
    // Exit the process — server should not start without a database
    process.exit(1);
  }
}

/**
 * Gracefully close the MongoDB connection.
 * Called on server shutdown (SIGINT / SIGTERM).
 */
async function disconnectDB() {
  try {
    await mongoose.connection.close();
    console.log('👋 MongoDB connection closed');
  } catch (err) {
    console.error('❌ Error closing MongoDB connection:', err.message);
  }
}

module.exports = { connectDB, disconnectDB };