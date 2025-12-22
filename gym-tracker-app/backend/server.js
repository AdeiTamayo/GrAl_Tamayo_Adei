const express = require('express');
const multer = require('multer');
const path = require('path');
const app = express();
const port = 8000;

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/'); // Save to uploads folder
    },
    filename: (req, file, cb) => {
        const uniqueName = Date.now() + '-' + file.originalname;
        cb(null, uniqueName);
    }
});

const upload = multer({ storage: storage });

// Middleware
app.use(express.json());

// POST endpoint to upload and process video
app.post('/api/videos/upload', upload.single('video'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'ERROR' });
        }

        const videoPath = req.file.path;
        console.log(`Received video: ${videoPath}`);


    } catch (error) {
        return res.status(500).json({ error: 'ERROR', details: error.message });
    }
});



app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});