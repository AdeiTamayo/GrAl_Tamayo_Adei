const express = require('express');
const multer = require('multer');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');
const cors = require('cors');
const app = express();
const port = 8000;

console.log('=== Server Starting ===');
console.log(`Current directory: ${__dirname}`);

// Ensure directories exist
const uploadsDir = path.join(__dirname, 'media/uploads');
const processedDir = path.join(__dirname, 'media/output');

if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}
if (!fs.existsSync(processedDir)) {
    fs.mkdirSync(processedDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
        const uniqueName = Date.now() + '-' + file.originalname;
        cb(null, uniqueName);
    }
});

const upload = multer({ storage: storage });

// Middleware
app.use(cors());
app.use(express.json());

// Serve processed videos statically
app.use('/media/output', express.static(processedDir));

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Validates uploaded file and checks if required files exist
 */
function validateUpload(req, res, scriptPath) {
    if (!req.file) {
        console.log('[Error] No file in request');
        return { valid: false, error: 'No video file uploaded' };
    }

    if (!fs.existsSync(scriptPath)) {
        return { valid: false, error: 'Python script not found' };
    }

    if (!fs.existsSync(req.file.path)) {
        return { valid: false, error: 'Input file not found' };
    }

    return { valid: true };
}

/**
 * Processes video using Python script
 * Returns a Promise that resolves with the output path or rejects with an error
 */
function processVideoWithPython(scriptPath, inputPath, outputPath, inputFlag = '-i', outputFlag = '-o') {
    return new Promise((resolve, reject) => {
        console.log('[Processing] Starting Python process...');
        const startTime = Date.now();

        const pythonProcess = spawn('python', [
            scriptPath,
            inputFlag, inputPath,
            outputFlag, outputPath
        ]);

        pythonProcess.stdout.on('data', (data) => {
            console.log(`[Python stdout]: ${data.toString().trim()}`);
        });

        pythonProcess.stderr.on('data', (data) => {
            console.error(`[Python stderr]: ${data.toString().trim()}`);
        });

        pythonProcess.on('close', (code) => {
            const duration = ((Date.now() - startTime) / 1000).toFixed(2);
            console.log(`[Processing] Python process exited with code: ${code}`);
            console.log(`[Processing] Duration: ${duration} seconds`);

            if (code === 0) {
                if (fs.existsSync(outputPath)) {
                    console.log(`[Success] Output file created: ${outputPath}`);
                    resolve(outputPath);
                } else {
                    reject(new Error('Output file was not created'));
                }
            } else {
                reject(new Error(`Python process failed with code ${code}`));
            }
        });

        pythonProcess.on('error', (err) => {
            console.error('[Error] Failed to start Python process:', err.message);
            reject(err);
        });
    });
}

// =============================================================================
// POSE ESTIMATION ENDPOINT
// =============================================================================
// POST endpoint to upload and process video for pose estimation
app.post('/api/videos/pose-estimation', upload.single('video'), async (req, res) => {
    try {
        const scriptPath = path.join(__dirname, 'python', 'landmarks_video.py');

        // Validate upload
        const validation = validateUpload(req, res, scriptPath);
        if (!validation.valid) {
            return res.status(400).json({ error: validation.error });
        }

        console.log('[Processing] Python script found');

        const inputPath = req.file.path;
        const outputFilename = 'processed-' + req.file.filename;
        const outputPath = path.join(processedDir, outputFilename);

        // Process video with Python
        await processVideoWithPython(scriptPath, inputPath, outputPath, '--input', '--output');

        // Send response with processed video URL
        const responseUrl = `http://localhost:${port}/media/output/${outputFilename}`;
        console.log(`[Success] Response URL: ${responseUrl}`);

        res.json({
            message: 'Video processed successfully',
            processedVideoUrl: responseUrl
        });

    } catch (error) {
        console.error('[Error] Processing failed:', error.message);
        return res.status(500).json({ error: 'Video processing failed', details: error.message });
    }
});

// =============================================================================
// BARBELL TRACKING ENDPOINT
// =============================================================================
// POST endpoint to upload and process video for barbell tracking
app.post('/api/videos/barbell-tracking', upload.single('video'), async (req, res) => {
    console.log('\n=== New Barbell Tracking Request ===');
    console.log(`[Request] Received at: ${new Date().toISOString()}`);

    try {
        const scriptPath = path.join(__dirname, 'python', 'barbell_tracking.py');

        // Validate upload
        const validation = validateUpload(req, res, scriptPath);
        if (!validation.valid) {
            return res.status(400).json({ error: validation.error });
        }

        console.log('[Barbell Tracking] Python script found');

        const inputPath = req.file.path;
        const outputFilename = 'barbell-' + req.file.filename;
        const outputPath = path.join(processedDir, outputFilename);

        // Process video with Python (barbell tracking uses -i and -o flags)
        await processVideoWithPython(scriptPath, inputPath, outputPath, '--i', '--o');

        // Send response with processed video URL
        const responseUrl = `http://localhost:${port}/media/output/${outputFilename}`;
        console.log(`[Barbell Success] Response URL: ${responseUrl}`);

        res.json({
            message: 'Barbell tracking completed successfully',
            processedVideoUrl: responseUrl
        });

    } catch (error) {
        console.error('[Error] Barbell tracking failed:', error.message);
        return res.status(500).json({ error: 'Barbell tracking failed', details: error.message });
    }
});

// =============================================================================
// LOGIN ENDPOINT
// =============================================================================



// =============================================================================
// REGISTER ENDPOINT
// =============================================================================


app.listen(port, () => {
    console.log(`\n=== Server Ready ===`);
    console.log(`Server is running on http://localhost:${port}`);
});
