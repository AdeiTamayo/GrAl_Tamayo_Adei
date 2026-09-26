# Gym Tracker

**A full-stack workout tracking app with computer vision form analysis.**

---

## Screenshots / Pantaila-argazkiak

| Dashboard | Active Workout | Video Analysis |
| :---: | :---: | :---: |
| ![Dashboard](Screenshots/dashboard.png) | ![Active Workout](Screenshots/active-workout.png) | ![Video Analysis](Screenshots/features.png) |
| **Workout History** | **Weight Tracking** | **Exercise Library** |
| ![Workout History](Screenshots/workout-history.png) | ![Weight Tracking](Screenshots/weight-history.png) | ![Exercises](Screenshots/exercises.png) |

---

## Technology Requirements / Teknologia-beharrak

| Category / Kategoria | Technologies / Teknologiak |
|---|---|
| Backend (API) | **Express.js** (Node.js) |
| Frontend | **React**, **TypeScript**, **Tailwind CSS**, **React Router**, **Recharts** |
| Computer Vision / Ikusmen konputazionala | **Python**, **OpenCV**, **MediaPipe**, **NumPy**, **SciPy**, **Roboflow** |
| Database / Datu-basea | **PostgreSQL** |
| Authentication / Autentifikazioa | **JWT**, **bcrypt** |
| File Uploads / Fitxategi kargak | **Multer** |
| HTTP Client / HTTP bezeroa | **Fetch API** |
| Testing | **Jest**, **Supertest**, **React Testing Library** |
| Video Processing / Bideo prozesamendua | **FFmpeg** |
| Version Control / Bertsio-kontrola | **Git**, **GitHub** |

### Prerequisites / Aurretiko beharrak

- **Node.js** 18+ (LTS recommended)
- **PostgreSQL** 15+
- **Python** 3.10 – 3.12
- **FFmpeg**
- **npm** or **yarn**

---

## Description / Deskribapena

**EN** — Gym Tracker analyzes exercise videos using computer vision to evaluate barbell path, velocity, and lifting technique. Users can log their workouts, upload videos, track personal records, set goals, and view visual analytics of their performance. The system uses an Express.js (Node.js) + React + PostgreSQL architecture, with a barbell tracking module implemented in Python using OpenCV and MediaPipe.

**EU** — Aplikazioak ariketen bideoak aztertzen ditu ikusmen konputazionalaren bidez, barraren ibilbidea, abiadura eta teknika ebaluatzeko. Erabiltzaileek beren entrenamenduak gorde, bideoak igo, marka pertsonalak jarraitu, helburuak ezarri eta errendimenduaren analisi bisualak ikus ditzakete. Sistema honek Express.js (Node.js) + React + PostgreSQL arkitektura erabiltzen du, eta barbell tracking modulua Python-ez inplementatzen da OpenCV eta MediaPipe erabiliz.

## Architecture / Arkitektura

```mermaid
flowchart TD
    subgraph Frontend ["Frontend (React + TypeScript)"]
        UI[React UI\nTailwind CSS]
        Router[React Router\n18 routes]
        Charts[Recharts\nGraphs & Analytics]
    end

    subgraph Backend ["Backend (Express.js)"]
        API[REST API\n/api/*]
        Auth[JWT + bcrypt\nAuthentication]
        Upload[Multer\nFile Upload]
        VP[VideoProcessor\nPython Bridge]
    end

    subgraph Database ["PostgreSQL"]
        DB[(Users, Workouts,\nExercises, PRs,\nRoutines, Goals,\nVideos, Settings)]
    end

    subgraph Vision ["Computer Vision (Python)"]
        PT[Pose Estimation\nMediaPipe]
        BT[Barbell Tracking\nYOLO + OpenCV CSRT]
    end

    UI -->|Fetch API| API
    Router --> UI
    Charts --> API
    API --> Auth
    API --> Upload
    API --> VP
    VP -->|spawn| PT
    VP -->|spawn| BT
    API --> DB
    Upload -->|videos| VP
```

---

## Features / Ezaugarriak

| English | Euskera |
|---------|---------|
| **Dashboard** — View total workouts, weekly volume, streaks, and recent activity at a glance | **Panela** — Ikusi entrenamendu kopurua, asteko bolumena, jarraipenak eta azken jarduera begirada batean |
| **Workout Logging** — Create, edit, and track workouts with sets, reps, weight, RPE, and rest timers | **Entrenamenduen erregistroa** — Sortu, editatu eta jarraitu entrenamenduak serie, errepikapen, pisu, RPE eta atseden-denborarekin |
| **Routines** — Build reusable workout templates and schedule them on specific dates | **Errutinak** — Sortu berrerabil daitezkeen entrenamendu txantiloiak eta egutegian kokatu |
| **Personal Records (PRs)** — Track your best lifts per exercise with history | **Marka pertsonalak (PR)** — Jarraitu zure altxaldi onenak ariketa bakoitzeko historian |
| **Goals** — Set target weight and rep goals with deadline tracking | **Helburuak** — Ezarri pisu eta errepikapen helburuak epeekin |
| **Video Analysis** — Upload workout videos for pose estimation and barbell tracking | **Bideo analisia** — Igo entrenamendu bideoak postura kalkulatzeko eta barraren ibilbidea aztertzeko |
| **Pose Estimation** — MediaPipe-based full-body pose tracking with rep counting | **Postura kalkulua** — MediaPipe bidezko gorputz osoaren postura jarraipena errepikapen kontagailuarekin |
| **Barbell Tracking** — Real-time barbell path visualization with velocity curves | **Barraren ibilbidea** — Barraren ibilbidearen bistaratzea denbora errealean abiadura kurbekin |
| **Compare Workouts** — Side-by-side volume and exercise comparison | **Entrenamenduen konparazioa** — Bolumen eta ariketen konparazioa alboko ikuspegian |
| **Exercise History** — Per-exercise progress charts over time | **Ariketa historiala** — Ariketa bakoitzaren aurrerapenaren grafikoak denboran zehar |
| **Weight Tracking** — Log body weight and view trends | **Pisuaren jarraipena** — Gorputz pisua erregistratu eta joerak ikusi |
| **Workout Calendar** — Visual calendar of all your logged sessions | **Entrenamendu egutegia** — Saio guztien egutegi bisuala |
| **Dark / Light Theme** — Toggle between dark and light mode | **Gai iluna / argia** — Aldatu gai ilun eta argiaren artean |
| **Customizable Settings** — Show/hide RPE, 1RM estimates, and rest timers | **Ezarpen pertsonalizagarriak** — Erakutsi/eskutatu RPE, 1RM estimazioak eta atseden-denbora |

