// Shared connect/teardown for one-off migration scripts. Reuses the app's
// existing connection config (config/db.js → MONGODB_URI, loads dotenv).
const mongoose = require("mongoose");
const connectDB = require("../../config/db");

async function withDb(fn) {
  await connectDB();
  try {
    return await fn();
  } finally {
    await mongoose.connection.close();
  }
}

module.exports = { withDb };
