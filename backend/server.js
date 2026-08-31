/* ============================================================
   VENDHAN CRACKERS — Server Entry Point
   ============================================================ */

require('dotenv').config({ path: require('path').join(__dirname, '.env') });

const app = require('./app');
const { connectDB, disconnectDB } = require('./config/database');

const PORT = process.env.PORT || 5000;

/* ---------- Start Server ---------- */
async function startServer() {
  try {
    // Connect to MongoDB first — server should not start if DB fails
    await connectDB();

    const server = app.listen(PORT, () => {
      console.log(`🚀 Vendhan Crackers API running on http://localhost:${PORT}`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    });

    // Graceful shutdown
    const shutdown = async (signal) => {
      console.log(`\n${signal} received. Shutting down gracefully...`);
      server.close(async () => {
        await disconnectDB();
        process.exit(0);
      });
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
  } catch (err) {
    console.error('❌ Failed to start server:', err.message);
    process.exit(1);
  }
}

startServer();