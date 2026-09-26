# Architecture / Arkitektura

This document explains how a request travels through Gym Tracker, so the project can
be presented or debugged without reading every file.

---

## 1. The three processes

Gym Tracker is three cooperating parts:

| Part | Tech | Lives in | Responsibility |
|---|---|---|---|
| **Frontend** | React + TypeScript | `frontend/` | Screens, routing, local UI state. Talks to the API over HTTP only. |
| **Backend** | Express (Node) | `backend/` | REST API, authentication, all SQL, orchestration. |
| **Vision** | Python | `backend/python/` | Pose estimation and barbell tracking, run as a child process. |

```
┌──────────────┐   fetch + Bearer JWT   ┌──────────────┐   child process   ┌─────────────┐
│   Browser    │ ────────────────────► │    Express   │ ─────────────────► │   Python    │
│  (React SPA) │ ◄──── JSON / NDJSON ─ │  REST API    │ ◄───── stdout ──── │ OpenCV /    │
└──────────────┘                       └──────┬───────┘                    │ MediaPipe   │
                                              │ SQL                        └─────────────┘
                                              ▼
                                       ┌─────────────┐
                                       │  PostgreSQL │
                                       └─────────────┘
```

The vision part is *not* a service. It is a short-lived Python process that the backend
spawns per request, streams progress from, and then discards. That keeps deployment to
two long-running processes.

---

## 2. Backend layering

Every HTTP request travels the same four layers. Each one has a single job.

```
request
   │
   ▼
routes/          Which URLs exist, and which middleware guards them
   │             e.g. router.put('/sets/:setId', authMiddleware, controller.updateSet)
   ▼
middleware/      Cross-cutting checks that run before the handler
   │             auth.js verifies the JWT and that the account still exists
   ▼
controllers/     HTTP concerns only
   │             read req.params / req.query / req.body, call a model,
   │             shape the response with utils/httpResponses.js
   ▼
models/          Data concerns only — every SQL statement in the project
   │             all statements are parameterised, and user-scoped
   ▼
PostgreSQL
```

**Why it matters:** a controller can be understood without knowing SQL, and a model can
be understood without knowing HTTP. When adding a feature you almost always add one file
in `routes/`, one handler in `controllers/`, and one query in `models/`.

### The two rules that keep it honest

1. **No SQL in controllers.** When a controller needed to update a set it used to open
   `require('../config/database')` inline; that has been moved into `models/workout.js`.
2. **No `req`/`res` in models.** Models take plain values and return plain rows.

---

## 3. Authentication

```
POST /api/user/login
   → bcrypt.compare(password, users.password)
   → jwt.sign({ userId, email }, JWT_SECRET, { expiresIn: '7d' })
   → client stores the token and sends it as `Authorization: Bearer <token>`
```

Every protected route then runs `middleware/auth.js`, which:

1. reads the Bearer token,
2. verifies its signature (`JWT_SECRET`) and expiry,
3. **re-checks that the user still exists** — cached for 60 s, so a deleted account
   loses access almost immediately instead of holding a valid token for 7 days,
4. puts `req.userId` / `req.userEmail` on the request.

If the account lookup itself fails the middleware **fails closed** (500) rather than
letting the request through.

### Ownership is enforced in the models

A valid token only proves *who* you are. Every model method that touches user data also
takes `userId` and filters on it:

```js
// models/workout.js — the id alone is not enough
static async updateWorkout(id, userId, name, date, note) {
    const query = `UPDATE workouts SET name = $1, date = $2, note = $3
                   WHERE id = $4 AND user_id = $5 RETURNING *;`;
```

A request for someone else's row therefore matches zero rows and the controller answers
`404`, not `403` — the API does not confirm that the other record exists.

---

## 4. Data flow: logging a set

The most representative path in the app, since it touches auth, three tables, the PR
check and a cache:

