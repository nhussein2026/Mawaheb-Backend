# Mawaheb Backend (`mawaheb-api`)

REST API for the **Mawaheb** platform — a Node.js + Express + MongoDB service that powers
four distinct front-end experiences from a single codebase:

| Product area | Consumers | API namespace |
| --- | --- | --- |
| **Platform core** | Public site, general/scholarship students, employees, platform admins | `/auth`, `/user`, `/admin`, `/stats`, `/tickets`, `/employee`, `/courses`, `/certificates`, … |
| **Institute Portal — staff** (بوابة معهد حضرموت للموهوبين) | Super admins, track supervisors, trainers, gate guards | `/institute/*` |
| **Institute Portal — student** | Institute students | `/institute/me/*` |
| **Guardian Portal** (بوابة ولي الأمر) | Parents/guardians — read-only, no user account | `/institute/guardian/*` |

Front-end repo: [`mawaheb-web`](https://github.com/nhussein2026/mawaheb-web) (sibling folder
`../mawaheb-web`). The institute portal was built from the spec in
`../mawaheb-web/institiute-panel.md` and the merge plan in
`../mawaheb-web/INSTITUTE_PORTAL_PLAN.md` — those two documents remain the authoritative
functional reference; this README documents what is actually implemented.

---

## Table of contents

