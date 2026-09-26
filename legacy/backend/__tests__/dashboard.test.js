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

let app;

beforeEach(() => {
  jest.resetModules();
  const db = require('../config/database');
  db.query.mockReset();
  db.query.mockReturnValue(Promise.resolve({ rows: [] }));
  app = require('../server');
});

describe('GET /api/dashboard/stats', () => {
  test('returns dashboard stats', async () => {
    const db = require('../config/database');
    const now = new Date();
    const msPerDay = 24 * 60 * 60 * 1000;
    const currentWeekStart = new Date(now);
    currentWeekStart.setDate(now.getDate() - ((now.getDay() + 6) % 7));
    currentWeekStart.setHours(0, 0, 0, 0);
    const week1 = new Date(currentWeekStart);
    const week2 = new Date(week1.getTime() - 7 * msPerDay);
    const week3 = new Date(week2.getTime() - 7 * msPerDay);
    db.query
      .mockReturnValueOnce(Promise.resolve({ rows: [{ count: 10 }] }))
      .mockReturnValueOnce(Promise.resolve({ rows: [{ volume: 5000 }] }))
      .mockReturnValueOnce(Promise.resolve({ rows: [
        { week_start: week1 },
        { week_start: week2 },
        { week_start: week3 },
      ] }));
    const res = await request(app).get('/api/dashboard/stats');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.workoutCount).toBe(10);
    expect(res.body.data.weeklyVolume).toBe(5000);
    expect(res.body.data.currentStreak).toBe(3);
  });

  test('returns 500 on db error', async () => {
    const db = require('../config/database');
    db.query.mockReturnValueOnce(Promise.reject(new Error('DB error')));
    const res = await request(app).get('/api/dashboard/stats');
    expect(res.status).toBe(500);
  });
});
