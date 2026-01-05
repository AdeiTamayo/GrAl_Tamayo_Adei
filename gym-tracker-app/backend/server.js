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
const uploadsDir = path.join(__dirname, 'uploads');
const processedDir = path.join(__dirname, 'processed');
console.log(`Uploads directory: ${uploadsDir}`);
console.log(`Processed directory: ${processedDir}`);

if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
    console.log('Created uploads directory');
}
if (!fs.existsSync(processedDir)) {
    fs.mkdirSync(processedDir, { recursive: true });
    console.log('Created processed directory');
}

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        console.log(`[Multer] Saving file to: ${uploadsDir}`);
        cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
        const uniqueName = Date.now() + '-' + file.originalname;
        console.log(`[Multer] Generated filename: ${uniqueName}`);
        cb(null, uniqueName);
    }
});

const upload = multer({ storage: storage });

// Middleware
app.use(cors());
app.use(express.json());

// Serve processed videos statically
app.use('/processed', express.static(processedDir));

// POST endpoint to upload and process video
app.post('/api/videos/upload', upload.single('video'), async (req, res) => {
    console.log('\n=== New Upload Request ===');
    console.log(`[Request] Received at: ${new Date().toISOString()}`);

    try {
        if (!req.file) {
            console.log('[Error] No file in request');
            return res.status(400).json({ error: 'No video file uploaded' });
        }

        console.log(`[Upload] File received: ${req.file.originalname}`);
        console.log(`[Upload] File size: ${(req.file.size / 1024 / 1024).toFixed(2)} MB`);
        console.log(`[Upload] MIME type: ${req.file.mimetype}`);

        const inputPath = req.file.path;
        const outputFilename = 'processed-' + req.file.filename;
        const outputPath = path.join(processedDir, outputFilename);
        const scriptPath = path.join(__dirname, 'python', 'landmarks_video.py');

        console.log(`[Processing] Input path: ${inputPath}`);
        console.log(`[Processing] Output path: ${outputPath}`);
        console.log(`[Processing] Script path: ${scriptPath}`);

        // Check if script exists
        if (!fs.existsSync(scriptPath)) {
            console.error(`[Error] Python script not found at: ${scriptPath}`);
            return res.status(500).json({ error: 'Python script not found' });
        }
        console.log('[Processing] Python script found');

        // Check if input file exists
        if (!fs.existsSync(inputPath)) {
            console.error(`[Error] Input file not found at: ${inputPath}`);
            return res.status(500).json({ error: 'Input file not found' });
        }
        console.log('[Processing] Input file verified');

        console.log('[Processing] Starting Python process...');
        const startTime = Date.now();

        const pythonProcess = spawn('python', [
            scriptPath,
            '--input', inputPath,
            '--output', outputPath
        ]);

        console.log(`[Processing] Python PID: ${pythonProcess.pid}`);

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
                // Verify output file exists
                if (fs.existsSync(outputPath)) {
                    const outputSize = (fs.statSync(outputPath).size / 1024 / 1024).toFixed(2);
                    console.log(`[Success] Output file created: ${outputPath}`);
                    console.log(`[Success] Output file size: ${outputSize} MB`);

                    const responseUrl = `http://localhost:${port}/processed/${outputFilename}`;
                    console.log(`[Success] Response URL: ${responseUrl}`);

                    res.json({
                        message: 'Video processed successfully',
                        processedVideoUrl: responseUrl
                    });
                } else {
                    console.error('[Error] Output file was not created');
                    res.status(500).json({ error: 'Output file was not created' });
                }
            } else {
                console.error(`[Error] Python process failed with code ${code}`);
                res.status(500).json({ error: 'Video processing failed', code });
            }
        });

        pythonProcess.on('error', (err) => {
            console.error('[Error] Failed to start Python process:', err.message);
            console.error('[Error] Stack:', err.stack);
            res.status(500).json({ error: 'Failed to start video processing', details: err.message });
        });

    } catch (error) {
        console.error('[Error] Unexpected error:', error.message);
        console.error('[Error] Stack:', error.stack);
        return res.status(500).json({ error: 'Server error', details: error.message });
    }
});

app.listen(port, () => {
    console.log(`\n=== Server Ready ===`);
    console.log(`Server is running on http://localhost:${port}`);
});
