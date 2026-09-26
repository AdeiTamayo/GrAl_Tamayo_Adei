const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

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

// ---------------------------------------------------------------------------
// Python command resolution (runs once, result cached)
// On Windows, 'python' may resolve to a Microsoft Store App Execution Alias
// stub (~1KB) that hangs when spawned headlessly. We detect and skip it.
// ---------------------------------------------------------------------------
function getPythonCommands() {
    if (process.env.PYTHON_PATH) return [process.env.PYTHON_PATH];
    if (process.platform === 'win32') return ['py', 'python', 'python3'];
    return ['python3', 'python', 'py'];
}

const PYTHON_COMMANDS = getPythonCommands();

/**
 * Check if an executable is likely a Windows Store stub by reading its size.
 * Store stubs are ~1KB; real Python interpreters are >1MB.
 */
function isStoreStub(exePath) {
    if (!exePath || process.platform !== 'win32') return false;
    try {
        const stat = fs.statSync(exePath);
        return stat.size > 0 && stat.size < 10000; // <10KB = stub
    } catch {
        return false;
    }
}

function detectPython() {
    function tryCmd(cmd) {
        return new Promise((resolve, reject) => {
            const child = spawn(cmd, ['--version'], {
                windowsHide: true,
                stdio: 'ignore',
            });
            let settled = false;

            // After spawn, check if the resolved executable is a Store stub
            child.on('spawn', () => {
                const exe = child.spawnfile;
                if (isStoreStub(exe)) {
                    settled = true;
                    child.kill();
                    console.log(`[Python] '${cmd}' resolved to Store stub: ${exe} — skipping`);
                    return reject(new Error('Store stub'));
                }
            });

            const t = setTimeout(() => {
                if (!settled) {
                    settled = true;
                    child.kill();
                    reject(new Error('timeout'));
                }
            }, 3000);

            child.on('error', (err) => {
                if (!settled) { settled = true; clearTimeout(t); reject(err); }
            });

            child.on('exit', (code) => {
                if (!settled) {
                    settled = true;
                    clearTimeout(t);
                    if (code === 0) resolve(cmd);
                    else reject(new Error(`exit code ${code}`));
                }
            });
        });
    }

    async function attempt(index) {
        if (index >= PYTHON_COMMANDS.length) {
            throw new Error(
                `Could not find Python. Tried: ${PYTHON_COMMANDS.join(', ')}. ` +
                `Set PYTHON_PATH env var to the full path of your Python executable.`
            );
        }
        try {
            const cmd = await tryCmd(PYTHON_COMMANDS[index]);
            console.log(`[Python] Using: '${cmd}'`);
            return cmd;
        } catch (err) {
            console.log(`[Python] '${PYTHON_COMMANDS[index]}' unavailable: ${err.message}`);
            return attempt(index + 1);
        }
    }

    return attempt(0);
}

let _pythonCmd = null;
let _pending = null;

function getPython() {
    if (_pythonCmd) return Promise.resolve(_pythonCmd);
    if (_pending) return _pending;
    _pending = detectPython().then((cmd) => {
        _pythonCmd = cmd;
        _pending = null;
        return cmd;
    }).catch((err) => {
        _pending = null;
        throw err;
    });
    return _pending;
}

// ---------------------------------------------------------------------------
// Video processing
// ---------------------------------------------------------------------------
function processVideoWithPython(scriptPath, inputPath, outputPath, inputFlag = '-i', outputFlag = '-o', extraArgs = [], onProgress) {
    return new Promise((resolve, reject) => {
        console.log('[Processing] Starting Python process...');
        const startTime = Date.now();

        const args = [
            '-u',
            scriptPath,
            inputFlag, inputPath,
            outputFlag, outputPath,
            ...extraArgs
        ];

        getPython().then((cmd) => {
            console.log(`[Processing] Spawning '${cmd}'...`);
            const pythonProcess = spawn(cmd, args, {
                windowsHide: true,
                env: { ...process.env, PYTHONUNBUFFERED: '1' },
            });
            console.log(`[Processing] Python process started (pid: ${pythonProcess.pid})`);

            pythonProcess.stdout.on('data', (data) => {
                const text = data.toString().trim();
                console.log(`[Python stdout]: ${text}`);
                if (onProgress) onProgress(text);
            });

            pythonProcess.stderr.on('data', (data) => {
                const text = data.toString().trim();
                console.error(`[Python stderr]: ${text}`);
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
                console.error('[Error] Python process error:', err.message);
                reject(err);
            });
        }).catch((err) => {
            console.error('[Error] Failed to start Python process:', err.message);
            reject(err);
        });
    });
}

module.exports = {
    validateUpload,
    processVideoWithPython
};
