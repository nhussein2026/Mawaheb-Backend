// Startup check for backfills that the app's read paths already assume have
// run. Purely advisory — it logs and never throws, so a check that fails can
// never keep the API from booting.
//
// Right now this covers migration 004 only: `controllers/ticketController.js`
// reads exclusively from Thread, so any legacy Ticket that has not been copied
// across is silently invisible to `/tickets`. That is the kind of thing you
// want shouted on boot rather than discovered by a user.
const Ticket = require("../models/Ticket");
const Thread = require("../models/Thread");

const warnIfMigrationsPending = async () => {
  try {
    const legacyTickets = await Ticket.estimatedDocumentCount();
    if (legacyTickets === 0) return;

    const migrated = await Thread.countDocuments({
      category: "support",
      sourceTicket: { $ne: null },
    });
    const pending = legacyTickets - migrated;
    if (pending <= 0) return;

    console.warn(
      `⚠️  ${pending} legacy Ticket document(s) have not been migrated to Thread.\n` +
        "    /tickets reads from Thread only, so those tickets are invisible to the API.\n" +
        "    Run: npm run migrate"
    );
  } catch (error) {
    console.error("Migration status check failed:", error.message);
  }
};

module.exports = warnIfMigrationsPending;
