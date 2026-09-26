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

describe('GET /api/videos', () => {
  test('returns user videos', async () => {
    const db = require('../config/database');
    db.query.mockReturnValueOnce(Promise.resolve({ rows: [] }));
    db.query.mockReturnValueOnce(Promise.resolve({ rows: [] }));
    const res = await request(app).get('/api/videos');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});
