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

const mockRoutine = { id: 1, name: 'Push Pull', user_id: 1 };
const mockExercise = { id: 1, routine_id: 1, exercise_id: 5, exercise_order: 1 };

let app;

beforeEach(() => {
  jest.resetModules();
  const db = require('../config/database');
  db.query.mockReset();
  db.query.mockReturnValue(Promise.resolve({ rows: [] }));
  app = require('../server');
});

describe('GET /api/routines', () => {
  test('returns user routines', async () => {
    const db = require('../config/database');
    db.query.mockReturnValueOnce(Promise.resolve({ rows: [mockRoutine] }));
    const res = await request(app).get('/api/routines');
    expect(res.status).toBe(200);
    expect(res.body.routines).toHaveLength(1);
  });
});

describe('GET /api/routines/:id', () => {
  test('returns a routine by id', async () => {
    const db = require('../config/database');
    db.query.mockReturnValueOnce(Promise.resolve({ rows: [mockRoutine] }));
    const res = await request(app).get('/api/routines/1');
    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe('Push Pull');
  });
});

describe('POST /api/routines', () => {
  test('creates a new routine', async () => {
    const db = require('../config/database');
    db.query.mockReturnValueOnce(Promise.resolve({ rows: [mockRoutine] }));
    const res = await request(app).post('/api/routines').send({ name: 'Push Pull' });
    expect(res.status).toBe(201);
    expect(res.body.data.name).toBe('Push Pull');
  });
});

describe('PUT /api/routines/:id', () => {
  test('updates a routine', async () => {
    const db = require('../config/database');
    db.query.mockReturnValueOnce(Promise.resolve({ rows: [{ ...mockRoutine, name: 'Leg Day' }] }));
    const res = await request(app).put('/api/routines/1').send({ name: 'Leg Day' });
    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe('Leg Day');
  });
});

describe('DELETE /api/routines/:id', () => {
  test('deletes a routine', async () => {
    const db = require('../config/database');
    db.query.mockReturnValueOnce(Promise.resolve({ rowCount: 1, rows: [{ id: 1 }] }));
    const res = await request(app).delete('/api/routines/1');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

describe('POST /api/routines/:id/exercises', () => {
  test('adds exercise to routine', async () => {
    const db = require('../config/database');
    db.query
      .mockReturnValueOnce(Promise.resolve({ rows: [{ id: 1 }], rowCount: 1 }))
      .mockReturnValueOnce(Promise.resolve({ rows: [mockExercise] }));
    const res = await request(app).post('/api/routines/1/exercises').send({ exercise_id: 5 });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

describe('DELETE /api/routines/exercises/:item_id', () => {
  test('removes exercise from routine', async () => {
    const db = require('../config/database');
    db.query.mockReturnValueOnce(Promise.resolve({ rowCount: 1 }));
    const res = await request(app).delete('/api/routines/exercises/1');
    expect(res.status).toBe(200);
  });
});

describe('POST /api/routines/exercises/:item_id/sets', () => {
  test('adds set to routine exercise', async () => {
    const db = require('../config/database');
    db.query.mockReturnValueOnce(Promise.resolve({ rows: [{ id: 1, set_number: 1, planned_weight: 80 }] }));
    const res = await request(app).post('/api/routines/exercises/1/sets').send({ set_number: 1, planned_weight: 80, planned_reps: 10 });
    expect(res.status).toBe(200);
    expect(res.body.set.planned_weight).toBe(80);
  });
});

describe('PUT /api/routines/sets/:set_id', () => {
  test('updates a routine set', async () => {
    const db = require('../config/database');
    db.query.mockReturnValueOnce(Promise.resolve({ rows: [{ id: 1, planned_weight: 90 }] }));
    const res = await request(app).put('/api/routines/sets/1').send({ planned_weight: 90 });
    expect(res.status).toBe(200);
    expect(res.body.set.planned_weight).toBe(90);
  });
});
