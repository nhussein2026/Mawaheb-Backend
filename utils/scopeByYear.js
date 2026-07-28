const mongoose = require("mongoose");
const AcademicYear = require("../models/AcademicYear");

// Resolves the academic-year scope for a request based on `?academicYear=`.
//  - "all"            → cumulative view (no year filter)
//  - a valid ObjectId → that specific year
//  - omitted/invalid  → falls back to the currently active year
//
// Returns { filter, yearId, cumulative } where `filter` is a Mongo query
// fragment to spread into a find/aggregate match.
async function resolveYearScope(req) {
  const q = req.query.academicYear;

  if (q === "all") {
    return { filter: {}, yearId: null, cumulative: true };
  }

  if (q && mongoose.isValidObjectId(q)) {
    return { filter: { academicYear: q }, yearId: q, cumulative: false };
  }

  const active = await AcademicYear.findOne({ isActive: true }).lean();
  if (active) {
    return {
      filter: { academicYear: active._id },
      yearId: active._id,
      cumulative: false,
    };
  }

  // No years exist yet — return an empty (cumulative) scope rather than erroring.
  return { filter: {}, yearId: null, cumulative: true };
}

module.exports = { resolveYearScope };
