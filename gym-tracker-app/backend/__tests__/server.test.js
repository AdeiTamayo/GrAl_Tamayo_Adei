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
const app = require('../server');

describe('Server', () => {
  test('returns 404 for unknown routes', async () => {
    const res = await request(app).get('/api/unknown-route');
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toContain('not found');
  });

  test('returns 404 for unknown method on existing base path', async () => {
    const res = await request(app).patch('/api/exercises');
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  test('server responds to OPTIONS preflight', async () => {
    const res = await request(app).options('/api/exercises');
    expect(res.status).toBe(204);
  });

  test('exercise routes are mounted', async () => {
    const res = await request(app).get('/api/exercises');
    expect(res.status).not.toBe(404);
  });

  test('video routes are mounted', async () => {
    const res = await request(app).get('/api/videos');
    expect(res.status).not.toBe(404);
  });
});
