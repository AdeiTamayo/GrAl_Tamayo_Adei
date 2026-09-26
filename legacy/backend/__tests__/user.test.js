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

jest.mock('bcrypt', () => ({
  compare: jest.fn((pass, hash) => Promise.resolve(pass === 'password123')),
  hash: jest.fn(() => Promise.resolve('$2b$10$hashedvalue')),
}));

const request = require('supertest');

const mockUser = { id: 1, name: 'John', surname: 'Doe', email: 'john@example.com' };

let app;

beforeEach(() => {
  jest.resetModules();
  const db = require('../config/database');
  db.query.mockReset();
  db.query.mockReturnValue(Promise.resolve({ rows: [] }));
  app = require('../server');
});

describe('POST /api/user/login', () => {
  test('login succeeds with valid credentials', async () => {
    const db = require('../config/database');
    db.query.mockReturnValueOnce(Promise.resolve({ rows: [{ id: 1, email: 'john@example.com', password: 'hash' }] }));
    const res = await request(app).post('/api/user/login').send({ email: 'john@example.com', password: 'password123' });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.token).toBeDefined();
  });

  test('login fails with wrong password', async () => {
    const db = require('../config/database');
    db.query.mockReturnValueOnce(Promise.resolve({ rows: [{ id: 1, email: 'john@example.com', password: 'hash' }] }));
    const res = await request(app).post('/api/user/login').send({ email: 'john@example.com', password: 'wrongpass' });
    expect(res.status).toBe(401);
  });

  test('login fails with missing credentials', async () => {
    const res = await request(app).post('/api/user/login').send({});
    expect(res.status).toBe(400);
  });

  test('login fails for non-existent user', async () => {
    const db = require('../config/database');
    db.query.mockReturnValueOnce(Promise.resolve({ rows: [] }));
    const res = await request(app).post('/api/user/login').send({ email: 'unknown@example.com', password: 'password' });
    expect(res.status).toBe(401);
  });
});

describe('POST /api/user/register', () => {
  test('register succeeds with valid data', async () => {
    const db = require('../config/database');
    db.query.mockReturnValueOnce(Promise.resolve({ rows: [] }));
    db.query.mockReturnValueOnce(Promise.resolve({ rows: [{ id: 2, email: 'new@example.com' }] }));
    const res = await request(app).post('/api/user/register').send({
      name: 'Jane', surname: 'Doe', email: 'new@example.com', password: 'password123',
    });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
  });

  test('register fails with duplicate email', async () => {
    const db = require('../config/database');
    db.query.mockReturnValueOnce(Promise.resolve({ rows: [{ id: 1, email: 'existing@example.com' }] }));
    const res = await request(app).post('/api/user/register').send({
      name: 'Jane', email: 'existing@example.com', password: 'password123',
    });
    expect(res.status).toBe(409);
  });

  test('register fails with missing email and password', async () => {
    const res = await request(app).post('/api/user/register').send({ name: 'Jane' });
    expect(res.status).toBe(400);
  });
});

describe('GET /api/user (profile)', () => {
  test('returns user profile', async () => {
    const db = require('../config/database');
    db.query.mockReturnValueOnce(Promise.resolve({ rows: [mockUser] }));
    const res = await request(app).get('/api/user');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.user.email).toBe('john@example.com');
  });

  test('returns 404 when user not found', async () => {
    const db = require('../config/database');
    db.query.mockReturnValueOnce(Promise.resolve({ rows: [] }));
    const res = await request(app).get('/api/user');
    expect(res.status).toBe(404);
  });
});

describe('GET /api/user/settings', () => {
  test('returns user settings', async () => {
    const db = require('../config/database');
    db.query.mockReturnValueOnce(Promise.resolve({ rows: [{ show_rpe: true, show_1rm: false, default_rest_time: 90 }] }));
    const res = await request(app).get('/api/user/settings');
    expect(res.status).toBe(200);
    expect(res.body.data.show_rpe).toBe(true);
  });
});

describe('GET /api/user/weights', () => {
  test('returns weight history', async () => {
    const db = require('../config/database');
    db.query.mockReturnValueOnce(Promise.resolve({ rows: [{ total: '2' }] }));
    db.query.mockReturnValueOnce(Promise.resolve({ rows: [{ weight: 80, date: '2024-01-01' }, { weight: 82, date: '2024-02-01' }] }));
    const res = await request(app).get('/api/user/weights');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
  });

  test('returns 400 for invalid date format', async () => {
    const res = await request(app).get('/api/user/weights?startDate=invalid-date');
    expect(res.status).toBe(400);
  });
});

describe('POST /api/user/weights', () => {
  test('adds weight entry', async () => {
    const db = require('../config/database');
    db.query
      .mockReturnValueOnce(Promise.resolve({ rows: [{ id: 1, weight: 80, date: '2024-01-01' }] }))
      .mockReturnValueOnce(Promise.resolve({ rows: [{ weight: 80 }] }));
    const res = await request(app).post('/api/user/weights').send({ weight: 80, date: '2024-01-01' });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
  });
});

describe('DELETE /api/user/weights/:id', () => {
  test('deletes weight entry', async () => {
    const db = require('../config/database');
    db.query
      .mockReturnValueOnce(Promise.resolve({ rowCount: 1 }))
      .mockReturnValueOnce(Promise.resolve({ rows: [{ weight: 78 }] }));
    const res = await request(app).delete('/api/user/weights/1');
    expect(res.status).toBe(200);
  });
});
