const path = require('path');

// Load environment variables from the gym-tracker-app folder (one level up).
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const express = require('express');
const fs = require('fs');
const cors = require('cors');
const { validateEnv } = require('./config/env');

// Catch crashes as early as possible, before anything else can throw
process.on('unhandledRejection', (reason) => {
    console.error('[Unhandled Rejection]', reason);
});
process.on('uncaughtException', (err) => {
    console.error('[Uncaught Exception]', err);
});

// Validate before anything else is loaded: requiring the routes pulls in the
// database module, which needs credentials. Skipped when the app is imported
// (tests) so the suite can run without a real environment.
if (require.main === module) {
    try {
        validateEnv();
    } catch (error) {
        console.error(`[Config] ${error.message}`);
        process.exit(1);
    }
}

// Import routes
const videoRoutes = require('./routes/videos');
const exerciseRoutes = require('./routes/exercises');
const routinesRoutes = require('./routes/routines');
const userRoutes = require('./routes/user');
const workoutRoutes = require('./routes/workouts');
const prRoutes = require('./routes/prs');
const goalRoutes = require('./routes/goals');
const plannedWorkoutRoutes = require('./routes/plannedWorkouts');
const dashboardRoutes = require('./routes/dashboard');

const app = express();
const port = process.env.PORT || 8000;
const isProduction = process.env.NODE_ENV === 'production';

// Ensure directories exist
const uploadsDir = path.join(__dirname, 'media/uploads');
const processedDir = path.join(__dirname, 'media/output');

if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}
if (!fs.existsSync(processedDir)) {
    fs.mkdirSync(processedDir, { recursive: true });
}

// Request logger - so we can see every request that actually reaches Express
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
    next();
});

// CORS middleware.
// The API authenticates with a Bearer token in the Authorization header, not
// with cookies, so credentials are never allowed: that removes the risk of a
// hostile site riding on the user's session. Set CORS_ORIGIN (comma-separated)
// to lock the API down to a known frontend origin.
const allowedOrigins = (process.env.CORS_ORIGIN || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

app.use(cors({
    origin: allowedOrigins.length > 0 ? allowedOrigins : true,
    credentials: false,
}));
app.use(express.json());

// Serve processed videos statically
app.use('/media/output', express.static(path.join(__dirname, 'media/output'), {
    setHeaders: (res, path) => {
        res.set('Accept-Ranges', 'bytes');
    }
}));

// Mount routes
app.use('/api/videos', videoRoutes);
app.use('/api/exercises', exerciseRoutes);
app.use('/api/routines', routinesRoutes);
app.use('/api/user', userRoutes);
app.use('/api/workouts', workoutRoutes);
app.use('/api/prs', prRoutes);
app.use('/api/goals', goalRoutes);
app.use('/api/planned-workouts', plannedWorkoutRoutes);
app.use('/api/dashboard', dashboardRoutes);

// 404 fallback handler
app.use((req, res) => {
    res.status(404).json({ success: false, error: `Route ${req.method} ${req.originalUrl} not found` });
});

// Global error handler
app.use((err, req, res, next) => {
    console.error(`[Error] ${req.method} ${req.originalUrl}:`, err.message);
    if (!isProduction) {
        console.error(err.stack);
    }

    // In production only the status is trusted; the raw message can contain
    // SQL or filesystem details that must not reach the client.
    const status = err.status || 500;
    const error = isProduction && status >= 500
        ? 'Internal server error'
        : (err.message || 'Internal server error');

    res.status(status).json({ success: false, error });
});

if (require.main === module) {
    app.listen(port, () => {
        console.log(`\n=== Server Ready ===`);
        console.log(`[Server] Running on http://localhost:${port}`);
    });
}

module.exports = app;
