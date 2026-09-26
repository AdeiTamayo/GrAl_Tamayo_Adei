const path = require('path');
const fs = require('fs').promises;
const {
    PROCESSED_DIR,
    resolvePoseMode,
    validateAnalysisRequest,
    runAnalysis,
} = require('../services/videoAnalysisService');

// Video analysis shells out to Python and decodes a whole clip, which can take
// minutes. Keep the socket open longer than the 2 minute Express default.
const REQUEST_TIMEOUT = 10 * 60 * 1000;

function sendJsonLine(res, data) {
    res.write(JSON.stringify(data) + '\n');
}

/**
 * Shared body for both analysis endpoints: stream NDJSON progress, run the
 * analysis, then hand back the URL of the processed video.
 */
async function streamAnalysis(req, res, type, startMessage) {
    req.setTimeout(REQUEST_TIMEOUT);

    const mode = type === 'barbell_tracking' ? null : resolvePoseMode(req.body.mode);
    const validation = validateAnalysisRequest(req.file, type, mode);

    res.writeHead(200, {
        'Content-Type': 'application/x-ndjson',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
    });

    if (!validation.valid) {
        sendJsonLine(res, { type: 'error', message: validation.error });
        return res.end();
    }

    try {
        sendJsonLine(res, { type: 'progress', message: startMessage });

        const processedVideoUrl = await runAnalysis({
            type,
            file: req.file,
            mode,
            userId: req.userId,
            onProgress: (message) => sendJsonLine(res, { type: 'progress', message }),
        });

        sendJsonLine(res, { type: 'done', processedVideoUrl });
        res.end();
    } catch (error) {
        sendJsonLine(res, { type: 'error', message: error.message });
        res.end();
    }
}

/**
 * Pose estimation, in either the general or the squat-specific mode.
 */
exports.processPoseEstimation = (req, res) => streamAnalysis(
    req,
    res,
    resolvePoseMode(req.body.mode) === 'squat' ? 'squat_analysis' : 'pose_estimation',
    'Starting Python pose estimation...'
);

/**
 * Barbell path tracking.
 */
exports.processBarbellTracking = (req, res) => streamAnalysis(
    req,
    res,
    'barbell_tracking',
    'Starting Python barbell tracking...'
);

const VIDEO_EXTENSIONS = ['.mp4'];

// Query-string value -> the label stored on each video record.
const TYPE_LABELS = {
    pose_estimation: 'Pose Estimation',
    squat_analysis: 'Squat Analysis',
    barbell_tracking: 'Barbell Tracking',
};

/**
 * Recover the analysis type from the generated filename. The output filename is
 * the only record of the analysis on disk, so the prefixes must stay in sync
 * with services/videoAnalysisService.
 */
function processTypeFromFilename(filename) {
    const lower = filename.toLowerCase();
    if (lower.includes('squatanalysis')) return 'Squat Analysis';
    if (lower.includes('poseestimation')) return 'Pose Estimation';
    return 'Barbell Tracking';
}

/**
 * List the processed videos available to the authenticated user.
 *
 * The processed output directory is a shared flat folder, so this lists what has
 * been produced rather than querying per-user records.
 */
exports.getUserVideos = async (req, res) => {
    try {
        const files = await fs.readdir(PROCESSED_DIR);
        const videoFiles = files.filter((file) => VIDEO_EXTENSIONS.includes(path.extname(file).toLowerCase()));

        const videos = await Promise.all(videoFiles.map(async (file) => {
            const stats = await fs.stat(path.join(PROCESSED_DIR, file));
            return {
                id: file,
                process_type: processTypeFromFilename(file),
                processed_url: `/media/output/${file}`,
                created_at: stats.birthtime
            };
        }));

        const { type, date, sort } = req.query;

        let filtered = videos;
        if (type) {
            const target = TYPE_LABELS[type];
            if (target) {
                filtered = filtered.filter((video) => video.process_type === target);
            }
        }
        if (date) {
            filtered = filtered.filter(
                (video) => new Date(video.created_at).toISOString().slice(0, 10) === date
            );
        }

        filtered.sort((a, b) => {
            const delta = new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
            return sort === 'asc' ? -delta : delta;
        });

        return res.json({ success: true, videos: filtered });
    } catch (error) {
        console.error('[Videos] Error reading processed video directory:', error);
        return res.status(500).json({ success: false, message: 'Failed to retrieve videos' });
    }
};
