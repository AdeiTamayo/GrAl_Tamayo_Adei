const path = require('path');
const fs = require('fs').promises;
const { validateUpload, processVideoWithPython } = require('../utils/videoProcessor');
const Video = require('../models/video');

/**
 * Owns every interaction with the Python analysis scripts.
 *
 * The HTTP layer (videoController) only decides which analysis to run and how to
 * stream progress; script paths, output naming, spawning and cleanup all live
 * here, so the Python bridge can change in one place.
 */

const PYTHON_DIR = path.join(__dirname, '..', 'python');
const PROCESSED_DIR = path.join(__dirname, '..', 'media', 'output');
const PORT = process.env.PORT || 8000;

/** Analyses the API exposes, keyed by the name used in the database. */
const ANALYSES = {
    pose_estimation: {
        script: 'landmarks_video.py',
        outputPrefix: 'PoseEstimation-',
        // Scripts accept long-form flags, unlike the barbell script.
        inputFlag: '--input',
        outputFlag: '--output',
        extraArgs: (mode) => ['--mode', mode],
    },
    squat_analysis: {
        script: 'landmarks_video.py',
        outputPrefix: 'SquatAnalysis-',
        inputFlag: '--input',
        outputFlag: '--output',
        extraArgs: (mode) => ['--mode', mode],
    },
    barbell_tracking: {
        script: 'barbell_tracking.py',
        outputPrefix: 'barbell-',
        inputFlag: '-i',
        outputFlag: '-o',
        extraArgs: () => [],
    },
};

const POSE_MODES = ['normal', 'squat'];

/**
 * The database stores squat analysis separately from pose estimation, but both
 * run the same script; the requested mode decides which.
 */
function resolvePoseMode(requestedMode) {
    const mode = String(requestedMode || 'normal').toLowerCase();
    return POSE_MODES.includes(mode) ? mode : 'normal';
}

function analysisFor(type, mode) {
    if (type === 'barbell_tracking') {
        return ANALYSES.barbell_tracking;
    }
    return resolvePoseMode(mode) === 'squat'
        ? ANALYSES.squat_analysis
        : ANALYSES.pose_estimation;
}

/**
 * Check the upload and the target script are usable. Called before the analysis
 * starts so a bad request is reported without spawning Python. The caller
 * decides how to report it (the analysis endpoints stream NDJSON).
 */
function validateAnalysisRequest(file, type, mode) {
    return validateUpload({ file }, path.join(PYTHON_DIR, analysisFor(type, mode).script));
}

async function deleteFileQuietly(filePath) {
    if (!filePath) return;
    try {
        await fs.unlink(filePath);
        console.log(`[Cleanup] Deleted upload: ${filePath}`);
    } catch {
        // The upload may already be gone; nothing to recover from.
    }
}

/**
 * Run one analysis over an uploaded file.
 *
 * @param {object} options
 * @param {string} options.type        One of the ANALYSES keys.
 * @param {object} options.file        Multer file object.
 * @param {string} [options.mode]      Pose mode ('normal' | 'squat').
 * @param {number} [options.userId]    When set, the result is recorded for the user.
 * @param {(message: string) => void} options.onProgress
 * @returns {Promise<string>} URL of the processed video.
 */
async function runAnalysis({ type, file, mode, userId, onProgress }) {
    const analysis = analysisFor(type, mode);
    const inputPath = file.path;
    const outputFilename = analysis.outputPrefix + file.filename;
    const outputPath = path.join(PROCESSED_DIR, outputFilename);

    try {
        await processVideoWithPython(
            path.join(PYTHON_DIR, analysis.script),
            inputPath,
            outputPath,
            analysis.inputFlag,
            analysis.outputFlag,
            analysis.extraArgs(type === 'barbell_tracking' ? null : mode),
            onProgress
        );

        if (userId) {
            await Video.createVideo(userId, file.filename, type, publicUrl(outputFilename));
        }

        return publicUrl(outputFilename);
    } finally {
        // The raw upload is never served; only the processed output is kept.
        await deleteFileQuietly(inputPath);
    }
}

/**
 * Absolute URL of a processed video. `PUBLIC_API_URL` must be set when the API
 * is reachable under another name (a domain, or behind a reverse proxy);
 * otherwise it falls back to the local address used in development.
 */
function publicUrl(outputFilename) {
    const base = process.env.PUBLIC_API_URL || `http://localhost:${PORT}`;
    return `${base.replace(/\/$/, '')}/media/output/${outputFilename}`;
}

module.exports = {
    PROCESSED_DIR,
    resolvePoseMode,
    validateAnalysisRequest,
    runAnalysis,
};
