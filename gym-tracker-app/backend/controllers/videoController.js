const path = require('path');
const { validateUpload, processVideoWithPython } = require('../utils/videoProcessor');
const Video = require('../models/video');

const processedDir = path.join(__dirname, '../media/output');
const port = process.env.PORT || 8000;

/**
 * Process video for pose estimation
 */
exports.processPoseEstimation = async (req, res) => {
    try {
        const scriptPath = path.join(__dirname, '../python', 'landmarks_video.py');

        // Validate upload
        const validation = validateUpload(req, scriptPath);
        if (!validation.valid) {
            return res.status(404).json({ error: validation.error });
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

        // Persist in database using authenticated user
        if (req.user && req.user.userId) {
            await Video.createVideo(req.user.userId, req.file.filename, 'pose_estimation', responseUrl);
        }

        res.json({
            message: 'Video processed successfully',
            processedVideoUrl: responseUrl
        });

    } catch (error) {
        console.error('[Error] Processing failed:', error.message);
        return res.status(500).json({
            error: 'Video processing failed',
            details: error.message
        });
    }
};

/**
 * Process video for barbell tracking
 */
exports.processBarbellTracking = async (req, res) => {
    console.log('\n=== New Barbell Tracking Request ===');
    console.log(`[Request] Received at: ${new Date().toISOString()}`);

    try {
        const scriptPath = path.join(__dirname, '../python', 'barbell_tracking.py');

        // Validate upload
        const validation = validateUpload(req, scriptPath);
        if (!validation.valid) {
            return res.status(404).json({ error: validation.error });
        }

        console.log('[Barbell Tracking] Python script found');

        const inputPath = req.file.path;
        const outputFilename = 'barbell-' + req.file.filename;
        const outputPath = path.join(processedDir, outputFilename);

        // Process video with Python
        await processVideoWithPython(scriptPath, inputPath, outputPath, '--i', '--o');

        // Send response with processed video URL
        const responseUrl = `http://localhost:${port}/media/output/${outputFilename}`;
        console.log(`[Barbell Success] Response URL: ${responseUrl}`);

        // Persist in database using authenticated user
        if (req.user && req.user.userId) {
            await Video.createVideo(req.user.userId, req.file.filename, 'barbell_tracking', responseUrl);
        }

        res.json({
            message: 'Barbell tracking completed successfully',
            processedVideoUrl: responseUrl
        });

    } catch (error) {
        console.error('[Error] Barbell tracking failed:', error.message);
        return res.status(500).json({
            error: 'Barbell tracking failed',
            details: error.message
        });
    }
};

/**
 * Get authenticated user's videos
 */
exports.getUserVideos = async (req, res) => {
    try {
        if (!req.user || !req.user.userId) {
            return res.status(404).json({ success: false, error: 'Unauthorized' });
        }

        const videos = await Video.getVideosByUserId(req.user.userId);
        res.json({ success: true, videos });
    } catch (error) {
        console.error('[Error] Fetching user videos failed:', error.message);
        res.status(500).json({ success: false, error: 'Failed to fetch videos' });
    }
};
