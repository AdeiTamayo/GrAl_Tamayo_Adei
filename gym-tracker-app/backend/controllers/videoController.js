const path = require('path');
const { validateUpload, processVideoWithPython } = require('../utils/videoProcessor');
const Video = require('../models/video');
const fs = require('fs').promises;

const processedDir = path.join(__dirname, '../media/output');
const port = process.env.PORT || 8000;
const REQUEST_TIMEOUT = 10 * 60 * 1000;

function sendJsonLine(res, data) {
    res.write(JSON.stringify(data) + '\n');
}

async function cleanupUpload(filePath) {
    if (!filePath) return;
    try {
        await fs.unlink(filePath);
        console.log(`[Cleanup] Deleted upload: ${filePath}`);
    } catch {}
}

/**
 * Process video for pose estimation (Normal or Squat specific mode)
 */
exports.processPoseEstimation = async (req, res) => {
    req.setTimeout(REQUEST_TIMEOUT);

    res.writeHead(200, {
        'Content-Type': 'application/x-ndjson',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
    });

    const scriptPath = path.join(__dirname, '../python', 'landmarks_video.py');
    const validation = validateUpload(req, scriptPath);
    if (!validation.valid) {
        sendJsonLine(res, { type: 'error', message: validation.error });
        return res.end();
    }

    const mode = req.body.mode || 'normal';
    const allowedModes = ['normal', 'squat'];
    const selectedMode = allowedModes.includes(mode.toLowerCase()) ? mode.toLowerCase() : 'normal';

    const inputPath = req.file.path;
    const prefix = selectedMode === 'squat' ? 'SquatAnalysis-' : 'PoseEstimation-';
    const outputFilename = prefix + req.file.filename;
    const outputPath = path.join(processedDir, outputFilename);
    const extraArgs = ['--mode', selectedMode];

    try {
        sendJsonLine(res, { type: 'progress', message: 'Starting Python pose estimation...' });

        await processVideoWithPython(scriptPath, inputPath, outputPath, '--input', '--output', extraArgs, (msg) => {
            sendJsonLine(res, { type: 'progress', message: msg });
        });

        const responseUrl = `http://localhost:${port}/media/output/${outputFilename}`;

        if (req.userId) {
            const dbProcessType = selectedMode === 'squat' ? 'squat_analysis' : 'pose_estimation';
            await Video.createVideo(req.userId, req.file.filename, dbProcessType, responseUrl);
        }

        sendJsonLine(res, { type: 'done', processedVideoUrl: responseUrl });
        res.end();

    } catch (error) {
        sendJsonLine(res, { type: 'error', message: error.message });
        res.end();
    } finally {
        await cleanupUpload(inputPath);
    }
};

/**
 * Process video for barbell tracking
 */
exports.processBarbellTracking = async (req, res) => {
    req.setTimeout(REQUEST_TIMEOUT);

    res.writeHead(200, {
        'Content-Type': 'application/x-ndjson',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
    });

    const scriptPath = path.join(__dirname, '../python', 'barbell_tracking.py');
    const validation = validateUpload(req, scriptPath);
    if (!validation.valid) {
        sendJsonLine(res, { type: 'error', message: validation.error });
        return res.end();
    }

    const inputPath = req.file.path;
    const outputFilename = 'barbell-' + req.file.filename;
    const outputPath = path.join(processedDir, outputFilename);

    try {
        sendJsonLine(res, { type: 'progress', message: 'Starting Python barbell tracking...' });

        await processVideoWithPython(scriptPath, inputPath, outputPath, '-i', '-o', [], (msg) => {
            sendJsonLine(res, { type: 'progress', message: msg });
        });

        const responseUrl = `http://localhost:${port}/media/output/${outputFilename}`;

        if (req.userId) {
            await Video.createVideo(req.userId, req.file.filename, 'barbell_tracking', responseUrl);
        }

        sendJsonLine(res, { type: 'done', processedVideoUrl: responseUrl });
        res.end();

    } catch (error) {
        sendJsonLine(res, { type: 'error', message: error.message });
        res.end();
    } finally {
        await cleanupUpload(inputPath);
    }
};

/**
 * Get authenticated user's videos
 */
exports.getUserVideos = async (req, res) => {
    try {
        const directoryPath = path.join(__dirname, '../media/output');

        const files = await fs.readdir(directoryPath);

        const videoExtensions = ['.mp4'];
        const videoFiles = files.filter(file => {
            const ext = path.extname(file).toLowerCase();
            return videoExtensions.includes(ext);
        });

        const videos = await Promise.all(videoFiles.map(async (file) => {
            const filePath = path.join(directoryPath, file);
            const stats = await fs.stat(filePath);

            return {
                id: file,
                process_type: file.includes('pose') ? 'Pose Estimation' : 'Barbell Tracking',
                processed_url: `/media/output/${file}`,
                created_at: stats.birthtime
            };
        }));

        res.json({
            success: true,
            videos: videos
        });

    } catch (error) {
        console.error("Error reading video directory:", error);
        res.status(500).json({
            success: false,
            message: "Failed to retrieve videos"
        });
    }
};
