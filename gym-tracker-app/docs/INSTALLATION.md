# Installation Guide

This project is split into two parts:

- `backend/`: Node.js + Express API, PostgreSQL access, and Python video processing scripts.
- `frontend/`: React application served separately in development.

The guide below is written for Windows, but the same overall flow works on macOS and Linux.

## 1. Prerequisites

Install these tools before running the app:

- Node.js LTS
- PostgreSQL
- Python 3.10 or newer
- FFmpeg
- Git

Recommended versions:

- Node.js 18 or 20 LTS
- PostgreSQL 15 or newer
- Python 3.10, 3.11, or 3.12

## 2. Install Node.js

1. Download Node.js from https://nodejs.org/.
2. Install the LTS version.
3. Verify the installation:

```bash
node -v
npm -v
```

## 3. Install PostgreSQL

1. Download PostgreSQL from https://www.postgresql.org/download/.
2. Install it with the default tools, including `psql` if available.
3. Create a database for the app, for example `gym_tracker`.
4. Create a database user and password, or reuse your local PostgreSQL credentials.
5. Verify the server is running:

```bash
psql --version
```

If you use pgAdmin, you can create the database there instead of using the terminal.

## 4. Install Python

The backend video pipeline runs Python scripts from `backend/python/`.

1. Install Python from https://www.python.org/downloads/.
2. During installation on Windows, enable the option that adds Python to PATH.
3. Verify the installation:

```bash
python --version
```

If your system uses the `py` launcher, `py --version` is also fine.

## 5. Install FFmpeg

The project uses FFmpeg to transcode generated video output.

This repository already includes a Windows FFmpeg binary at:

- `backend/tools/ffmpeg/bin/ffmpeg.exe`

So on Windows you usually do not need a global FFmpeg install for the project to run.

If you want to install FFmpeg system-wide:

1. Download a Windows build from https://ffmpeg.org/download.html.
2. Unzip it somewhere convenient, for example `C:\ffmpeg`.
3. Add `C:\ffmpeg\bin` to your PATH.
4. Verify it works:

```bash
ffmpeg -version
```

## 6. Configure the environment

The backend loads environment variables from the root `.env` file:

- `backend/server.js` reads `../.env`

Create a `.env` file at the repository root if it does not already exist.

Example configuration:

```env
PORT=8000
DB_HOST=localhost
DB_PORT=5432
DB_NAME=gym_tracker
DB_USER=postgres
DB_PASSWORD=your_password_here
JWT_SECRET=replace_with_a_long_random_secret
```

Notes:

- `PORT` defaults to `8000` if it is not set.
- The frontend development server runs on `3000`.
- The backend expects PostgreSQL credentials in `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, and `DB_PASSWORD`.
- `JWT_SECRET` is required for authentication features.

## 7. Install the backend

From the repository root:

```bash
cd backend
npm install
```

Then install the Python dependencies used by the video scripts:

```bash
python -m pip install -r requirements.txt
```

If your system requires it, use `py -m pip install -r requirements.txt` instead.

### Backend dependencies used by the project

- `express` for the API
- `pg` for PostgreSQL access
- `multer` for file uploads
- `jsonwebtoken` and `bcrypt` for auth
- `opencv-contrib-python`, `numpy`, `scipy`, and `mediapipe` for video analysis

## 8. Install the frontend

From the repository root:

```bash
cd frontend
npm install
```

The frontend is a Create React App project and starts on port `3000` by default.

## 9. Create the database schema

The backend includes SQL migrations in `backend/migrations/`.

Apply them to your PostgreSQL database in order:

1. `001_create_users_table.sql`
2. `002_create_videos_table.sql`
3. `003_create_exercise_table.sql`
4. `004_create_pr_table.sql`
5. `005_create_workouts_table.sql`
6. `006_create_sets_table.sql`
7. `007_create_routines_table.sql`
8. `008_create_goals_table.sql`

You can apply them with `psql` or through a SQL client like pgAdmin.

Example using `psql`:

```bash
psql -h localhost -U postgres -d gym_tracker -f backend/migrations/001_create_users_table.sql
```

Repeat for the remaining migration files.

## 10. Start the application

Open two terminal windows.

### Terminal 1: Backend

```bash
cd backend
npm start
```

The API should be available at:

- http://localhost:8000

### Terminal 2: Frontend

```bash
cd frontend
npm start
```

The web app should open at:

- http://localhost:3000

## 11. Verify everything works

Check these points after starting both services:

- The backend prints `Running on http://localhost:8000`.
- The frontend opens in the browser on `http://localhost:3000`.
- The PostgreSQL connection succeeds without errors.
- Video upload and processing works without FFmpeg or Python path errors.

## 12. Common problems

### PostgreSQL connection fails

- Confirm the `.env` values are correct.
- Confirm PostgreSQL is running.
- Confirm the database exists and the user has permission to access it.

### Python scripts fail to start

- Verify Python is installed and available in PATH.
- Reinstall the Python dependencies from `backend/requirements.txt`.
- Make sure `python` or `py` points to the expected interpreter.

### FFmpeg is not found

- If you rely on the bundled binary, confirm `backend/tools/ffmpeg/bin/ffmpeg.exe` exists.
- If you installed FFmpeg separately, confirm `ffmpeg -version` works in a new terminal.

### Frontend cannot reach the backend

- The frontend expects the API at `http://localhost:8000`.
- Check the `proxy` setting in `frontend/package.json`.

## 13. Optional development notes

- Backend API routes are mounted under `/api`.
- Processed videos are served from `/media/output`.
- Uploaded files are stored under `backend/media/uploads`.