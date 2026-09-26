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

const mockGoal = { id: 1, exercise_id: 5, target_weight: 100, target_reps: 10, expected_date: '2024-06-01', user_id: 1 };

let app;

beforeEach(() => {
  jest.resetModules();
  const db = require('../config/database');
  db.query.mockReset();
  db.query.mockReturnValue(Promise.resolve({ rows: [] }));
  app = require('../server');
});

describe('GET /api/goals', () => {
  test('returns list of goals', async () => {
    const db = require('../config/database');
    db.query.mockReturnValueOnce(Promise.resolve({ rows: [mockGoal] }));
    const res = await request(app).get('/api/goals');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.goals).toHaveLength(1);
  });
});

describe('POST /api/goals', () => {
  test('creates a new goal', async () => {
    const db = require('../config/database');
    db.query.mockReturnValueOnce(Promise.resolve({ rows: [mockGoal] }));
    const res = await request(app).post('/api/goals').send({
      exercise_id: 5, target_weight: 100, target_reps: 10, expected_date: '2024-06-01',
    });
    expect(res.status).toBe(200);
    expect(res.body.goal.target_weight).toBe(100);
  });
});

describe('PUT /api/goals/:id', () => {
  test('updates a goal', async () => {
    const db = require('../config/database');
    db.query.mockReturnValueOnce(Promise.resolve({ rows: [{ ...mockGoal, target_weight: 110 }] }));
    const res = await request(app).put('/api/goals/1').send({ target_weight: 110 });
    expect(res.status).toBe(200);
    expect(res.body.goal.target_weight).toBe(110);
  });

  test('returns 404 for non-existent goal', async () => {
    const db = require('../config/database');
    db.query.mockReturnValueOnce(Promise.resolve({ rows: [] }));
    const res = await request(app).put('/api/goals/999').send({ target_weight: 110 });
    expect(res.status).toBe(404);
  });
});

describe('DELETE /api/goals/:id', () => {
  test('deletes a goal', async () => {
    const db = require('../config/database');
    db.query.mockReturnValueOnce(Promise.resolve({ rowCount: 1 }));
    const res = await request(app).delete('/api/goals/1');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test('returns 404 when deleting non-existent goal', async () => {
    const db = require('../config/database');
    db.query.mockReturnValueOnce(Promise.resolve({ rowCount: 0 }));
    const res = await request(app).delete('/api/goals/999');
    expect(res.status).toBe(404);
  });
});
