const path = require('path');

// Load environment variables from parent directory
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const express = require('express');
const fs = require('fs');
const cors = require('cors');

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

// Middleware
app.use(cors());
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

// 404 fallback handler
app.use((req, res) => {
    res.status(404).json({ success: false, error: `Route ${req.method} ${req.originalUrl} not found` });
});

app.listen(port, () => {
    console.log(`\n=== Server Ready ===`);
    console.log(`[Server] Running on http://localhost:${port}`);
});
