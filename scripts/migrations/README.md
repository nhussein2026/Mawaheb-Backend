# Institute Portal — data migrations (Phase B)

One-time, **idempotent**, logged backfills that normalize legacy scholarship/
general rows onto the unified institute models (plan §7). Run once per
environment (dev → staging → prod). They connect via the app's existing
`config/db.js` (`MONGODB_URI` from `.env`).

## Run

```bash
# all at once (recommended)
npm run migrate

# or individually
node scripts/migrations/001-course-kind.js
node scripts/migrations/002-certificate-source.js
node scripts/migrations/003-achievement-review-status.js
node scripts/migrations/004-ticket-to-thread.js
```

Each prints `matched` / `modified` counts. Re-running is safe — the filters only
match docs that still lack the field, so a second run reports `modified=0`.

## What each does

| # | Script | Effect |
|---|--------|--------|
| 001 | `001-course-kind` | `Course.kind = "personal"` on docs missing `kind`. Training courses (`kind:"training"`) untouched. |
| 002 | `002-certificate-source` | `Certificate.source = "self_logged"` on docs missing `source`. Issued certs untouched. |
| 003 | `003-achievement-review-status` | `UserAchievement.reviewStatus = "none"` on docs missing it. Institute-submitted (pending/approved/rejected) untouched. |
| 004 | `004-ticket-to-thread` | Migrates each legacy `Ticket` → `Thread{category:"support"}` + one `ThreadMessage` from `response`. Preserves timestamps; original `Ticket` docs are left in place. |

001–003 are **not required for correctness** — Mongoose applies the same
defaults to every new write, and all queries key off the discriminators
(`kind`, `source`, `reviewStatus`). They exist to normalize pre-existing rows so
ad-hoc DB queries and reports see a consistent shape.

## 004 — Ticket → Thread (storage cutover)

The support-ticket UI and API have already been **repointed** at the unified
`Thread` model: `ticketController` now reads/writes `Thread{category:"support"}`
+ `ThreadMessage` behind the unchanged `/tickets` routes (status is mapped
between the old casing and the machine keys; the single `response` is one
message). New tickets go straight to `Thread`.

Run `004` once per environment to bring **existing** ticket rows across. It is
idempotent (each Thread records `sourceTicket`; re-runs skip already-migrated
tickets) and leaves the original `Ticket` collection untouched for rollback. The
`Ticket` model file is retained solely as this migration's data source.
