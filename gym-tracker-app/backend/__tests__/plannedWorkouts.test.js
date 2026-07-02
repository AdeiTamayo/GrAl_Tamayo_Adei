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

const mockPlanned = { id: 1, name: 'Monday Workout', date: '2024-01-15', user_id: 1 };

let app;

beforeEach(() => {
  jest.resetModules();
  const db = require('../config/database');
  db.query.mockReset();
  db.query.mockReturnValue(Promise.resolve({ rows: [] }));
  app = require('../server');
});

describe('GET /api/planned-workouts', () => {
  test('returns planned workouts', async () => {
    const db = require('../config/database');
    db.query.mockReturnValueOnce(Promise.resolve({ rows: [mockPlanned] }));
    const res = await request(app).get('/api/planned-workouts');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].name).toBe('Monday Workout');
  });
});

describe('POST /api/planned-workouts', () => {
  test('creates a planned workout', async () => {
    const db = require('../config/database');
    db.query.mockReturnValueOnce(Promise.resolve({ rows: [mockPlanned] }));
    const res = await request(app).post('/api/planned-workouts').send({ name: 'Monday Workout', date: '2024-01-15' });
    expect(res.status).toBe(201);
    expect(res.body.data.name).toBe('Monday Workout');
  });

  test('fails without required fields', async () => {
    const res = await request(app).post('/api/planned-workouts').send({});
    expect(res.status).toBe(400);
  });
});

describe('PUT /api/planned-workouts/:id', () => {
  test('updates a planned workout', async () => {
    const db = require('../config/database');
    db.query.mockReturnValueOnce(Promise.resolve({ rows: [{ ...mockPlanned, name: 'Tuesday Workout' }] }));
    const res = await request(app).put('/api/planned-workouts/1').send({ name: 'Tuesday Workout' });
    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe('Tuesday Workout');
  });
});

describe('DELETE /api/planned-workouts/:id', () => {
  test('deletes a planned workout', async () => {
    const db = require('../config/database');
    db.query.mockReturnValueOnce(Promise.resolve({ rowCount: 1 }));
    const res = await request(app).delete('/api/planned-workouts/1');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});
