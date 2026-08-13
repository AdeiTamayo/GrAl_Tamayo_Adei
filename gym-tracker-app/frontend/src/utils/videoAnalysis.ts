import { FilesetResolver, PoseLandmarker, DrawingUtils, NormalizedLandmark } from '@mediapipe/tasks-vision';

export type AnalysisMode = 'pose' | 'squat' | 'barbell';

export interface AnalyzeResult {
    blob: Blob;
    feedback: string[];
}

const MODEL_URL =
    'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task';
const WASM_URL = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.0.1/wasm';

const MAX_WIDTH = 960;
const MAX_HEIGHT = 720;

const POSE_CONNECTIONS: { start: number; end: number }[] = [
    { start: 11, end: 12 }, { start: 11, end: 23 }, { start: 12, end: 24 }, { start: 23, end: 24 },
    { start: 23, end: 25 }, { start: 24, end: 26 }, { start: 25, end: 27 }, { start: 26, end: 28 },
    { start: 27, end: 31 }, { start: 27, end: 29 }, { start: 28, end: 32 }, { start: 28, end: 30 },
];

type Landmark = NormalizedLandmark;

let landmarkerPromise: Promise<PoseLandmarker> | null = null;

async function getPoseLandmarker(onProgress?: (message: string) => void): Promise<PoseLandmarker> {
    if (!landmarkerPromise) {
        landmarkerPromise = (async () => {
            onProgress?.('Loading pose model...');
            const vision = await FilesetResolver.forVisionTasks(WASM_URL);
            return PoseLandmarker.createFromOptions(vision, {
                baseOptions: { modelAssetPath: MODEL_URL, delegate: 'GPU' },
                runningMode: 'VIDEO',
                numPoses: 1,
            });
        })();
        landmarkerPromise.catch(() => { landmarkerPromise = null; });
    }
    return landmarkerPromise;
}

function angleDeg(a: Landmark, b: Landmark, c: Landmark): number {
    const v1x = a.x - b.x;
    const v1y = a.y - b.y;
    const v2x = c.x - b.x;
    const v2y = c.y - b.y;
    const dot = v1x * v2x + v1y * v2y;
    const mag = Math.hypot(v1x, v1y) * Math.hypot(v2x, v2y);
    if (mag === 0) return 180;
    const cos = Math.min(1, Math.max(-1, dot / mag));
    return (Math.acos(cos) * 180) / Math.PI;
}

function pickMimeType(): string {
    const candidates = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm', 'video/mp4'];
    for (const c of candidates) {
        if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(c)) return c;
    }
    return '';
}

function toPx(lm: Landmark, w: number, h: number): { x: number; y: number } {
    return { x: lm.x * w, y: lm.y * h };
}

function drawSkeleton(
    ctx: CanvasRenderingContext2D,
    drawer: DrawingUtils,
    lm: Landmark[],
    w: number,
    h: number,
    mode: AnalysisMode,
    state: {
        minKnee: number;
        minHip: number;
        down: boolean;
        reps: number;
        barPath: { x: number; y: number }[];
    }
) {
    const normalized = lm;
    drawer.drawConnectors(normalized, POSE_CONNECTIONS, { color: '#22d3ee', lineWidth: 3 });
    drawer.drawLandmarks(normalized, { color: '#facc15', fillColor: '#facc15', radius: 2.5 });

    if (mode === 'squat') {
        const kneeAngles = [
            angleDeg(lm[23], lm[25], lm[27]),
            angleDeg(lm[24], lm[26], lm[28]),
        ];
        const hipAngles = [
            angleDeg(lm[11], lm[23], lm[25]),
            angleDeg(lm[12], lm[24], lm[26]),
        ];
        const avgKnee = (kneeAngles[0] + kneeAngles[1]) / 2;
        const avgHip = (hipAngles[0] + hipAngles[1]) / 2;
        state.minKnee = Math.min(state.minKnee, avgKnee);
        state.minHip = Math.min(state.minHip, avgHip);

        if (avgKnee < 110 && !state.down) state.down = true;
        if (avgKnee > 155 && state.down) {
            state.down = false;
            state.reps++;
        }

        ctx.font = 'bold 16px monospace';
        ctx.fillStyle = '#facc15';
        ctx.strokeStyle = 'rgba(0,0,0,0.6)';
        ctx.lineWidth = 3;
        for (const kneeIdx of [25, 26]) {
            const k = toPx(lm[kneeIdx], w, h);
            const label = `${Math.round(angleDeg(lm[kneeIdx - 2], lm[kneeIdx], lm[kneeIdx + 2]))}°`;
            ctx.strokeText(label, k.x + 6, k.y - 6);
            ctx.fillText(label, k.x + 6, k.y - 6);
        }
    }

    if (mode === 'barbell') {
        const mid = toPx(
            { x: (lm[11].x + lm[12].x) / 2, y: (lm[11].y + lm[12].y) / 2, z: 0, visibility: 1 },
            w,
            h
        );
        state.barPath.push(mid);
        if (state.barPath.length > 600) state.barPath.shift();

        ctx.beginPath();
        ctx.strokeStyle = '#f43f5e';
        ctx.lineWidth = 3;
        state.barPath.forEach((p, i) => {
            if (i === 0) ctx.moveTo(p.x, p.y);
            else ctx.lineTo(p.x, p.y);
        });
        ctx.stroke();

        ctx.beginPath();
        ctx.fillStyle = '#f43f5e';
        ctx.arc(mid.x, mid.y, 6, 0, Math.PI * 2);
        ctx.fill();
    }
}

