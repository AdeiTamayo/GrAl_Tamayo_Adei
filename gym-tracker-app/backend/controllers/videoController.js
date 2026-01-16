const path = require('path');
const { validateUpload, processVideoWithPython } = require('../utils/videoProcessor');

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
            return res.status(400).json({ error: validation.error });
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