```
POST /api/workouts/exercises/:workoutExerciseId/sets   { weight, reps, rpe }
  │
  ├─ authMiddleware            verify JWT, confirm account exists
  │
  ├─ workoutController.addSet
  │    ├─ Workout.insertSet(workoutExerciseId, req.userId, …)
  │    │     1. ownership check: is this workout exercise the caller's?
  │    │     2. next set_number = MAX(set_number) + 1
  │    │     3. INSERT INTO sets …
  │    │
  │    └─ PR.checkAndLogPR(req.userId, exerciseId, weight, reps, …)
  │          compares against the user's best for that exercise and inserts only
  │          if it beats it. Failures here are logged and ignored: a broken PR
  │          check must never stop someone logging their workout.
  │
  └─ 201 { success: true, data: <set>, isPr: true|false }
```

The frontend shows a "new PR" badge from `isPr`.

---

## 5. Data flow: video analysis

This is the only path that leaves Node, and it is the reason
`services/videoAnalysisService.js` exists.

```
POST /api/videos/pose-estimation        multipart/form-data, field "video"
  │
  ├─ authMiddleware
  ├─ upload.single('video')             multer writes media/uploads/<timestamp>-<name>
  │                                     and rejects anything that is not a video
  │
  ├─ videoAnalysisService.runAnalysis
  │    ├─ validate: file present, Python script present on disk
  │    ├─ utils/videoProcessor.processVideoWithPython
  │    │     spawns `python -u landmarks_video.py --input … --output … --mode normal`
  │    │     and forwards each stdout line to the client
  │    ├─ Video.createVideo(userId, …)  records the result
  │    └─ finally: delete the raw upload   ← always, success or failure
  │
  └─ 200 application/x-ndjson
       {"type":"progress","message":"…"}   (repeated)
       {"type":"done","processedVideoUrl":"http://localhost:8000/media/output/…"}
```

The response is **NDJSON** (one JSON object per line) rather than plain JSON so progress
can be streamed while Python is still working. The raw upload is always deleted; only the
annotated output in `media/output/` is kept and served statically.

Output filenames carry the analysis type, which is how `GET /api/videos` lists them
without a database round trip:

| Filename pattern | Reported as |
|---|---|
| `PoseEstimation-…mp4` | Pose Estimation |
| `SquatAnalysis-…mp4` | Squat Analysis |
| `barbell-…mp4` | Barbell Tracking |

---

## 6. Frontend structure

```
index.tsx        Provider stack: ErrorBoundary → Theme → Notifications →
                 Settings → Workout → Auth → BrowserRouter
App.tsx          Route table; protected pages are wrapped in <ProtectedRoute>
contexts/        AuthContext — token in localStorage, exposes isAuthenticated
components/      Shared UI (Button, Modal, Calendar…) and the other context providers
pages/           One component per route
utils/api.ts     apiUrl() + apiFetch(), which attaches the Bearer token
```

`apiFetch` is the only place that reads the token, so no component builds auth headers by
hand. State that must survive navigation (the in-progress workout, theme, display
settings) lives in a provider; everything else is fetched per page.

---

## 7. Configuration and schema

- `config/env.js` declares the required variables, validates them once at boot, and
  exposes `requireVar()` so a missing value fails with a named error instead of
  reaching the database driver. It is *not* run on import, which keeps the app testable
  without a real environment.
- `migrate.js` applies `migrations/*.sql` in filename order and records what it has run
  in a `schema_migrations` table, so `npm run migrate` is safe to re-run. This matters
  because some migrations are deliberately not idempotent (`CREATE TYPE`,
  `ALTER COLUMN TYPE`).

---

## 8. Testing strategy

| Layer | How it is tested |
|---|---|
| Routes + controllers | Supertest against the real Express app, with the pg Pool and the auth middleware mocked. |
| Models | Exercised through those HTTP tests, so a query change shows up as an API change. |
| Pure logic | Directly unit tested (`calculateStreak`, `startOfIsoWeek`, `getPendingMigrations`, env validation). |
| Video pipeline | End-to-end through HTTP with only the Python process stubbed — multer, the service, the database write and the NDJSON stream are all real. |
| Frontend | React Testing Library for shared components. |

The guiding rule: mock at the boundary you do not own (the database, the Python process),
never at the boundary you are trying to verify.
