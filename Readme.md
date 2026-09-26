# Gym Tracker

**A workout tracking web app with in-browser computer vision form analysis.**

React frontend → Supabase (Postgres + Auth + Storage). Pose analysis runs entirely
in the browser with MediaPipe. No application server.

---

## Screenshots / Pantaila-argazkiak

| Dashboard | Active Workout | Video Analysis |
| :---: | :---: | :---: |
| ![Dashboard](Screenshots/dashboard.png) | ![Active Workout](Screenshots/active-workout.png) | ![Video Analysis](Screenshots/features.png) |
| **Workout History** | **Weight Tracking** | **Exercise Library** |
| ![Workout History](Screenshots/workout-history.png) | ![Weight Tracking](Screenshots/weight-history.png) | ![Exercises](Screenshots/exercises.png) |

---

## Description / Deskribapena

**EN** — Gym Tracker logs strength-training sessions, tracks personal records,
goals and body weight, and analyses lift videos to estimate squat depth and
torso angle. The distinguishing feature is that the computer vision runs on the
client: a video is decoded into a `<canvas>`, MediaPipe's Pose Landmarker runs on
the GPU via WebAssembly, and the annotated result is re-encoded with
`MediaRecorder` and uploaded to Supabase Storage. Authorisation is enforced by
Postgres Row Level Security rather than by application code.

**EU** — Gym Tracker aplikazioak indartza-entrenamenduak erregistratzen ditu,
marka pertsonalak, helburuak eta gorputz pisua jarraitzen ditu, eta bideoak
aztertzen ditu squataren sakantzaren eta gorputzaren anguluaren ebaketa egiteko.
Ezaugarri bereizgarria da ikusmen konputazionala aritzeko aldea: bideoa
`canvas`-era deskodifikatzen da, MediaPipearen Pose Landmarker GPUan
exekutatzen da WebAssembly bidez, eta emaitza anotatua `MediaRecorder`-ek
berrezultatzen da. Baimena Postgres-enko Row Level Security-k ezartzen du,
ez aplikazioaren koderan.

---

## Architecture / Arkitektura

```mermaid
flowchart TD
    subgraph Browser ["Browser / Nabigatzailea"]
        UI["React 19 UI<br/>Tailwind + design tokens"]
        Router["React Router 7<br/>17 routes"]
        Charts["Recharts<br/>progress analytics"]
        CV["MediaPipe Pose Landmarker<br/>WASM + GPU delegate"]
        Rec["MediaRecorder<br/>annotated re-encode"]
        State["Contexts<br/>Auth · Settings · Workout · Theme"]
    end

    subgraph Supabase ["Supabase (managed)"]
        Auth["Auth<br/>email + password"]
        PostgREST["PostgREST<br/>auto REST over Postgres"]
        RLS[("Postgres<br/>14 tables · 36 RLS policies")]
        Storage[("Storage<br/>uploads (private)<br/>processed (public)")]
    end

    UI --> Router
    UI --> Charts
    State --> UI
    CV --> Rec
    UI -->|"analyse frame-by-frame"| CV
    Rec -->|"annotated video"| Storage

    UI --> Auth
    UI -->|"supabase.from(...)|" PostgREST
    PostgREST --> RLS
    Auth -->|"auth.uid()"| RLS
    UI --> Storage

    classDef browser fill:#18181b,stroke:#a3e635,color:#f4f4f5
    classDef supa fill:#0c2a2a,stroke:#22d3ee,color:#f4f4f5
    class UI,Router,Charts,CV,Rec,State browser
    class Auth,PostgREST,RLS,Storage supa
```

**There is no application server in this architecture.** The browser holds the
Supabase publishable key and issues queries directly; every row is filtered by
RLS policies keyed on `auth.uid()`. An earlier Express + PostgreSQL + JWT
backend exists in [`legacy/`](legacy/README.md) and is documented for
provenance, but nothing in `gym-tracker-app/` imports it.

---

## Features / Ezaugarriak

