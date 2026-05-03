const User = require("../models/User");
const bcrypt = require("bcrypt");

/**
 * Seeds an initial admin user if no admin exists in the system.
 * Uses INITIAL_ADMIN_EMAIL, INITIAL_ADMIN_PASSWORD, and INITIAL_ADMIN_NAME from environment variables.
 */
const seedAdmin = async () => {
  const adminEmail = process.env.INITIAL_ADMIN_EMAIL;
  const adminPassword = process.env.INITIAL_ADMIN_PASSWORD;
  const adminName = process.env.INITIAL_ADMIN_NAME || "Super Admin";

  if (!adminEmail || !adminPassword) {
    console.log("ℹ️ Initial admin credentials not fully provided in environment variables. Skipping bootstrap.");
    return;
  }

  try {
    // Check if a user with the specified admin email already exists
    let user = await User.findOne({ email: adminEmail.toLowerCase() });

    if (user) {
      // Promote existing user to Admin
      user.role = "Admin";
      await user.save();
      console.log(`🚀 User with email ${adminEmail} found and promoted to Admin successfully.`);
    } else {
      // Create a brand new Admin user
      const hashedPassword = await bcrypt.hash(adminPassword, 10);
      user = new User({
        name: adminName,
        email: adminEmail.toLowerCase(),
        password: hashedPassword,
        role: "Admin",
      });
      await user.save();
      console.log(`🚀 Initial Admin user (${adminEmail}) created successfully.`);
    }
  } catch (error) {
    console.error("❌ Error during initial admin bootstrap:", error.message);
  }
};

module.exports = seedAdmin;