1. [Tech stack](#1-tech-stack)
2. [Quick start](#2-quick-start)
3. [Environment variables](#3-environment-variables)
4. [Scripts](#4-scripts)
5. [Project structure](#5-project-structure)
6. [Architecture & request lifecycle](#6-architecture--request-lifecycle)
7. [Roles & access model](#7-roles--access-model)
8. [Data model](#8-data-model)
9. [Enums reference](#9-enums-reference)
10. [API reference](#10-api-reference)
11. [Cross-cutting conventions](#11-cross-cutting-conventions)
12. [Seeding & demo data](#12-seeding--demo-data)
13. [Migrations](#13-migrations)
14. [Deployment](#14-deployment)
15. [Current state, known gaps & decision points](#15-current-state-known-gaps--decision-points)

---

## 1. Tech stack

| Concern | Choice | Notes |
| --- | --- | --- |
| Runtime | Node.js 20+ (CI builds on 24.x) | CommonJS (`require`), no build step |
| Framework | Express 4 | Single `index.js` entry, routers mounted per prefix |
| Database | MongoDB via Mongoose 8 | 27 models, no transactions used |
| Auth | `jsonwebtoken` + `bcrypt` | Stateless JWT in `Authorization: Bearer <token>` |
| File uploads | `multer` + `multer-storage-cloudinary` | Two storages: images, and images+PDF |
| Email | `nodemailer` (Gmail app password) | Password-reset flow only |
| Validation | Manual in controllers | `express-validator` is a dependency but unused |
| Tests | — | `npm test` is a placeholder; there is no test suite |

---

## 2. Quick start

```bash
# 1. Install
npm install                      # npm only — package-lock.json is the source of truth

# 2. Environment
cp .env.example .env             # then fill in the values (see §3)

# 3. Database — local Mongo via Docker (optional)
docker compose up -d             # starts mongo:7 on 27017, data persisted in a volume

# 4. Run
npm run dev                      # nodemon, auto-reload

# 5. (optional) Load a clickable demo dataset
npm run seed                     # ⚠️ destructive — see §12 before running
```

Then open:

- **http://localhost:3000/** — HTML health dashboard (DB status, collection list, memory, route count)
- **http://localhost:3000/health** — the same payload as JSON

> **Port:** `.env.example` sets `PORT=3000` and the front end's `.env` points at
> `http://localhost:3000`. If `PORT` is unset the code falls back to **3005** — which would
> break the front end's default. Keep `PORT=3000` locally.

On every startup the app runs these idempotent steps:

- `utils/seedAdmin.js` — creates the `INITIAL_ADMIN_EMAIL` user as `role: "Admin"`, or promotes
  an existing user with that email to Admin. Skipped unless both `INITIAL_ADMIN_*` vars are set.
- `utils/seedInstitute.js` — creates academic years `2025/2026` (active) and `2026/2027` if the
  `academicyears` collection is empty. **Skipped in production** unless
  `SEED_ACADEMIC_YEARS=true`, since academic years are domain data a real institute defines
  itself.
- `utils/pendingMigrations.js` — advisory only. Logs a warning if legacy `Ticket` documents
  exist that migration 004 has not copied into `Thread` (see §13). Never throws.

---

## 3. Environment variables

Copy `.env.example` → `.env`. `.env` is git-ignored; never commit real secrets.

| Variable | Required | Used by | Description |
| --- | --- | --- | --- |
| `PORT` | no | `index.js` | Local listen port. **Falls back to `3005`** if unset. |
| `NODE_ENV` | no | `index.js` | When `production`, the app does **not** call `listen()` (Azure App Service starts it). |
| `MONGODB_URI` | **yes** | `config/db.js` | Connection string. The process **exits** on startup if missing. |
| `ACCESS_TOKEN_SECRET` | **yes** | auth middleware, `authController`, `guardianController` | Signs & verifies every JWT, including guardian tokens and password-reset tokens. |
| `JWT_EXPIRES_IN` | **yes** | `authController.login` | Login token lifetime, e.g. `1h`, `7d`. Guardian tokens are hard-coded to `12h`. |
| `INITIAL_ADMIN_EMAIL` | for seeding | `utils/seedAdmin.js` | Bootstrap admin email. Skipped if absent. |
| `INITIAL_ADMIN_PASSWORD` | for seeding | `utils/seedAdmin.js` | Bootstrap admin password. |
| `INITIAL_ADMIN_NAME` | no | `utils/seedAdmin.js` | Defaults to `Super Admin`. |
| `SEED_ACADEMIC_YEARS` | no | `index.js` | Set to `true` to run the academic-year seeder in production. Outside production it runs regardless. |
| `SEED_CONFIRM` | no | `scripts/seed/seedInstitute.js` | Must name the target database exactly before the destructive demo seed will touch a non-local host. Ignored when `NODE_ENV=production` — there the seed is refused outright. |
| `CLOUDINARY_CLOUD_NAME` | for uploads | `config/cloudinary.js` | Cloudinary account. Without these, every multipart endpoint fails. |
| `CLOUDINARY_API_KEY` | for uploads | `config/cloudinary.js` | |
| `CLOUDINARY_API_SECRET` | for uploads | `config/cloudinary.js` | |
| `EMAIL` | for email | `authController.forgetPassword` | Gmail address used as the sender. |
| `PASSWORD_APP_EMAIL` | for email | `authController.forgetPassword` | Gmail **app password** (not the account password). |

---

## 4. Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Start with **nodemon** (auto-reload) — normal development loop. |
| `npm start` | `node index.js` — what Azure runs. |
| `npm run migrate` | Run all backfill migrations in `scripts/migrations/` in order (idempotent). See §13. |
| `npm run seed` | Load the institute demo dataset. **Destructive** — refuses to run under `NODE_ENV=production`, or against a non-local database without `SEED_CONFIRM`. See §12. |
| `npm test` | Placeholder — prints `No tests yet`. |

---

## 5. Project structure

```
.
├── index.js                       # Entry: CORS, JSON, DB connect + seeders, health pages,
│                                  # route mounting, error handler, conditional listen()
├── config/
│   ├── db.js                      # Mongoose connection (exits process if MONGODB_URI missing)
│   └── cloudinary.js              # cloudinary.config() from env
├── middlewares/
│   └── authMiddleware.js          # authenticated, isAdmin, isEmployee, isAdminOrEmployee,
│                                  # isInstituteAdmin, isInstituteStaff, isInstituteStudent,
│                                  # hasInstituteRole(...ranks), guardianAuth
├── models/                        # 27 Mongoose schemas — see §8
├── controllers/
│   ├── *.js                       # 15 platform-core controllers
│   └── institute/*.js             # 15 institute controllers (one per module + dashboard,
│                                  # student self-service, guardian, thread core)
├── routes/                        # 17 Express routers; institute is one large router file
├── utils/
│   ├── instituteEnums.js          # single source of truth for institute machine keys (§9)
│   ├── scopeByYear.js             # resolveYearScope(req) → academic-year filter
│   ├── paginate.js                # getPageParams / pagedResponse envelope
│   ├── uploads.js                 # uploadImage (images) / uploadDoc (images+PDF ≤5MB)
│   ├── cloudinary.js              # image storage (folder mawaheb/, 500x500 limit transform)
│   ├── cloudinaryDocs.js          # doc storage (folder mawaheb/institute/, resource_type auto)
│   ├── auditLog.js                # recordAudit() — fire-and-forget, never throws
│   ├── seedAdmin.js               # startup: bootstrap admin
│   └── seedInstitute.js           # startup: bootstrap academic years
├── scripts/
│   ├── migrations/                # 001–004 backfills + runAll.js + _db.js (see §13)
│   └── seed/seedInstitute.js      # full demo dataset (see §12)
├── docker-compose.yml             # local mongo:7 only — not for production
└── .github/workflows/main_mawaheb-api.yml   # Azure Web App deploy on push to main
```

---

## 6. Architecture & request lifecycle

1. **`index.js`** enables permissive CORS (`app.use(cors())` — all origins), JSON body parsing,
   then kicks off `connectDB()` and the two seeders.
2. **Health routes** (`/`, `/health`) introspect `mongoose.connection` and walk `app._router.stack`
   to report live route counts and collection names.
3. **Routers are mounted by prefix** (`index.js:510-526`). Note that six routers are mounted at
   the **root** (`app.use("/", …)`) — certificates, courses, notes, achievements, events,
   difficulties, student reports, financial reports — so their paths are declared in full inside
   the router file (e.g. `/certificates`, not `/`).
4. **Guards run per route** via `middlewares/authMiddleware.js`. `authenticated` decodes the JWT
   into `req.user` (`{ id, name, role, instituteRole, email }`); role guards re-fetch the `User`
   from Mongo and attach it as `req.instituteUser`.
5. **Controllers** own validation, querying and the response envelope. There is no service layer.
6. **A terminal error middleware** returns `500 { status:"error", message, error }` for anything
   thrown synchronously — but most controllers catch their own errors, so it rarely fires.

**Institute route ordering matters.** `routes/instituteRoutes.js` declares, in this order:
student submit endpoints → student self-service reads (`/me/*`) → guardian endpoints →
`router.use(authenticated, isInstituteStaff)` → all staff/admin endpoints. Anything added
*after* that `router.use` line inherits the staff guard automatically; anything student- or
guardian-facing **must** be declared above it.

---

## 7. Roles & access model

Two independent role fields live on `User`, deliberately not merged:

- **`role`** — platform-level: `User` | `Employee` | `Admin` | `Institute Student` | `Scholarship Student`
- **`instituteRole`** — institute membership rank: `super_admin` | `track_supervisor` | `trainer` | `gate_guard` | `student` | `null`

A platform `Admin` passes **every** institute guard regardless of `instituteRole`.

### Guard matrix (`middlewares/authMiddleware.js`)

| Guard | Passes when | Sets |
| --- | --- | --- |
| `authenticated` | Valid JWT in `Authorization: Bearer …` | `req.user` (JWT payload) |
| `isAdmin` | `user.role === "Admin"` | — |
| `isEmployee` | An `Employee` document exists for `req.user.id` | — |
| `isAdminOrEmployee` | `role` is `Admin` or `Employee` | — |
| `isInstituteAdmin` | `role === "Admin"` **or** `instituteRole ∈ {super_admin, track_supervisor}` | `req.instituteUser` |
| `isInstituteStaff` | `role === "Admin"` **or** `instituteRole ∈ {super_admin, track_supervisor, trainer, gate_guard}` | `req.instituteUser` |
| `isInstituteStudent` | `instituteRole === "student"` **or** `role === "Institute Student"` (back-compat) | `req.instituteUser` |
| `hasInstituteRole(...ranks)` | `role === "Admin"` **or** `instituteRole ∈ ranks` | `req.instituteUser` |
| `guardianAuth` | Valid JWT carrying a `guardian` claim (and **no** `user` claim) | `req.guardian` |

### Token shapes

```jsonc
// Normal login — POST /auth/login, lifetime = JWT_EXPIRES_IN
{ "user": { "id": "…", "name": "…", "role": "Admin", "instituteRole": "super_admin", "email": "…" } }

// Guardian login — POST /institute/guardian/login, lifetime = 12h, read-only
{ "guardian": { "studentUserId": "…", "studentName": "…", "academicNumber": "1101",
                "batch": "11", "level": "secondary_2" } }
```

Guardian tokens deliberately omit `user`, so `authenticated` rejects them; and `guardianAuth`
rejects normal tokens. The two session types cannot cross over.

### Institute tab visibility per rank

Enforced server-side by the guards above, and mirrored client-side in
`../mawaheb-web/src/constants/institute.js` (`INSTITUTE_NAV[].roles`):

| Module | super_admin | track_supervisor | trainer | gate_guard |
| --- | :-: | :-: | :-: | :-: |
| Dashboard | ✅ | ✅ | ✅ | ✅ |
| Years & students | ✅ | — | — | — |
| Members & trainers | ✅ | ✅ | — | — |
| Announcements | ✅ | ✅ | — | — |
| Bug reports | ✅ | ✅ | — | — |
| Results | ✅ | ✅ | ✅ | — |
| Evaluations | ✅ | ✅ | ✅ | — |
| Courses & programs | ✅ | — | ✅ | — |
| Correspondence | ✅ | ✅ | ✅ | — |
| Behavior log | ✅ | ✅ | — | — |
| Leave requests | ✅ | ✅ | — | ✅ |
| Achievements | ✅ | ✅ | ✅ | — |
| Ideas bank | ✅ | ✅ | — | — |
| Fees & installments | ✅ | — | — | — |

> ⚠️ The sidebar filter is **display only**. Server-side, everything below
> `router.use(authenticated, isInstituteStaff)` is reachable by *any* staff rank unless the
> route adds `isInstituteAdmin`. Only academic years, members, and fees carry that extra guard
> today — so e.g. a `gate_guard` can call `POST /institute/results` if they craft the request.
> See §15.

---

## 8. Data model

27 Mongoose models. Every institute-domain document carries an `academicYear` ref used for
year scoping (§11).

### 8.1 Identity & platform core

| Model | Key fields | Relations |
| --- | --- | --- |
| **User** | `name`, `full_name_en`, `username`, `email` (unique), `password` (bcrypt), `phone_number`, `date_of_birth`, `gender`, `bio`, `imageUrl`, `linkedin_link`, `website`, `current_education_level`, `role`, `instituteRole`, `lastSeenAt`, `requestedRole`, `roleRequestStatus`, `resetPasswordToken/Expires` | Referenced by nearly everything |
| **Employee** | `job_title`, `hire_date`, `bank_account_number`, `social_security_number` | `user → User` |
| **ScholarshipStudent** | `country_of_studying`, `city`, `university`, `type_of_university`, `program_of_study`, `student_university_id`, `enrollment_year`, `expected_graduation_year` | `user → User` |
| **Semester** | `semesterNumber`, `courses[{courseCode,courseName,grade,credits,ects,lg}]`, `resultImage`, `semesterGPA`, `totalGpa` | `user → User` |
| **StudentReport** | `title`, `date_of_report` | `user`, `courseId`, `noteId`, `difficultyId`, `userAchievementId`, `eventId`, `certificateId` |
| **FinancialReport** | `title`, `description`, `financial_report_image`, `date_of_report` | `user → User` |
| **Note** | `title`, `content`, `createdAt` | `user → User` |
| **Difficulty** | `title`, `description` | `user → User` |
| **Event** | `title`, `description`, `photo` | `user → User` |
| **Ticket** *(legacy)* | `title`, `description`, `response`, `status` (`Open`/`In Progress`/`Resolved`/`Closed`) | `user`, `assignedTo` — **retained only as the data source for migration 004**; the live `/tickets` API writes `Thread` |

### 8.2 Unified models (shared by platform **and** institute)

Each uses a discriminator field so one collection serves both worlds:

| Model | Discriminator | Variants |
| --- | --- | --- |
| **Course** | `kind` | `personal` — self-logged by a student (`user`, `course_image`)<br>`training` — institute-managed (`courseType`, `programTitleAr/En`, `certTitleEn`, `trainer`, `hours`, `periodText`, `documentationDate`, `status`, `batches[]`) |
| **Certificate** | `source` | `self_logged` — student-entered<br>`issued` — granted on training-course completion (`student`, `course`, `certTitleEn`, `serial`, `issuedAt`) |
| **UserAchievement** | `reviewStatus` | `none` — self-logged, no judging<br>`pending`/`approved`/`rejected` — institute judging workflow (`fileUrl`, `reviewer`, `feedback`, `reviewedAt`) |
| **Thread** + **ThreadMessage** | `category` | `support` (legacy tickets), `correspondence` (§9), `bug_report` (§5) |

**Thread** carries the opener (`subject`, `body`, `attachments[]`) plus `author`, `recipients[]`,
`assignedTo`, `moduleTag`, `status`, `lastMessageAt`, `lastMessageBy`, and `sourceTicket`
(unique+sparse index — the migration idempotency marker). Replies are **ThreadMessage** documents
(`thread`, `author`, `body`, `attachments[]`).

### 8.3 Institute-only models

| Model | Purpose | Key fields | Indexes |
| --- | --- | --- | --- |
| **AcademicYear** | Global scoping master record | `name`, `startDate`, `endDate`, `isActive`, `trainingStartDate/EndDate` | — (single-active enforced in controller) |
| **InstituteStudent** | Student academic/financial profile (1:1 with a `User`) | `academicNumber`, `batch`, `level`, `seatType`, `ideasBankBalance`, `governorate`, `district`, `guardianName`, `guardianMobile`, `guardianPinHash` (`select:false`) | — |
| **Announcement** | Targeted directives | `title`, `content`, `targetScope`, `targetRefs[]`, `publishStart/End`, `author` | — |
| **Result** | Grade-sheet image per exam | `term`, `examType`, `classification`, `imageUrl`, `approvedBy`, `guardianViewedAt` | — |
| **Evaluation** | Periodic evaluation report | `periodType`, `fileUrl`, `notes`, `approvedBy`, `guardianViewedAt` | — |
| **BehaviorEntry** | Conduct log | `type` (+/−), `title`, `description`, `attachmentUrl`, `author` | — |
| **LeaveRequest** | Leave + gate lifecycle | `departureAt`, `returnAt`, `reason`, `status`, `supervisorNotes`, `decidedBy/At`, `checkedOutAt`, `returnedAt` | — |
| **Idea** | Ideas bank submission | `subject`, `description`, `status`, `rewardPoints`, `pointsAwarded`, `notes`, `reviewer`, `reviewedAt` | — |
| **Enrollment** | Course ↔ student join | `enrolledVia` (`batch`/`manual`), `batch`, `completed`, `completedAt`, `certificate` | unique `(course, student)` |
| **Fee** | Annual fee per student/year | `totalAnnual` | unique `(student, academicYear)` |
| **Installment** | One of two 50% instalments | `seq` (1\|2), `amount`, `dueDate`, `isPaid`, `paidAt`, `markedBy` | unique `(fee, seq)` |
| **AuditLog** | Trail for sensitive mutations | `entity`, `entityId`, `action`, `actor`, `meta` | — |

**Guardian access is not a user account.** It is `InstituteStudent.guardianPinHash` (bcrypt) +
`academicNumber`, exchanged for a scoped 12-hour token.

---

## 9. Enums reference

Machine keys live in `utils/instituteEnums.js`; the Arabic display labels live on the front end
in `../mawaheb-web/src/constants/institute.js`. **Keep the two in sync — the key sets must match.**

| Enum | Values |
| --- | --- |
| `INSTITUTE_ROLES` | `super_admin`, `track_supervisor`, `trainer`, `gate_guard`, `student` |
| `INSTITUTE_ADMIN_ROLES` | `super_admin`, `track_supervisor` |
| `INSTITUTE_STAFF_ROLES` | `super_admin`, `track_supervisor`, `trainer`, `gate_guard` |
| `ACADEMIC_LEVELS` | `secondary_1`, `secondary_2`, `secondary_3`, `post_secondary_training`, `university`, `graduate` |
| `SEAT_TYPES` | `free`, `paid` |
| `ANNOUNCEMENT_SCOPES` | `all`, `level`, `batch`, `supervisors` |
| `RESULT_TERMS` | `term_1`, `term_2` |
| `RESULT_EXAM_TYPES` | `monthly_1`, `monthly_2`, `term_end`, `year_end` |
| `RESULT_CLASSIFICATIONS` | `monthly`, `term`, `final` |
| `EVALUATION_PERIODS` | `period_1`, `period_2`, `term_1`, `period_3`, `period_4`, `year_end`, `summer` |
| `COURSE_KINDS` | `personal`, `training` |
| `COURSE_TYPES` | `standalone`, `program` |
| `COURSE_STATUSES` | `ongoing`, `completed` |
| `CERTIFICATE_SOURCES` | `self_logged`, `issued` |
| `THREAD_CATEGORIES` | `support`, `correspondence`, `bug_report` |
| `THREAD_STATUSES_BY_CATEGORY` | `support`: open/in_progress/resolved/closed · `correspondence`: open/closed · `bug_report`: pending/in_progress/resolved |
| `BEHAVIOR_TYPES` | `positive`, `negative` |
| `LEAVE_STATUSES` | `pending`, `approved`, `rejected` |
| `ACHIEVEMENT_REVIEW_STATUSES` | `none`, `pending`, `approved`, `rejected` |
| `IDEA_STATUSES` | `under_study`, `approved`, `rejected` |
| `INSTALLMENT_SEQUENCES` | `1`, `2` |

---

## 10. API reference

Base URL: `http://localhost:3000` (local) · `https://mawaheb-api.azurewebsites.net` (production).

Legend — **Auth**: `—` public · `JWT` any authenticated user · `Admin` · `A/E` admin or employee ·
`Staff` institute staff · `IAdmin` institute admin · `IStudent` institute student · `Guardian`.

### 10.1 Health

| Method | Path | Auth | Notes |
| --- | --- | --- | --- |
| GET | `/` | — | HTML status dashboard; returns JSON instead when `Accept: application/json` |
| GET | `/health` | — | Same payload as JSON: uptime, memory, DB state, collection names, route list |

### 10.2 Auth — `/auth`

| Method | Path | Auth | Body | Notes |
| --- | --- | --- | --- | --- |
| POST | `/auth/signup` | — | `{name, email, password}` | Password must be ≥8 chars with ≥1 digit and ≥1 special char. Always creates `role: "User"`. |
| POST | `/auth/login` | — | `{email, password}` | → `{ token, user:{id,name,role,instituteRole,email} }` |
| POST | `/auth/forgot-Password` | — | `{email}` | Emails a 15-minute reset link. **The link host is hard-coded** to `https://mawaheb-fontend.vercel.app` in `controllers/authController.js`. |
| POST | `/auth/reset-password/:token` | — | `{newPassword}` | Token is a JWT signed with `ACCESS_TOKEN_SECRET`. |

### 10.3 Users — `/user`, `/admin`, `/stats`

| Method | Path | Auth | Notes |
| --- | --- | --- | --- |
| GET | `/user/users` | JWT | All users |
| GET | `/user/users/:id` | JWT | |
| GET | `/user/profile` | JWT | Current user's profile aggregate |
| GET | `/user/summary/` | JWT | Users summarised by category |
| PUT | `/user/update-profile` | JWT | `multipart/form-data`, field `profileImage` |
| DELETE | `/user/users/:id` | JWT | |
| POST | `/user/role-request` | JWT | `{requestedRole}` → sets `roleRequestStatus: "Pending"` |
| GET | `/user/admin/role-requests` | JWT | Admin check is **inside the controller** (`req.user.role !== "Admin"` → 403), not middleware |
| PUT | `/user/admin/role-requests/:userId` | JWT | `{status: "Approved"\|"Rejected"}`; approving copies `requestedRole` → `role` |
| GET | `/admin/users` | Admin | |
| GET | `/stats/general` | JWT | `{ total_users }` |
| GET | `/stats/admin` | Admin | User counts grouped by role |

### 10.4 Employees — `/employee`

| Method | Path | Auth | Notes |
| --- | --- | --- | --- |
| POST | `/employee/` | **none** | ⚠️ No middleware at all on this router — see §15 |
| GET | `/employee/` | **none** | |
| GET | `/employee/:id` | **none** | |
| GET | `/employee/user/:userId` | **none** | |
| PUT | `/employee/:id` | **none** | |
| DELETE | `/employee/:id` | **none** | |

### 10.5 Support tickets — `/tickets` (Thread-backed)

The legacy request/response contract is preserved; storage is `Thread{category:"support"}` +
`ThreadMessage`. Status is mapped both ways (`Open` ⇄ `open`, `In Progress` ⇄ `in_progress`, …)
and the single legacy `response` field is materialised from the latest `ThreadMessage`.

| Method | Path | Auth | Notes |
| --- | --- | --- | --- |
| POST | `/tickets` | JWT | `{title, description}` |
| GET | `/tickets/my` | JWT | Caller's own tickets |
| GET | `/tickets` | A/E | All tickets |
| GET | `/tickets/:id` | JWT | |
| PUT | `/tickets/:id` | A/E | Update status / add response |
| DELETE | `/tickets/:id` | JWT | |

### 10.6 Root-mounted resources

All are `authenticated` and scoped to the calling user unless noted. Each follows the same
five-verb CRUD shape.

| Base path | Router | Verbs |
| --- | --- | --- |
| `/certificates`, `/certificates/:id` | `certificateRoutes` | POST, GET, GET, PUT, DELETE |
| `/courses`, `/courses/:id` | `courseRoutes` | POST, GET, GET, PUT, DELETE |
| `/notes`, `/notes/:id` | `noteRoutes` | POST, GET, GET, PUT, DELETE |
| `/userAchievements`, `/userAchievements/:id` | `userAchievementRoutes` | POST, GET, GET, PUT, DELETE |
| `/events`, `/events/:id` | `eventRoutes` | POST, GET, GET, PUT, DELETE |
| `/difficulties`, `/difficulties/:id` | `difficultyRoutes` | POST, GET, GET, PUT, DELETE |
| `/financial-report`, `/financial-report/:id` | `financialReportRoutes` | POST, GET, GET, PUT, DELETE |

Student reports (irregular paths, note the singular/plural split):

| Method | Path | Auth |
| --- | --- | --- |
| POST | `/studentReport` | JWT |
| GET | `/studentReports` | JWT |
| GET | `/studentReports/options` | JWT |
| GET | `/allReports` | **Admin** |
| GET/PUT/DELETE | `/studentReport/:reportId` | JWT |

Scholarship & semesters:

| Method | Path | Auth |
| --- | --- | --- |
| POST/GET | `/scholarship-student` | JWT |
| GET/PUT/DELETE | `/scholarship-student/:id` | JWT |
| POST | `/semester` | JWT |
| GET | `/semester/all` | JWT |
| GET/PUT/DELETE | `/semester/:id` | JWT |

### 10.7 Institute Portal — staff (`/institute`)

Everything in this section requires `authenticated` + `isInstituteStaff`. Rows marked **IAdmin**
carry an additional `isInstituteAdmin` guard. All list endpoints accept
`?academicYear=<id|all>` (§11) plus the filters listed.

#### Dashboard

| Method | Path | Auth | Returns |
| --- | --- | --- | --- |
| GET | `/institute/dashboard` | Staff | `{ online:{supervisorsOnline,studentsOnline}, platform:{openMessages,approvedAchievements,approvedIdeas}, students:{registered,secondary,university,graduated}, seats:{freeSeats,paidSeats,paidFirstInstallment,paidSecondInstallment,overdueFirstInstallment,overdueSecondInstallment} }` |

#### Academic years & promotion (§2)

| Method | Path | Auth | Body / query |
| --- | --- | --- | --- |
| GET | `/institute/academic-years` | IAdmin | |
| POST | `/institute/academic-years` | IAdmin | `{name, startDate, endDate, isActive}` |
| PUT | `/institute/academic-years/:id` | IAdmin | same |
| DELETE | `/institute/academic-years/:id` | IAdmin | |
| PUT | `/institute/academic-years/:id/training` | IAdmin | `{trainingStartDate, trainingEndDate}` |
| GET | `/institute/students/promotable` | IAdmin | `?level=` |
| POST | `/institute/students/promote` | IAdmin | `{studentIds:[], targetLevel}` |

#### Members & trainers (§3)

| Method | Path | Auth | Body / query |
| --- | --- | --- | --- |
| GET | `/institute/members/stats` | IAdmin | → `{registeredStudents, supervisors, trainers, paidSeats}` |
| GET | `/institute/members` | IAdmin | `?group=all\|staff\|batch&batch=&level=&search=&page=&limit=` |
| POST | `/institute/members` | IAdmin | `{name, full_name_en, email, username, password, instituteRole, phone_number, bio, guardianPin, …student profile fields}` |
| GET | `/institute/members/:id` | IAdmin | |
| PUT | `/institute/members/:id` | IAdmin | |
| DELETE | `/institute/members/:id` | IAdmin | |

Creating a member with `instituteRole: "student"` also creates the `InstituteStudent` profile,
bcrypt-hashes `guardianPin` into `guardianPinHash`, and attaches the currently active academic year.
Student profile fields accepted: `academicNumber`, `batch`, `level`, `seatType`, `ideasBankBalance`,
`governorate`, `district`, `guardianName`, `guardianMobile`.

#### Announcements (§4)

| Method | Path | Body |
| --- | --- | --- |
| GET | `/institute/announcements` | |
| POST | `/institute/announcements` | `{title, content, targetScope, targetRefs[], publishStart, publishEnd}` |
| PUT | `/institute/announcements/:id` | partial |
| DELETE | `/institute/announcements/:id` | |

#### Academic results (§6)

| Method | Path | Body / query |
| --- | --- | --- |
| GET | `/institute/results` | `?student=&batch=&classification=&term=&examType=` |
| POST | `/institute/results` | `multipart` field `image` + `{student, term, examType, academicYear}` |
| PUT | `/institute/results/:id/guardian-viewed` | marks `guardianViewedAt` |
| DELETE | `/institute/results/:id` | |

#### Evaluation reports (§7)

| Method | Path | Body / query |
| --- | --- | --- |
| GET | `/institute/evaluations` | `?student=&batch=&periodType=` |
| POST | `/institute/evaluations` | `multipart` field `file` + `{student, periodType, notes, academicYear}` |
| PUT | `/institute/evaluations/:id/guardian-viewed` | |
| DELETE | `/institute/evaluations/:id` | |

#### Behavior log (§10)

| Method | Path | Body / query |
| --- | --- | --- |
| GET | `/institute/behavior/stats` | |
| GET | `/institute/behavior` | `?student=&batch=` |
| POST | `/institute/behavior` | `multipart` field `attachment` + `{student, type, title, description}` |
| DELETE | `/institute/behavior/:id` | |

#### Leave requests (§11)

| Method | Path | Body / query |
| --- | --- | --- |
| GET | `/institute/leave/stats` | |
| GET | `/institute/leave` | `?status=` |
| PUT | `/institute/leave/:id/decision` | `{status, supervisorNotes}` |
| PUT | `/institute/leave/:id/gate` | `{action: "check_out" \| "check_in"}` |

#### Ideas bank (§13)

| Method | Path | Body / query |
| --- | --- | --- |
| GET | `/institute/ideas/stats` | |
| GET | `/institute/ideas` | `?status=` |
| PUT | `/institute/ideas/:id/judge` | `{status, rewardPoints, notes}` — approving credits `InstituteStudent.ideasBankBalance` once, guarded by `pointsAwarded` |

#### Achievements (§12)

| Method | Path | Body / query |
| --- | --- | --- |
| GET | `/institute/achievements/stats` | |
| GET | `/institute/achievements` | `?reviewStatus=` (defaults to the judging queue) |
| PUT | `/institute/achievements/:id/judge` | `{reviewStatus, feedback}` |

#### Courses & programs (§8)

| Method | Path | Body |
| --- | --- | --- |
| GET | `/institute/courses/stats` | |
| GET | `/institute/courses` | |
| POST | `/institute/courses` | `{title, courseType, programTitleAr, programTitleEn, certTitleEn, trainer, hours, periodText, documentationDate, status, batches[], academicYear}` — auto-creates `Enrollment` rows for every student in the selected batches |
| PUT | `/institute/courses/:id` | partial; changing `batches` re-syncs enrolments |
| DELETE | `/institute/courses/:id` | |
| POST | `/institute/courses/:id/issue-certificates` | Issues one `Certificate{source:"issued"}` per enrolment and marks them completed |

#### Correspondence (§9) & bug reports (§5) — same Thread core

Replace `{cat}` with `correspondence` or `bugs`:

| Method | Path | Body / query |
| --- | --- | --- |
| GET | `/institute/{cat}/stats` | correspondence → `{inbox, awaiting, sent}` · bugs → `{total, pending, inProgress, resolved}` |
| GET | `/institute/{cat}` | `?status=` — sorted by `lastMessageAt` desc |
| GET | `/institute/{cat}/:id` | thread + all replies |
| POST | `/institute/{cat}` | `multipart` field `attachments` (≤5 files) + `{subject, body, moduleTag, recipients}` |
| POST | `/institute/{cat}/:id/reply` | `multipart` `attachments` + `{body}` |
| PUT | `/institute/{cat}/:id/status` | `{status}` — validated against that category's status set |

#### Fees & installments (§14) — IAdmin only

| Method | Path | Body |
| --- | --- | --- |
| GET | `/institute/fees/stats` | |
| GET | `/institute/fees` | |
| PUT | `/institute/fees/:studentId` | `{totalAnnual}` — creates/updates the `Fee` and its two 50% instalments |
| PUT | `/institute/fees/installments/:id/toggle` | Flips `isPaid`; writes an `AuditLog` entry |

#### Shared lookups

| Method | Path | Returns |
| --- | --- | --- |
| GET | `/institute/batches` | distinct batch values |
| GET | `/institute/students` | `?batch=` — lightweight id/name/academicNumber list for dropdowns |
| GET | `/institute/staff` | lightweight staff list for dropdowns |

### 10.8 Institute Portal — student (`/institute/me`, `IStudent`)

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/institute/me/overview` | Profile + headline counts |
| GET | `/institute/me/announcements` | Only those in the publish window whose scope matches `all`, the student's `level`, or `batch` |
| GET | `/institute/me/results` | |
| GET | `/institute/me/evaluations` | |
| GET | `/institute/me/behavior` | |
| GET | `/institute/me/leave` | |
| GET | `/institute/me/ideas` | |
| GET | `/institute/me/achievements` | |
| GET | `/institute/me/courses` | Enrolments joined with course + issued certificate |
| GET | `/institute/me/certificates` | |
| GET | `/institute/me/fees` | Fee + its two instalments |
| GET/POST | `/institute/me/correspondence` | POST is `multipart` `attachments` + `{subject, body}` |
| GET/POST | `/institute/me/bugs` | POST also accepts `moduleTag` |
| GET | `/institute/me/threads/:id` | Ownership-checked |
| POST | `/institute/me/threads/:id/reply` | `multipart` `attachments` + `{body}` |
| POST | `/institute/leave` | `{departureAt, returnAt, reason}` |
| POST | `/institute/ideas` | `{subject, description}` |
| POST | `/institute/achievements` | `multipart` field `file` + `{title, description, category}` |

> The three submit endpoints are declared **before** the staff guard in `instituteRoutes.js`
> and are individually wrapped in `isInstituteStudent`.

### 10.9 Guardian Portal (`/institute/guardian`)

| Method | Path | Auth | Notes |
| --- | --- | --- | --- |
| POST | `/institute/guardian/login` | — | `{academicNumber, pin}` → `{token, student}`; 12-hour read-only token |
| GET | `/institute/guardian/overview` | Guardian | Counts + how many results/evaluations are still unseen |
| GET | `/institute/guardian/results` | Guardian | **Side effect:** stamps `guardianViewedAt` on all unseen results |
| GET | `/institute/guardian/evaluations` | Guardian | **Side effect:** stamps `guardianViewedAt` |
| GET | `/institute/guardian/behavior` | Guardian | |
| GET | `/institute/guardian/fees` | Guardian | Fee + instalments |

---

## 11. Cross-cutting conventions

### Response envelopes

Two shapes coexist — institute controllers standardised on the first, older platform
controllers use the second:

```jsonc
// Institute modules
{ "success": true, "data": … }
{ "success": false, "message": "…" }

// Paginated institute lists (utils/paginate.js)
{ "success": true, "total": 57, "page": 2, "pages": 6, "limit": 10, "data": [ … ] }

// Older platform controllers — bare payload or { message } / { msg }
```

### Academic-year scoping

`utils/scopeByYear.js#resolveYearScope(req)` reads `?academicYear=`:

| Value | Behaviour |
| --- | --- |
| `all` | Cumulative — no year filter |
| a valid ObjectId | That specific year |
| omitted / invalid | Falls back to the `AcademicYear` with `isActive: true` |
| no years exist | Empty (cumulative) scope rather than an error |

The front end sends this on every institute call from a persisted Redux slice, so switching the
year in the header re-scopes every screen at once.

### Pagination

`utils/paginate.js` — `getPageParams(req, defaultLimit = 10)` → `{page, limit, skip}` and
`pagedResponse({data, total, page, limit})`. Note `memberController.listMembers` predates the
helper and computes pagination inline.

### File uploads

| Helper | Storage | Accepts | Limit |
| --- | --- | --- | --- |
| `uploadImage` (`utils/uploads.js`) | Cloudinary `mawaheb/` | jpg, jpeg, png, gif, webp | 500×500 `limit` transform applied |
| `uploadDoc` (`utils/uploads.js`) | Cloudinary `mawaheb/institute/` | jpg, jpeg, png, **pdf** (`resource_type: auto`) | **5 MB** (`MAX_DOC_BYTES`) |

Multipart field names by endpoint: `profileImage` (profile), `image` (results),
`file` (evaluations, achievements), `attachment` (behavior), `attachments` (threads, max 5).

### Audit logging

`utils/auditLog.js#recordAudit({entity, entityId, action, actor, meta})` is fire-and-forget —
it swallows its own errors so an audit failure can never break the business action. Currently
wired only into instalment paid/unpaid toggles (`feeController.toggleInstallment`).

---

## 12. Seeding & demo data

### Startup seeders (idempotent)

- **Admin** — `utils/seedAdmin.js`, driven by `INITIAL_ADMIN_*`. Runs in every environment;
  skipped entirely if either variable is unset.
- **Academic years** — `utils/seedInstitute.js`, skipped once any `AcademicYear` exists, and
  skipped in production altogether unless `SEED_ACADEMIC_YEARS=true`.

### Demo dataset — `npm run seed`

`scripts/seed/seedInstitute.js` builds a complete, clickable institute dataset: 2 academic years,
4 staff accounts, 6 students with profiles and guardian PINs, announcements, results, evaluations,
behavior entries, leave requests, ideas (one approved, crediting the ideas balance), achievements
in the judging queue, 2 training courses with enrolments and issued certificates, fees with
instalments, and one thread of each category.

> **⚠️ Destructive.** It deletes **all** `AcademicYear`, `Announcement`, `Result`, `Evaluation`,
> `BehaviorEntry`, `LeaveRequest`, `Idea`, `UserAchievement`, `Enrollment`, `Fee`, `Installment`,
> `Thread` and `ThreadMessage` documents, plus every `Course{kind:"training"}` and
> `Certificate{source:"issued"}`. Only *users* are limited to the `@demo.mawaheb.org` domain.
> Run it against a throwaway/dev database only.

`assertSafeToSeed()` enforces that rather than trusting convention. The script exits non-zero,
before opening a connection, when any of these hold:

| Condition | Behaviour |
| --- | --- |
| `NODE_ENV=production` | Refused. No override exists. |
| Host is not `localhost` / `127.0.0.1` / `mongo` / `mawaheb-mongo` | Refused unless `SEED_CONFIRM` names the target database exactly. |
| `mongodb+srv://` (any hosted cluster) | Always treated as remote — same `SEED_CONFIRM` requirement. |
| `MONGODB_URI` missing or unparseable | Refused — the target cannot be verified. |

```bash
npm run seed                                  # local database, no ceremony
SEED_CONFIRM=mawaheb-staging npm run seed     # deliberate, named, non-local target
```

Credentials it prints (password `password123` for every account):

| Portal | Accounts |
| --- | --- |
| `/institute-admin` | `admin@demo.mawaheb.org` (super_admin), `supervisor@…` (track_supervisor), `trainer@…`, `guard@…` (gate_guard) |
| `/institute-portal` | `student1101@demo.mawaheb.org` … `student1106@demo.mawaheb.org` |
| `/guardian/login` | academic number `1101`–`1106`, guardian PIN `1234` |

---

## 13. Migrations

`scripts/migrations/` holds one-time, idempotent backfills. Run once per environment
(dev → staging → prod):

```bash
npm run migrate                                  # all, in order
node scripts/migrations/001-course-kind.js       # or individually
```

| # | Script | Effect | Required? |
| --- | --- | --- | --- |
| 001 | `001-course-kind` | Sets `Course.kind = "personal"` where missing | No — Mongoose defaults cover new writes; normalises legacy rows |
| 002 | `002-certificate-source` | Sets `Certificate.source = "self_logged"` where missing | No — same reasoning |
| 003 | `003-achievement-review-status` | Sets `UserAchievement.reviewStatus = "none"` where missing | No — same reasoning |
| 004 | `004-ticket-to-thread` | Copies each legacy `Ticket` → `Thread{category:"support"}` + one `ThreadMessage` from `response` | **Yes** — the `/tickets` API already reads/writes `Thread`, so pre-existing tickets are invisible until this runs |

004 records `sourceTicket` on each created thread (unique+sparse index), so re-runs skip
already-migrated tickets. Original `Ticket` documents are left in place for rollback.

---

## 14. Deployment

- **Target:** Azure Web App **`mawaheb-api`** → `https://mawaheb-api.azurewebsites.net`
- **Trigger:** push to `main`, or manual `workflow_dispatch`
- **Workflow:** `.github/workflows/main_mawaheb-api.yml` — checkout → Node 24.x → `npm install`
  → `npm run build --if-present` (no-op) → `npm run test --if-present` (prints a message) →
  upload the whole repo as an artifact → `azure/webapps-deploy@v3` with a publish profile secret
- **Runtime:** `NODE_ENV=production` must be set in Azure app settings so `index.js` skips
  `app.listen()` and lets the platform host the exported `app`. All other env vars from §3 must
  be configured in Azure as well.
- **Not containerised.** `docker-compose.yml` is a local MongoDB convenience only.

### Release checklist

1. **Set `NODE_ENV=production`** in Azure app settings. Three behaviours depend on it: `index.js`
   skips `app.listen()`, `trust proxy` is enabled so the rate limiter sees real client IPs
   instead of the Azure proxy, and the destructive demo seed is refused outright.
2. **Run `npm run migrate` against the production database** — once, before or immediately with
   the first deploy that contains the Thread-backed `/tickets`. Until 004 runs, pre-existing
   tickets are invisible to the API (§13). The app logs a warning on boot while any remain
   unmigrated, but does not run the migration itself: backfills are a deliberate operator step,
   not something a web process should do on startup, least of all with several instances racing.
3. **Verify** `GET /health` and one `/tickets` read before announcing the release.

---

## 15. Current state, known gaps & decision points

Everything below is a factual observation of the code as it stands, grouped by how much it
matters. Use it as the input to the next planning round.

### 15.1 Security gaps

| # | Finding | Location | Impact |
| --- | --- | --- | --- |
| 1 | **`/employee` router has no authentication at all.** Every verb — including `POST` and `DELETE` — is publicly reachable, and the model holds `bank_account_number` and `social_security_number`. | `routes/employeeRoutes.js` | Unauthenticated read/write of employee PII |
| 2 | **CORS is fully open** (`app.use(cors())`, no origin allowlist). | `index.js:30` | Any origin can call the API with a user's token if it can obtain one |
| 3 | **Institute staff guards are coarse.** Below `router.use(authenticated, isInstituteStaff)` only academic-years, members and fees add `isInstituteAdmin`. A `trainer` or `gate_guard` can call results/evaluations/behavior/announcements/ideas/achievements/thread mutations directly, despite the sidebar hiding them. | `routes/instituteRoutes.js` | Privilege escalation within the institute portal |
| 4 | **Admin checks for role requests live in the controller, not middleware**, and rely on the JWT's `role` claim rather than a fresh DB read — a token minted before a demotion still passes. | `routes/userRoutes.js`, `controllers/userController.js:611,632` | Stale-privilege window |
| 5 | **Password-reset link host is hard-coded** to `https://mawaheb-fontend.vercel.app`, which is neither the local nor the current production front end (`mawaheb-web.azurewebsites.net`). | `controllers/authController.js` | Password reset is effectively broken in production |
| 6 | **`/scholarship-student`, `/semester` and the root CRUD routers are `authenticated` but not ownership-checked** at the route level. | multiple routers | Cross-tenant reads depend on per-controller filtering |
| 7 | **No helmet or request-size cap.** Rate limiting now covers `/institute/guardian/login` only (`middlewares/rateLimit.js`: 20 failed/IP and 10 failed/academic-number per 15 min). `loginLimiter` is exported for `/auth/login` but **not yet wired** — enable it deliberately, since too tight a limit locks out real users. | `index.js`, `routes/authRoutes.js` | Brute-force on `/auth/login` still unthrottled; no security headers |

### 15.2 Correctness / incomplete wiring

| # | Finding | Location |
| --- | --- | --- |
| 8 | **`User.lastSeenAt` is never written.** The dashboard's "online now" widget counts users whose `lastSeenAt` is within 5 minutes, so `supervisorsOnline` and `studentsOnline` are permanently `0`. A `lastSeenAt` touch is needed in `authenticated`. | `controllers/institute/dashboardController.js:60-76`, `models/User.js:32` |
| 9 | `authRoutes.js` destructures `adminLogin` from `authController`, which does not export it (silently `undefined`, never mounted). | `routes/authRoutes.js` |
| 10 | Two parallel achievement/course/certificate surfaces exist (`/courses` + `/institute/courses`, `/userAchievements` + `/institute/achievements`). Unification landed at the *model* level; the plan's "thin alias routes then remove" step (plan §7) has not happened. | `routes/*`, plan §7 |
| 11 | The `Ticket` model and collection still exist purely as migration 004's data source. Until 004 runs in an environment, that environment's old tickets are invisible to the `/tickets` API. | `models/Ticket.js`, `scripts/migrations/004-*` |
| 12 | ~~Half-finished Yarn PnP migration.~~ **Resolved:** `.yarn/`, `.pnp.*` and `yarn.lock` are git-ignored; npm and `package-lock.json` are the single source of truth. Delete the local leftovers with `rm -rf .yarn .pnp.cjs .pnp.loader.mjs yarn.lock` when convenient. | repo root |
| 13 | Health-check route introspection uses `app._router.stack`, a private Express 4 internal that is removed in Express 5 — it will break on upgrade. | `index.js:88-104` |

### 15.3 Operational gaps

- **No tests.** No unit, integration or smoke tests; CI runs `npm run test --if-present`, which prints a message and passes.
- **No linting or formatting** configured in this repo.
- **No structured logging** — everything is `console.log`/`console.error`; no request IDs, no log levels.
- **No API schema** — no OpenAPI/Swagger, no Postman collection. This README is the reference.
- **No input-validation layer** — `express-validator` is installed but unused; validation is ad-hoc per controller.
- **No index coverage review** — only four explicit indexes exist (`Enrollment`, `Fee`, `Installment`, `Thread.sourceTicket`); high-traffic filters like `InstituteStudent.academicYear`, `Result.student`, `Thread.category+status` are unindexed.

### 15.4 Open product decisions (carried over from `INSTITUTE_PORTAL_PLAN.md` §9)

These were listed as "confirm on review" in the plan. Where the code has since settled the
question, the resolution is noted:

| Question | Status in code |
| --- | --- |
| Reduced menus per rank | **Implemented client-side** (`INSTITUTE_NAV[].roles`); **not enforced server-side** — see gap #3 |
| Rename `UserAchievement`→`Achievement`, `Ticket`→`Thread` collections | **Not renamed.** `UserAchievement` and `Ticket` collections kept; `Thread` is a new collection |
| Guardian auth mechanism | **Settled:** academic number + bcrypt PIN → 12h scoped token, no `User` record |
| Course/Certificate unification shape | **Settled:** single model with `kind`/`source` discriminator |
| `super_admin` account type | **Both work.** `role:"Admin"` and `instituteRole:"super_admin"` each pass `isInstituteAdmin`; the demo seed gives the super admin both |
| Fees editability | **Settled:** `totalAnnual` is set per student and split 50/50 into two instalments |
| State management on the front end | **Settled:** plain axios + local state, no RTK Query |
| Split `instituteRoutes.js` into `routes/institute/*` (plan Phase A) | **Not done** — still one ~250-line router file |
