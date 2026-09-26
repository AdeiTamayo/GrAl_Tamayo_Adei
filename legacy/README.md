# `legacy/` — Archived Backend (Phases 1–3)

> **Nothing in this folder runs as part of the application.**
> The live product is `gym-tracker-app/frontend` talking directly to Supabase.
> This code is kept for academic provenance: it documents how the project was
> built and why the architecture changed. See [`/docs/DECISIONS.md`](../docs/DECISIONS.md).

---

## What this is

The original full-stack backend, written before the Supabase migration:

| Layer | Technology |
|---|---|
| API | Express.js 5 — 56 REST endpoints across 9 routers |
| Data | PostgreSQL via the `pg` driver, parameterised raw SQL |
| Auth | Hand-rolled JWT (`jsonwebtoken`) + `bcrypt` password hashing |
| Uploads | Multer, 500 MB limit, MIME allow-list |
| Analysis | Python child processes — MediaPipe pose, Roboflow YOLO + OpenCV CSRT barbell tracking |
| Tests | Jest + Supertest — **75 test cases, all passing** |

## Why it was archived

The product requirements changed in two ways that invalidated this design:

1. **The analysis moved to the browser.** Uploading a video to a server, spawning
   Python, streaming NDJSON progress, then re-encoding with FFmpeg existed only to
   run MediaPipe and OpenCV. MediaPipe ships a WebAssembly build with a GPU
   delegate, so the whole pipeline runs client-side in one pass over a
   `<canvas>`. That removed the upload endpoint, the Python bridge, the FFmpeg
   transcode step, and the server-side video storage problem in one move.

2. **Supabase removed the reason for a custom API.** Supabase ships Postgres,
   Auth, and object storage behind one SDK. Once the analysis was client-side,
   the *only* thing the Express server did was proxy database queries and
   validate input — both of which Postgres Row Level Security and PostgREST
   already do, with the authorisation enforced in the database rather than in
   application code that can forget a `WHERE user_id = ?` clause.

Rewriting 8 model files and 2 controllers to the Supabase query builder was
judged to be more work than deleting them, so the cutover was made directly.

## Known state of this code

Stated plainly, because a broken archive is worse than an honest one:

- **`config/database.js` exports a Supabase client, but `models/*.js` still call
  `pool.query()`** (~78 call sites). Every DB-backed endpoint returns HTTP 500.
  The variable is still named `pool`, which is what made the mismatch easy to
  miss during review.
- **`middleware/auth.js` verifies a local HS256 JWT.** The live app authenticates
  with Supabase Auth (a JWT signed by Supabase, read via `auth.uid()`). The two
  are not interchangeable.
- **`models/user.js` inserts a `users.password` column** that the unified schema
  no longer defines — passwords moved to Supabase Auth. Registration and
  account deletion cannot work.
- **Both Python scripts hardcode `../tools/ffmpeg/bin/ffmpeg.exe`**, a path that
  is not in the repository, so their final transcode step fails.

**The test suite still passes, and that is not evidence the code works.** All 10
Supertest suites replace `config/database` with a mock `pg.Pool`, so the tests
exercise controllers and routing while never touching the real data layer or a
real Supabase client. `GET /api/videos` is the one endpoint that would genuinely
run, because it reads the filesystem instead of the database.

## Running the tests

The suite is still worth keeping green — it documents the API contract that the
Supabase data modules replaced.

```bash
cd legacy/backend
npm install
npm test        # 75 passing
```

`test/setupEnv.js` supplies a deterministic `JWT_SECRET`; without it the login
suite fails with `secretOrPrivateKey must have a value` on any machine whose
`.env` does not define one.

## The two scripts that are still useful

`scripts/populateExercices.ts` seeds the shared `exercises` catalogue from the
RapidAPI ExerciseDB and `scripts/checkDb.js` verifies Supabase connectivity.
Both are written against the Supabase client and both still work. They expect
their environment at `legacy/.env` — see `legacy/.env.example`.

```bash
cp .env.example .env      # fill in SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, RAPIDAPI_KEY
npm run seed
npm run db:check
```

## Layout

```
legacy/backend/
├── config/database.js       # Supabase client (service-role; bypasses RLS)
├── controllers/             # 9 controllers, 47 handlers
├── middleware/auth.js       # local JWT verification  (superseded)
├── migrations/schema.sql    # the live schema, incl. all RLS policies
├── models/                  # 8 raw-SQL model modules  (incompatible, see above)
├── python/
│   ├── landmarks_video.py   # MediaPipe pose + squat biomechanics
│   └── barbell_tracking.py  # Roboflow YOLO + OpenCV CSRT + velocity
├── routes/                  # 9 routers, 56 endpoints
├── scripts/                 # seed + connectivity check
├── utils/videoProcessor.js  # spawns Python, streams NDJSON progress
└── __tests__/               # 75 Jest/Supertest cases
```

`migrations/schema.sql` is **not** archived — it is the live database schema and
is loaded by hand through the Supabase SQL editor. It stays authoritative for
the running app.
