// Backfill: migrate legacy Ticket docs into the unified Thread model
// (category "support") + one ThreadMessage from the single `response` field
// (plan §7). Original Ticket docs are LEFT IN PLACE (safe rollback); the app no
// longer reads/writes them after the ticketController cutover.
//
// Idempotent: each created Thread records `sourceTicket`, and already-migrated
// tickets are skipped on re-run. Original createdAt/updatedAt are preserved.
const Ticket = require("../../models/Ticket");
const Thread = require("../../models/Thread");
const ThreadMessage = require("../../models/ThreadMessage");

const OLD_TO_SUPPORT = {
  Open: "open",
  "In Progress": "in_progress",
  Resolved: "resolved",
  Closed: "closed",
};

async function migrate() {
  const tickets = await Ticket.find().lean();
  const existing = await Thread.find({
    category: "support",
    sourceTicket: { $ne: null },
  })
    .select("sourceTicket")
    .lean();
  const done = new Set(existing.map((t) => String(t.sourceTicket)));

  let created = 0;
  let skipped = 0;
  let messages = 0;
  let invalid = 0;

  for (const t of tickets) {
    if (done.has(String(t._id))) {
      skipped += 1;
      continue;
    }
    if (!t.title || !t.description || !t.user) {
      invalid += 1;
      continue; // can't build a valid Thread without these
    }

    const createdAt = t.createdAt || new Date();
    const updatedAt = t.updatedAt || createdAt;

    const thread = new Thread({
      category: "support",
      subject: t.title,
      body: t.description,
      author: t.user,
      assignedTo: t.assignedTo || undefined,
      status: OLD_TO_SUPPORT[t.status] || "open",
      sourceTicket: t._id,
      lastMessageAt: updatedAt,
      lastMessageBy: t.assignedTo || t.user,
    });
    thread.createdAt = createdAt;
    thread.updatedAt = updatedAt;
    await thread.save({ timestamps: false });
    created += 1;

    if (t.response && String(t.response).trim()) {
      const msg = new ThreadMessage({
        thread: thread._id,
        author: t.assignedTo || t.user,
        body: t.response,
      });
      msg.createdAt = updatedAt;
      msg.updatedAt = updatedAt;
      await msg.save({ timestamps: false });
      messages += 1;
    }
  }

  return { matched: tickets.length - skipped, modified: created, skipped, messages, invalid };
}

migrate.description =
  "Ticket → Thread(category:support) + ThreadMessage from `response`";
module.exports = migrate;

if (require.main === module) {
  const { withDb } = require("./_db");
  withDb(async () => {
    const r = await migrate();
    console.log(
      `[004-ticket-to-thread] created=${r.modified} skipped=${r.skipped} messages=${r.messages} invalid=${r.invalid}`
    );
  })
    .then(() => process.exit(0))
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