---

## Quick Start / Hasiera azkarra

### 1. Clone the repository / Klonatu biltegia

```bash
git clone https://github.com/AdeiTamayo/GrAl_Tamayo_Adei
cd GrAl_Tamayo_Adei/gym-tracker-app
```

### 2. Configure environment / Konfiguratu ingurunea

The backend loads its configuration from a `.env` file in the `gym-tracker-app/` folder
(the parent of `backend/`). Copy the provided template and fill in your own values:

```bash
cd gym-tracker-app
cp .env.example .env
```

```env
PORT=8000
DB_HOST=localhost
DB_PORT=5432
DB_NAME=gym_tracker
DB_USER=postgres
DB_PASSWORD=your_password
JWT_SECRET=your_long_random_secret
```

`JWT_SECRET` is required — the server refuses to start without it, and any missing
variable is reported by name instead of failing later with a cryptic error.

The frontend reads its API base URL from `frontend/.env` when it is not served from
the same origin as the API:

```env
REACT_APP_API_URL=http://localhost:8000
```

### 3. Install & run backend / Instalatu eta exekutatu backend-a

```bash
cd backend
npm install
python -m pip install -r requirements.txt
npm run migrate   # creates the schema; safe to re-run
npm run dev       # or: npm start
```

### 4. Install & run frontend / Instalatu eta exekutatu frontend-a

```bash
cd frontend
npm install
npm start
```

The API runs on `http://localhost:8000` and the frontend on `http://localhost:3000`.

### 5. Run the tests / Exekutatu probak

```bash
cd backend  && npm test    # Jest + Supertest
cd frontend && npm test    # React Testing Library
```

---

## Project Structure / Proiektuaren egitura

```
gym-tracker-app/
├── .env.example        # Copy to .env and fill in
├── backend/
│   ├── __tests__/          # Jest + Supertest suite
│   ├── config/             # env.js (validation) + database.js (pg Pool)
│   ├── controllers/        # HTTP layer: read req, call a model, shape the response
│   ├── middleware/         # auth (JWT), upload (multer), cache invalidation
│   ├── migrations/         # SQL schema, applied in filename order
│   ├── models/             # All SQL lives here, scoped to the owning user
│   ├── python/             # Computer vision scripts (OpenCV / MediaPipe)
│   │   ├── barbell_tracking.py   # YOLO + CSRT barbell tracking
│   │   ├── landmarks_video.py    # MediaPipe pose estimation
│   │   └── pose_landmarker_heavy.task  # ML model
│   ├── routes/             # Express route tables (URL -> middleware -> controller)
│   ├── services/           # videoAnalysisService: the Python bridge
│   ├── utils/              # HTTP helpers, exercise cache, python process runner
│   ├── media/              # uploads/ and output/ (git-ignored)
│   ├── server.js           # Express app entry
│   └── migrate.js          # Migration runner
├── frontend/
│   ├── public/            # Static assets
│   ├── src/
│   │   ├── components/    # Reusable UI + the app's context providers
│   │   ├── contexts/      # Auth context
│   │   ├── pages/         # Page-level components (one per route)
│   │   ├── utils/         # API client & helpers
│   │   ├── App.tsx        # Router & layout
│   │   └── index.tsx      # React entry point
│   ├── types.ts           # TypeScript type definitions
│   └── package.json
└── docs/
    ├── ARCHITECTURE.md    # How a request flows through the system
    ├── INSTALLATION.md    # Detailed setup guide
    └── database-schema.md # ER diagram & table reference
```

**Layering rule:** `routes` → `controllers` → `models` → PostgreSQL. Controllers never
write SQL; models never touch `req`/`res`. Video analysis is the one place that leaves
the Node process, and it is isolated behind `services/videoAnalysisService.js`.

**Ownership rule:** every model method that reads or writes user data takes a `userId`
and filters on it, so one account can never reach another's rows by guessing an id.

---

## Documentation / Dokumentazioa

- **Architecture / Arkitektura:** [docs/ARCHITECTURE.md](gym-tracker-app/docs/ARCHITECTURE.md) — how a request flows through the system
- **Installation Guide / Instalazio gida:** [docs/INSTALLATION.md](gym-tracker-app/docs/INSTALLATION.md)
- **Database Schema / Datu-basearen eskema:** [docs/database-schema.md](gym-tracker-app/docs/database-schema.md)

---

## Author / Egilea

**Adei Tamayo Ugalde**

- University of the Basque Country (UPV/EHU) — Euskal Herriko Unibertsitatea
- Bachelor's Degree in Computer Engineering (Software Engineering)
- Supervisor / Zuzendaria: Naiara Aginako Bengoa
