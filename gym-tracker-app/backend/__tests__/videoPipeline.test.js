/**
 * End-to-end test of the video analysis pipeline: HTTP upload -> multer ->
 * service -> Python bridge -> database record -> NDJSON response.
 *
 * The Python process is the only part stubbed; everything else is the real
 * wiring, which is exactly the seam that is hard to verify by hand.
 */

const EventEmitter = require('events');
const fs = require('fs');
const path = require('path');

jest.mock('../config/database', () => {
  const { Pool } = require('pg');
  const pool = new Pool();
  pool.query = jest.fn();
  pool.connect = jest.fn();
  return pool;
});

jest.mock('../middleware/auth', () => {
  return jest.fn((req, res, next) => {
    req.userId = 1;
    next();
  });
});

jest.mock('../utils/videoProcessor', () => ({
  validateUpload: jest.fn(() => ({ valid: true })),
  processVideoWithPython: jest.fn(),
}));

const request = require('supertest');
const uploadsDir = path.join(__dirname, '..', 'media', 'uploads');

let app;
let db;
let videoProcessor;
let writtenFiles;

const UPLOAD = Buffer.from('not a real mp4');

beforeEach(() => {
  jest.resetModules();
  writtenFiles = [];

  db = require('../config/database');
  db.query.mockReset();
  db.query.mockReturnValue(Promise.resolve({ rows: [{ id: 1 }] }));

  // Required after resetModules so the test and the app share one mock instance.
  videoProcessor = require('../utils/videoProcessor');
  videoProcessor.validateUpload.mockReturnValue({ valid: true });
  videoProcessor.processVideoWithPython.mockImplementation(
    (script, input, output, inFlag, outFlag, extraArgs, onProgress) => {
      writtenFiles.push({ script, input, output, extraArgs });
      if (typeof onProgress === 'function') onProgress('frame 1');
      // Simulate the script producing its output file.
      fs.writeFileSync(output, 'processed');
      return Promise.resolve(output);
    }
  );

  app = require('../server');
});

afterEach(() => {
  writtenFiles.forEach(({ output }) => {
    if (fs.existsSync(output)) fs.unlinkSync(output);
  });
  fs.readdirSync(uploadsDir).forEach((name) => {
    if (name.startsWith('e2e-')) fs.unlinkSync(path.join(uploadsDir, name));
  });
});

/** Parse an NDJSON stream into objects. */
function parseNdjson(text) {
  return text
    .split('\n')
    .filter((line) => line.trim().length > 0)
    .map((line) => JSON.parse(line));
}

