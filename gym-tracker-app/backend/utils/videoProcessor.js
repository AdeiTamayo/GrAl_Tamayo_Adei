const { spawn } = require('child_process');
const fs = require('fs');

/**
 * Validates uploaded file and checks if required files exist
 */
function validateUpload(req, scriptPath) {
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
function processVideoWithPython(scriptPath, inputPath, outputPath, inputFlag = '-i', outputFlag = '-o', extraArgs = []) {
    return new Promise((resolve, reject) => {
        console.log('[Processing] Starting Python process...');
        const startTime = Date.now();

        // Combine base arguments with any extra parameters (like --mode squat)
        const args = [
            scriptPath,
            inputFlag, inputPath,
            outputFlag, outputPath,
            ...extraArgs
        ];

        const pythonProcess = spawn('python', args);

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

module.exports = {
    validateUpload,
    processVideoWithPython
};