| English | Euskera |
|---------|---------|
| **Dashboard** — total workouts, weekly volume, streaks, recent activity | **Panela** — entrenamendu kopurua, asteko bolumena, jarraipenak, azken jarduera |
| **Workout Logging** — live set logging with rest timer, RPE and e1RM estimates | **Entrenamenduen erregistroa** — serieak atseden-denborarekin, RPE eta 1RM estimazioekin |
| **Routines** — reusable templates, launchable straight into a live session | **Errutinak** — berrerabil daitezkeen txantiloiak, zuzenean saio bati |
| **Personal Records** — best lift per exercise with a weight/rep history chart | **Marka pertsonalak** — ariketa bakoitzeko onen altxadua, grafikoarekin |
| **Goals** — target weight and reps, with progress against your current PR | **Helburuak** — pisu eta errepikapen helburuak, uneko markarekin alderatuta |
| **Video Analysis** — upload a set and get an annotated video back | **Bideo analisia** — igo una seriea eta jaso bideo anotatua |
| **Squat Analysis** — auto rep count, knee- and hip-angle readouts, depth verdict | **Squat analisa** — errepikapen-kontagailu automatikoa, belarri eta hiparen anguluak |
| **Pose Estimation** — full-body skeleton overlay | **Postura kalkulua** — gorputz osoaren eskeletoa |
| **Barbell Path** — accumulated bar trajectory drawn over the clip | **Barraren ibilbidea** — barraren ibilbidea kliparen gainean |
| **Exercise Library** — 800+ seeded exercises, searchable and filterable | **Ariketa liburutegia** — 800+ ariketa, bilatu eta iragazteko |
| **Workout Comparison** — side-by-side set-by-set diff of two sessions | **Entrenamenduen konparazioa** — bi saioren alderaketa seriez serie |
| **Calendar** — completed and planned sessions, per-day detail | **Egutegia** — egindako eta planifikatutako saioak |
| **Body Weight Tracking** — log entries with a trend chart | **Pisuaren jarraipena** — pisu-sarrerak eta joerako grafikoa |
| **Dark / Light Theme** — semantic design tokens, one class toggles it | **Gai iluna / argia** — semantikoak diren tokenak |
| **Customisable Settings** — show/hide RPE, e1RM, goals, rest timers | **Ezarpen pertsonalizagarriak** — RPE, 1RM, helburuak eta atseden-denborrak |

---

## Technology / Teknologia

| Layer | Choice |
|---|---|
| UI | React 19, TypeScript, Tailwind CSS 3.4 |
| Routing | React Router 7 — 17 routes, 14 behind an auth guard |
| Charts | Recharts 3 |
| Build | Create React App 5 (`react-scripts`) |
| Backend / Database | **Supabase** — Postgres, Auth, Storage, RLS |
| Computer Vision | MediaPipe Tasks Vision (Pose Landmarker, WASM + GPU delegate) |
| Video encoding | Browser `MediaRecorder` + `canvas.captureStream()` |
| Testing | Jest, Supertest (legacy), React Testing Library |
| CI / CD | GitHub Actions, Netlify |
| Version control | Git, GitHub |

### Why there is no backend server

Supabase provides Postgres, authentication and object storage, and PostgREST
exposes the database as a REST API that `@supabase/supabase-js` queries
directly. Once video analysis moved into the browser, a custom API server would
only have proxied queries and validated input — work RLS already does, with
authorisation enforced in the database instead of in request handlers that can
forget a `WHERE user_id = ?` clause. The full reasoning, including the
trade-offs that were accepted, is in [`docs/DECISIONS.md`](docs/DECISIONS.md).

---

## Quick Start / Hasiera azkarra

### Prerequisites / Aurretiko beharrak

- **Node.js 18+** (developed on 24)
- A **Supabase** project
- npm

### 1. Clone / Klonatu

```bash
git clone https://github.com/AdeiTamayo/GrAl_Tamayo_Adei
cd GrAl_Tamayo_Adei
```

### 2. Apply the database schema / Aplikatu eskema

Open your Supabase project → **SQL Editor** and run the contents of
[`legacy/backend/migrations/schema.sql`](legacy/backend/migrations/schema.sql).

Despite living under `legacy/`, this file is authoritative: it is the live
schema, and it creates all 14 tables, the `current_user_id()` helper, 36 RLS
policies and both storage buckets. It is written to be re-runnable — enums are
guarded with `EXCEPTION WHEN duplicate_object`, tables use `IF NOT EXISTS`, and
policies are dropped before being recreated.

```bash
# verify connectivity (optional, needs legacy/.env)
cd legacy/backend && npm install && npm run db:check
```

### 3. Configure the frontend / Konfiguratu frontend-a

```bash
cd gym-tracker-app/frontend
cp .env.example .env
```

```env
REACT_APP_SUPABASE_URL=https://your-project-ref.supabase.co
REACT_APP_SUPABASE_ANON_KEY=your-publishable-anon-key
```

Use the **anon / publishable** key, never the service-role key. The frontend
cannot enforce anything the service-role key can bypass.

### 4. Seed the exercise catalogue (optional) / hautzeko ariketak

```bash
cd legacy/backend
cp .env.example .env      # add SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, RAPIDAPI_KEY
npm install
npm run seed
```

### 5. Run / Exekutatu

```bash
cd gym-tracker-app/frontend
npm install
npm start
```

Open <http://localhost:3000> and register an account.

---

## Project Structure / Proiektuaren egitura