describe('POST /api/videos/pose-estimation', () => {
  test('runs the pose script and returns the processed video URL', async () => {
    const res = await request(app)
      .post('/api/videos/pose-estimation')
      .attach('video', UPLOAD, { filename: 'e2e-pose.mp4', contentType: 'video/mp4' });

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('application/x-ndjson');

    const messages = parseNdjson(res.text);
    expect(messages[messages.length - 1]).toMatchObject({
      type: 'done',
      processedVideoUrl: expect.stringMatching(/\/media\/output\/PoseEstimation-\d+-e2e-pose\.mp4$/),
    });
  });

  test('passes the requested mode to the python script', async () => {
    await request(app)
      .post('/api/videos/pose-estimation')
      .field('mode', 'squat')
      .attach('video', UPLOAD, { filename: 'e2e-squat.mp4', contentType: 'video/mp4' });

    const call = writtenFiles[0];
    expect(path.basename(call.script)).toBe('landmarks_video.py');
    expect(call.extraArgs).toEqual(['--mode', 'squat']);
    // Multer prefixes the stored name with a timestamp; the analysis prefix goes
    // in front of that, which is what getUserVideos later reads back.
    expect(path.basename(call.output)).toMatch(/^SquatAnalysis-\d+-e2e-squat\.mp4$/);
  });

  test('falls back to the normal mode for an unknown mode', async () => {
    await request(app)
      .post('/api/videos/pose-estimation')
      .field('mode', 'sideways')
      .attach('video', UPLOAD, { filename: 'e2e-unknown.mp4', contentType: 'video/mp4' });

    expect(writtenFiles[0].extraArgs).toEqual(['--mode', 'normal']);
    expect(path.basename(writtenFiles[0].output)).toMatch(/^PoseEstimation-\d+-e2e-unknown\.mp4$/);
  });

  test('records the finished video against the authenticated user', async () => {
    await request(app)
      .post('/api/videos/pose-estimation')
      .attach('video', UPLOAD, { filename: 'e2e-record.mp4', contentType: 'video/mp4' });

    const insert = db.query.mock.calls.find(([sql]) => sql.includes('INSERT INTO videos'));
    expect(insert).toBeDefined();
    expect(insert[1][0]).toBe(1); // userId
    expect(insert[1][2]).toBe('pose_estimation');
  });

  test('deletes the raw upload once processing finishes', async () => {
    await request(app)
      .post('/api/videos/pose-estimation')
      .attach('video', UPLOAD, { filename: 'e2e-cleanup.mp4', contentType: 'video/mp4' });

    expect(fs.existsSync(path.join(uploadsDir, 'e2e-cleanup.mp4'))).toBe(false);
  });

  test('reports a python failure as an error message and still cleans up', async () => {
    videoProcessor.processVideoWithPython.mockRejectedValue(new Error('Python process failed with code 1'));

    const res = await request(app)
      .post('/api/videos/pose-estimation')
      .attach('video', UPLOAD, { filename: 'e2e-fail.mp4', contentType: 'video/mp4' });

    const messages = parseNdjson(res.text);
    expect(messages[messages.length - 1]).toEqual({ type: 'error', message: 'Python process failed with code 1' });
    expect(fs.existsSync(path.join(uploadsDir, 'e2e-fail.mp4'))).toBe(false);
  });

  test('rejects the upload before starting python when validation fails', async () => {
    videoProcessor.validateUpload.mockReturnValue({ valid: false, error: 'No video file uploaded' });

    const res = await request(app)
      .post('/api/videos/pose-estimation')
      .attach('video', UPLOAD, { filename: 'e2e-invalid.mp4', contentType: 'video/mp4' });

    expect(parseNdjson(res.text)).toEqual([{ type: 'error', message: 'No video file uploaded' }]);
    expect(videoProcessor.processVideoWithPython).not.toHaveBeenCalled();
  });

  test('refuses a non-video upload', async () => {
    const res = await request(app)
      .post('/api/videos/pose-estimation')
      .attach('video', Buffer.from('rm -rf /'), { filename: 'evil.sh', contentType: 'application/x-sh' });

    expect(res.status).toBe(500);
    expect(res.body.error).toMatch(/Only video files are allowed/);
    expect(videoProcessor.processVideoWithPython).not.toHaveBeenCalled();
  });
});

describe('POST /api/videos/barbell-tracking', () => {
  test('runs the barbell script with its own flags and output prefix', async () => {
    const res = await request(app)
      .post('/api/videos/barbell-tracking')
      .attach('video', UPLOAD, { filename: 'e2e-barbell.mp4', contentType: 'video/mp4' });

    const call = writtenFiles[0];
    expect(path.basename(call.script)).toBe('barbell_tracking.py');
    expect(call.extraArgs).toEqual([]);
    expect(path.basename(call.output)).toMatch(/^barbell-\d+-e2e-barbell\.mp4$/);

    const messages = parseNdjson(res.text);
    expect(messages[messages.length - 1].processedVideoUrl).toMatch(/barbell-\d+-e2e-barbell\.mp4$/);
  });

  test('records the analysis as barbell_tracking', async () => {
    await request(app)
      .post('/api/videos/barbell-tracking')
      .attach('video', UPLOAD, { filename: 'e2e-barbell2.mp4', contentType: 'video/mp4' });

    const insert = db.query.mock.calls.find(([sql]) => sql.includes('INSERT INTO videos'));
    expect(insert[1][2]).toBe('barbell_tracking');
  });
});
