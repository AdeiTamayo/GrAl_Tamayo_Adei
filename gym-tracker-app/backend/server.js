const path = require('path');

// Load environment variables from parent directory
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const express = require('express');
const fs = require('fs');
const cors = require('cors');

// Import routes
const authRoutes = require('./routes/auth');
const videoRoutes = require('./routes/videos');

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
app.use('/media/output', express.static(processedDir));

// Mount routes
app.use('/api/auth', authRoutes);
app.use('/api/videos', videoRoutes);

app.listen(port, () => {
    console.log(`\n=== Server Ready ===`);
    console.log(`[Server] Running on http://localhost:${port}`);
});
