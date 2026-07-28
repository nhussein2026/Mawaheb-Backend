const AcademicYear = require("../models/AcademicYear");

// Seeds the two academic years captured in the migration spec, once, if none
// exist yet. Idempotent: skips entirely when any AcademicYear is already present.
const seedInstitute = async () => {
  try {
    const existing = await AcademicYear.countDocuments();
    if (existing > 0) return;

    await AcademicYear.create([
      {
        name: "2025/2026",
        startDate: new Date("2025-08-20"),
        endDate: new Date("2026-07-06"),
        isActive: true,
      },
      {
        name: "2026/2027",
        startDate: new Date("2026-08-15"),
        endDate: new Date("2027-04-11"),
        isActive: false,
      },
    ]);

    console.log("🎓 Seeded initial academic years (2025/2026, 2026/2027).");
  } catch (error) {
    console.error("❌ Error seeding institute academic years:", error.message);
  }
};

module.exports = seedInstitute;
