// Backfill: stamp source="self_logged" on legacy Certificate docs created
// before the unified Certificate model (spec §7). Idempotent — only touches
// docs missing source; issued certificates (source="issued") are untouched.
const Certificate = require("../../models/Certificate");

async function migrate() {
  const filter = { $or: [{ source: { $exists: false } }, { source: null }] };
  const matched = await Certificate.countDocuments(filter);
  const res = await Certificate.updateMany(filter, {
    $set: { source: "self_logged" },
  });
  return { matched, modified: res.modifiedCount };
}

migrate.description = "Certificate.source → 'self_logged' on legacy docs";
module.exports = migrate;

if (require.main === module) {
  const { withDb } = require("./_db");
  withDb(async () => {
    const r = await migrate();
    console.log(`[002-certificate-source] matched=${r.matched} modified=${r.modified}`);
  })
    .then(() => process.exit(0))
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
