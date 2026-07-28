// Runs every backfill migration in order under a single DB connection.
// Idempotent: safe to run repeatedly (already-migrated docs are skipped).
//   node scripts/migrations/runAll.js
const { withDb } = require("./_db");

const migrations = [
  ["001-course-kind", require("./001-course-kind")],
  ["002-certificate-source", require("./002-certificate-source")],
  ["003-achievement-review-status", require("./003-achievement-review-status")],
  ["004-ticket-to-thread", require("./004-ticket-to-thread")],
];

withDb(async () => {
  console.log(`Running ${migrations.length} migration(s)...\n`);
  for (const [name, fn] of migrations) {
    const r = await fn();
    console.log(
      `[${name}] ${fn.description}\n    matched=${r.matched} modified=${r.modified}`
    );
  }
  console.log("\n✅ All migrations complete.");
})
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("\n❌ Migration failed:", e);
    process.exit(1);
  });
