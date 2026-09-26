const path = require('path');
const fsPromises = require('fs').promises;
const request = require('supertest');

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

let app;
let readdirSpy;

const FIXTURES = [
  { name: 'PoseEstimation-1-a.mp4', createdAt: new Date('2024-03-10T10:00:00Z') },
  { name: 'SquatAnalysis-1-b.mp4', createdAt: new Date('2024-03-12T10:00:00Z') },
  { name: 'barbell-1-c.mp4', createdAt: new Date('2024-03-15T10:00:00Z') },
  { name: 'notes.txt', createdAt: new Date('2024-03-16T10:00:00Z') },
];

beforeEach(() => {
  jest.resetModules();
  const db = require('../config/database');
  db.query.mockReset();
  db.query.mockReturnValue(Promise.resolve({ rows: [] }));

  readdirSpy = jest.spyOn(fsPromises, 'readdir').mockResolvedValue([]);
  jest.spyOn(fsPromises, 'stat').mockImplementation((fullPath) => {
    const found = FIXTURES.find((f) => f.name === path.basename(fullPath));
    return Promise.resolve({ birthtime: found ? found.createdAt : new Date(0) });
  });

  app = require('../server');
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('GET /api/videos', () => {
  test('lists only processed mp4 files, newest first', async () => {
    readdirSpy.mockResolvedValue(FIXTURES.map((f) => f.name));

    const res = await request(app).get('/api/videos');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.videos).toHaveLength(3);
    expect(res.body.videos.map((v) => v.id)).toEqual([
      'barbell-1-c.mp4',
      'SquatAnalysis-1-b.mp4',
      'PoseEstimation-1-a.mp4',
    ]);
  });

  test('derives the analysis type from the output filename', async () => {
    readdirSpy.mockResolvedValue(FIXTURES.map((f) => f.name));

    const res = await request(app).get('/api/videos');
    const byId = Object.fromEntries(res.body.videos.map((v) => [v.id, v.process_type]));

    expect(byId['PoseEstimation-1-a.mp4']).toBe('Pose Estimation');
    expect(byId['SquatAnalysis-1-b.mp4']).toBe('Squat Analysis');
    expect(byId['barbell-1-c.mp4']).toBe('Barbell Tracking');
  });

  test('exposes a relative processed_url', async () => {
    readdirSpy.mockResolvedValue(['barbell-1-c.mp4']);

    const res = await request(app).get('/api/videos');
    expect(res.body.videos[0].processed_url).toBe('/media/output/barbell-1-c.mp4');
  });

  test('filters by analysis type', async () => {
    readdirSpy.mockResolvedValue(FIXTURES.map((f) => f.name));

    const res = await request(app).get('/api/videos?type=squat_analysis');

    expect(res.body.videos).toHaveLength(1);
    expect(res.body.videos[0].id).toBe('SquatAnalysis-1-b.mp4');
  });

  test('sorts ascending when asked', async () => {
    readdirSpy.mockResolvedValue(FIXTURES.map((f) => f.name));

    const res = await request(app).get('/api/videos?sort=asc');

    expect(res.body.videos.map((v) => v.id)).toEqual([
      'PoseEstimation-1-a.mp4',
      'SquatAnalysis-1-b.mp4',
      'barbell-1-c.mp4',
    ]);
  });

  test('ignores an unknown type filter instead of failing', async () => {
    readdirSpy.mockResolvedValue(FIXTURES.map((f) => f.name));

    const res = await request(app).get('/api/videos?type=nonsense');
    expect(res.status).toBe(200);
    expect(res.body.videos).toHaveLength(3);
  });

  test('returns 500 when the output directory cannot be read', async () => {
    readdirSpy.mockRejectedValue(new Error('ENOENT'));

    const res = await request(app).get('/api/videos');
    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
  });
});
