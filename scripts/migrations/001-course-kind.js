// Backfill: stamp kind="personal" on legacy Course docs created before the
// unified Course model (spec §7). Idempotent — only touches docs missing kind;
// training courses (kind="training") are untouched.
const Course = require("../../models/Course");

async function migrate() {
  const filter = { $or: [{ kind: { $exists: false } }, { kind: null }] };
  const matched = await Course.countDocuments(filter);
  const res = await Course.updateMany(filter, { $set: { kind: "personal" } });
  return { matched, modified: res.modifiedCount };
}

migrate.description = "Course.kind → 'personal' on legacy docs";
module.exports = migrate;

if (require.main === module) {
  const { withDb } = require("./_db");
  withDb(async () => {
    const r = await migrate();
    console.log(`[001-course-kind] matched=${r.matched} modified=${r.modified}`);
  })
    .then(() => process.exit(0))
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