export async function analyzeVideo(
    file: File,
    mode: AnalysisMode,
    onProgress: (message: string) => void,
    shouldCancel: () => boolean
): Promise<AnalyzeResult> {
    const landmarker = await getPoseLandmarker(onProgress);
    if (shouldCancel()) throw new DOMException('Analysis cancelled', 'AbortError');

    onProgress('Loading video...');
    const url = URL.createObjectURL(file);
    const video = document.createElement('video');
    video.src = url;
    video.muted = true;
    video.playsInline = true;

    try {
        await new Promise<void>((resolve, reject) => {
            video.onloadedmetadata = () => resolve();
            video.onerror = () => reject(new Error('Could not read this video file'));
        });

        const duration = video.duration || 1;
        const scale = Math.min(1, MAX_WIDTH / video.videoWidth, MAX_HEIGHT / video.videoHeight) || 1;
        const w = Math.max(1, Math.round(video.videoWidth * scale));
        const h = Math.max(1, Math.round(video.videoHeight * scale));

        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Canvas is not supported in this browser');
        const drawer = new DrawingUtils(ctx);

        const mimeType = pickMimeType();
        if (!mimeType) throw new Error('Video recording is not supported in this browser');

        const stream = canvas.captureStream(30);
        const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 5_000_000 });
        const chunks: Blob[] = [];
        recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };

        const state = { minKnee: 180, minHip: 180, down: false, reps: 0, barPath: [] as { x: number; y: number }[] };

        await video.play().catch(() => undefined);
        onProgress('Analyzing frames... 0%');
        recorder.start(250);

        await new Promise<void>((resolve, reject) => {
            let lastProgress = -1;
            let skipped = false;

            const rvf = (video as HTMLVideoElement & {
                requestVideoFrameCallback?: (cb: (now: number, metadata: unknown) => void) => number;
            }).requestVideoFrameCallback;

            const tick = async () => {
                if (shouldCancel()) {
                    reject(new DOMException('Analysis cancelled', 'AbortError'));
                    return;
                }

                const t = video.currentTime;
                const pct = Math.round((t / duration) * 100);
                if (pct !== lastProgress) {
                    lastProgress = pct;
                    onProgress(`Analyzing frames... ${pct}%`);
                }

                ctx.drawImage(video, 0, 0, w, h);

                if (!skipped) {
                    try {
                        const result = await landmarker.detectForVideo(video, Math.max(0, Math.round(t * 1000)));
                        const lm = result.landmarks?.[0] as Landmark[] | undefined;
                        if (lm && lm.length >= 29) {
                            drawSkeleton(ctx, drawer, lm, w, h, mode, state);
                        }
                    } catch {
                        // frame skipped when the model rejects the frame
                    }
                }
                skipped = !skipped;

                if (video.ended || t >= duration - 0.05) {
                    resolve();
                    return;
                }
                if (rvf) rvf.call(video, () => { void tick(); });
                else requestAnimationFrame(() => { void tick(); });
            };

            if (rvf) rvf.call(video, () => { void tick(); });
            else requestAnimationFrame(() => { void tick(); });
        });

        onProgress('Saving processed video...');
        await new Promise<void>((resolve) => {
            recorder.onstop = () => resolve();
            recorder.stop();
        });
        stream.getTracks().forEach((track) => track.stop());

        const blob = new Blob(chunks, { type: mimeType });

        const feedback: string[] = [];
        if (mode === 'squat') {
            feedback.push(`Reps detected: ${state.reps}`);
            feedback.push(
                state.minKnee <= 90
                    ? 'Good squat depth (knee angle reached ~90° or less)'
                    : 'Shallow squat — aim for deeper descent'
            );
            feedback.push(
                state.minHip <= 60
                    ? 'Torso leans too far forward — keep chest up'
                    : 'Torso upright through the movement'
            );
        } else if (mode === 'barbell') {
            const path = state.barPath;
            if (path.length > 1) {
                const total = path.reduce((acc, p, i) => {
                    if (i === 0) return 0;
                    const prev = path[i - 1];
                    return acc + Math.hypot(p.x - prev.x, p.y - prev.y);
                }, 0);
                const minY = Math.min(...path.map((p) => p.y));
                const maxY = Math.max(...path.map((p) => p.y));
                feedback.push(`Bar path travelled: ${Math.round(total)} px`);
                feedback.push(`Bar vertical drop: ${Math.round(maxY - minY)} px`);
            } else {
                feedback.push('No bar path data captured — keep shoulders visible');
            }
        } else {
            feedback.push('Pose skeleton overlaid on the processed video');
        }

        return { blob, feedback };
    } finally {
        URL.revokeObjectURL(url);
    }
}