```
GrAl_Tamayo_Adei/
├── Readme.md
├── Screenshots/
├── docs/
│   ├── ARCHITECTURE.md        # how the system fits together
│   ├── DECISIONS.md           # why each major decision was made
│   ├── INSTALLATION.md        # detailed setup
│   ├── PRESENTATION.md        # deck outline, demo script, Q&A prep
│   └── database-schema.md     # ER diagram and table reference
├── legacy/                    # ARCHIVED — superseded Express backend
│   ├── README.md
│   └── backend/               # 56-endpoint API + Python CV pipeline
└── gym-tracker-app/
    └── frontend/
        ├── public/
        └── src/
            ├── components/    # 31 components
            │   ├── UI primitives (Button, Modal, Select, Calendar, …)
            │   ├── ThemeContext.tsx / SettingsContext.tsx / WorkoutContext.tsx
            │   └── __tests__/
            ├── contexts/      # AuthContext.tsx
            ├── data/          # 10 Supabase data modules + types.ts
            ├── pages/         # 17 pages
            ├── utils/         # supabaseClient, videoAnalysis (MediaPipe), helpers
            ├── App.tsx        # routes
            └── index.tsx      # provider composition
```

---

## Computer Vision / Ikusmen konputazionala

`src/utils/videoAnalysis.ts` is the core of the analysis feature.

1. The file is decoded into an off-DOM `<video>` and drawn to a `<canvas>`
   capped at 960×720 to bound per-frame cost.
2. The **lite float16 Pose Landmarker** is loaded once and memoised in a
   module-level promise, with `delegate: 'GPU'` and `runningMode: 'VIDEO'`.
3. Frames are driven by `requestVideoFrameCallback` so inference is tied to
   actually-decoded frames rather than a blind timer. Every second frame is
   inferred, halving GPU cost.
4. Landmarks are drawn with MediaPipe's `DrawingUtils`; `captureStream(30)` +
   `MediaRecorder` re-encode the annotated canvas in real time.
5. The blob is uploaded to the `processed` bucket, verified with a
   `Range: bytes=0-0` probe, and linked from the `videos` row.

Three analysis modes share that pipeline and differ only in the overlay:

| Mode | Overlay | Derived measurement |
|---|---|---|
| `pose` | 12-bone skeleton, cyan bones / amber joints | — |
| `squat` | skeleton + per-knee angle labels | knee and hip angles via a 3-point law-of-cosines helper; rep count from a hysteresis state machine (down below 110°, up above 155°) |
| `barbell` | accumulated trajectory polyline | bar path length and vertical drop in pixels |

### Known limitations

Stated deliberately — these are the limits of the current approach, not
oversights:

- **Barbell tracking is a shoulder-midpoint proxy**, not object detection. The
  "bar" is estimated as the midpoint of landmarks 11 and 12, so it is a 2D
  screen-space approximation and will not follow a real bar loaded with plates.
  A detector (the archived Python pipeline used Roboflow YOLO + OpenCV CSRT)
  would be the next step.
- **No temporal smoothing.** Joint positions and the bar path are raw
  per-frame values, so the trail visibly jitters.
- **Frame skipping** means rep counting runs at roughly half the frame rate, so
  very fast repetitions can be missed.
- **The thresholds are hand-tuned constants** (110°, 155°, 90°, 60°), not
  learned from data. They are not calibrated against a labelled dataset.
- **Overlays are burned in at the downscaled resolution**, so they are not
  resolution-independent.
- **Model and WASM are fetched from Google and jsDelivr CDNs** at runtime, so
  the feature needs network access to both.

---

## Testing / Testak

```bash
cd gym-tracker-app/frontend
npm run typecheck     # tsc --noEmit
npm test              # 38 tests
npm run build         # production build, runs ESLint

cd ../../../legacy/backend
npm test              # 75 tests
```

GitHub Actions runs all four on every push and pull request.

**Coverage is the honest weak point of this project.** The frontend has 38 tests:
the `Button` component, time/date formatting, the dashboard streak rule, and —
most valuably — the extracted coaching maths in `utils/biomechanics.ts` (joint
angles, the hysteresis rep counter, squat feedback, Epley e1RM). Pages, contexts,
data modules and `ProtectedRoute` are still untested. The 75 legacy tests are
meaningful but, as [`legacy/README.md`](legacy/README.md) explains, they mock
the data layer and so do not prove the production path worked.

---

## Documentation / Dokumentazioa

| Document | Contents |
|---|---|
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | Request flows, data model, security model |
| [`docs/DECISIONS.md`](docs/DECISIONS.md) | Every major decision, its alternatives, and its cost |
| [`docs/INSTALLATION.md`](docs/INSTALLATION.md) | Detailed setup and troubleshooting |
| [`docs/database-schema.md`](docs/database-schema.md) | ER diagram and table reference |
| [`docs/PRESENTATION.md`](docs/PRESENTATION.md) | Deck outline, live-demo script, likely questions |
| [`legacy/README.md`](legacy/README.md) | The archived backend and why it was retired |

---

## Author / Egilea

**Adei Tamayo Ugalde**

- University of the Basque Country (UPV/EHU) — Euskal Herriko Unibertsitatea
- Bachelor's Degree in Computer Engineering (Software Engineering)
- Supervisor / Zuzendaria: Naiara Aginako Bengoa
