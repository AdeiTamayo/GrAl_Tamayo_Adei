const path = require('path');

// Load environment variables from parent directory
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const express = require('express');
const fs = require('fs');

// Catch crashes as early as possible, before anything else can throw
process.on('unhandledRejection', (reason) => {
    console.error('[Unhandled Rejection]', reason);
});
process.on('uncaughtException', (err) => {
    console.error('[Uncaught Exception]', err);
});

// Import routes
// const authRoutes = require('./routes/auth');
// const profileRoutes = require('./routes/profile');
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

// CORS middleware
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept, X-Requested-With, ngrok-skip-browser-warning');
    res.header('Access-Control-Allow-Credentials', 'true');
    if (req.method === 'OPTIONS') {
        return res.sendStatus(204);
    }
    next();
});
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
    console.error(err.stack);
    res.status(err.status || 500).json({
        success: false,
        error: err.message || 'Internal server error'
    });
});

app.listen(port, () => {
    console.log(`\n=== Server Ready ===`);
    console.log(`[Server] Running on http://localhost:${port}`);
});