const path = require('path');
const { validateUpload, processVideoWithPython } = require('../utils/videoProcessor');
const Video = require('../models/video');
const fs = require('fs').promises;

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
        const directoryPath = path.join(__dirname, '../media/output');

        const files = await fs.readdir(directoryPath);


        const videoExtensions = ['.mp4'];
        const videoFiles = files.filter(file => {
            const ext = path.extname(file).toLowerCase();
            return videoExtensions.includes(ext);
        });

        const videos = await Promise.all(videoFiles.map(async (file, index) => {
            const filePath = path.join(directoryPath, file);

            const stats = await fs.stat(filePath);

            return {
                id: file,
                process_type: file.includes('pose') ? 'Pose Estimation' : 'Barbell Tracking',
                processed_url: `/media/output/${file}`,
                created_at: stats.birthtime
            };
        }));

        // 5. Send the response
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