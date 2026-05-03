const mongoose = require("mongoose");
require("dotenv").config();

const connectDB = async () => {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    console.error("❌ MONGODB_URI is not defined in environment variables");
    process.exit(1);
  }

  try {
    // Check if already connected
    if (mongoose.connection.readyState === 1) {
      return;
    }

    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 10000, // fail faster if DB unreachable
      socketTimeoutMS: 45000,
      retryWrites: true,
    });

    console.log("✅ MongoDB connected successfully");

    // Optional: connection event logs
    mongoose.connection.on("connected", () => {
      console.log("📡 Mongoose connected to DB");
    });

    mongoose.connection.on("error", (err) => {
      console.error("❌ MongoDB runtime error:", err.message);
    });

    mongoose.connection.on("disconnected", () => {
      console.warn("⚠️ MongoDB disconnected");
    });
  } catch (error) {
    console.error("❌ Error connecting to MongoDB:", error.message);

    // Prevent app crash loops in production debugging
    process.exit(1);
  }
};

module.exports = connectDB;
