// Backfill: stamp reviewStatus="none" on legacy UserAchievement docs created
// before the unified achievement model (spec §7). Idempotent — only touches
// docs missing reviewStatus; institute-submitted achievements
// (pending/approved/rejected) are untouched, so the judging queue and the
// dashboard "approved achievements" stat stay correct.
const UserAchievement = require("../../models/UserAchievement");

async function migrate() {
  const filter = {
    $or: [{ reviewStatus: { $exists: false } }, { reviewStatus: null }],
  };
  const matched = await UserAchievement.countDocuments(filter);
  const res = await UserAchievement.updateMany(filter, {
    $set: { reviewStatus: "none" },
  });
  return { matched, modified: res.modifiedCount };
}

migrate.description = "UserAchievement.reviewStatus → 'none' on legacy docs";
module.exports = migrate;

if (require.main === module) {
  const { withDb } = require("./_db");
  withDb(async () => {
    const r = await migrate();
    console.log(`[003-achievement-review-status] matched=${r.matched} modified=${r.modified}`);
  })
    .then(() => process.exit(0))
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
