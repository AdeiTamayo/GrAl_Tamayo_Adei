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
    req.userEmail = 'test@example.com';
    next();
  });
});

const request = require('supertest');

const mockPrSummary = [
  { exercise_id: 1, exercise_name: 'Bench Press', best_weight: 100, best_reps: 10, date: '2024-01-15' },
  { exercise_id: 2, exercise_name: 'Squat', best_weight: 140, best_reps: 8, date: '2024-02-01' },
];

let app;

beforeEach(() => {
  jest.resetModules();
  const db = require('../config/database');
  db.query.mockReset();
  db.query.mockReturnValue(Promise.resolve({ rows: [] }));
  app = require('../server');
});

describe('GET /api/prs', () => {
  test('returns PR summary', async () => {
    const db = require('../config/database');
    db.query.mockReturnValueOnce(Promise.resolve({ rows: mockPrSummary }));
    const res = await request(app).get('/api/prs');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
    expect(res.body.data[0].exercise_name).toBe('Bench Press');
  });
});

describe('POST /api/prs', () => {
  test('creates a new PR', async () => {
    const db = require('../config/database');
    db.query.mockReturnValueOnce(Promise.resolve({ rows: [{ id: 1, exercise_id: 1, weight: 100, repetitions: 10 }] }));
    const res = await request(app).post('/api/prs').send({
      exercise_id: 1, weight: 100, repetitions: 10, date: '2024-01-15',
    });
    expect(res.status).toBe(201);
    expect(res.body.data.weight).toBe(100);
  });
});

describe('GET /api/prs/:id/history', () => {
  test('returns PR history for an exercise', async () => {
    const db = require('../config/database');
    db.query.mockReturnValueOnce(Promise.resolve({ rows: mockPrSummary }));
    const res = await request(app).get('/api/prs/1/history');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
  });
});

describe('PUT /api/prs/:id', () => {
  test('updates a PR', async () => {
    const db = require('../config/database');
    db.query.mockReturnValueOnce(Promise.resolve({ rows: [{ id: 1, weight: 105, repetitions: 8 }] }));
    const res = await request(app).put('/api/prs/1').send({ weight: 105, repetitions: 8 });
    expect(res.status).toBe(200);
    expect(res.body.data.weight).toBe(105);
  });
});

describe('DELETE /api/prs/:id', () => {
  test('deletes a PR', async () => {
    const db = require('../config/database');
    db.query.mockReturnValueOnce(Promise.resolve({ rowCount: 1 }));
    const res = await request(app).delete('/api/prs/1');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});
