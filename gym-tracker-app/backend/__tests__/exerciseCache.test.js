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

const mockExercises = [{ id: 1, name: 'Bench Press' }];

let app;
let db;

beforeEach(() => {
  jest.resetModules();
  db = require('../config/database');
  db.query.mockReset();
  db.query.mockReturnValue(Promise.resolve({ rows: [] }));
  // The cache is module state, so start every test from a cold cache.
  require('../utils/exerciseCache').invalidateExercisesCache();
  app = require('../server');
});

describe('GET /api/exercises caching', () => {
  test('serves the second unpaginated request from the cache', async () => {
    db.query
      .mockReturnValueOnce(Promise.resolve({ rows: [{ total: '1' }] }))
      .mockReturnValueOnce(Promise.resolve({ rows: mockExercises }));

    const first = await request(app).get('/api/exercises');
    expect(first.status).toBe(200);
    expect(first.body.data).toHaveLength(1);
    expect(db.query).toHaveBeenCalledTimes(2);

    const second = await request(app).get('/api/exercises');
    expect(second.status).toBe(200);
    expect(second.body.data).toEqual(first.body.data);
    // No further queries: both reads came from the first one.
    expect(db.query).toHaveBeenCalledTimes(2);
  });

  test('does not cache paginated requests', async () => {
    db.query.mockReturnValue(Promise.resolve({ rows: [{ total: '1' }] }));

    await request(app).get('/api/exercises?page=1&limit=10');
    await request(app).get('/api/exercises?page=2&limit=10');

    expect(db.query).toHaveBeenCalledTimes(4);
  });

  test('creating an exercise invalidates the cache', async () => {
    db.query
      .mockReturnValueOnce(Promise.resolve({ rows: [{ total: '1' }] }))
      .mockReturnValueOnce(Promise.resolve({ rows: mockExercises }));

    await request(app).get('/api/exercises');
    expect(db.query).toHaveBeenCalledTimes(2);

    db.query.mockReturnValueOnce(Promise.resolve({ rows: [{ id: 2, name: 'Deadlift' }] }));
    const created = await request(app).post('/api/exercises').send({ exercice_name: 'Deadlift' });
    expect(created.status).toBe(201);

    // The next read must hit the database again to observe the new exercise.
    db.query
      .mockReturnValueOnce(Promise.resolve({ rows: [{ total: '2' }] }))
      .mockReturnValueOnce(Promise.resolve({ rows: [...mockExercises, { id: 2, name: 'Deadlift' }] }));

    const afterWrite = await request(app).get('/api/exercises');
    expect(afterWrite.body.data).toHaveLength(2);
  });

  test('deleting an exercise invalidates the cache', async () => {
    db.query
      .mockReturnValueOnce(Promise.resolve({ rows: [{ total: '1' }] }))
      .mockReturnValueOnce(Promise.resolve({ rows: mockExercises }));

    await request(app).get('/api/exercises');

    db.query.mockReturnValueOnce(Promise.resolve({ rowCount: 1, rows: [{ id: 1 }] }));
    const deleted = await request(app).delete('/api/exercises/1');
    expect(deleted.status).toBe(200);

    expect(require('../utils/exerciseCache').getCachedExercises()).toBeNull();
  });

  test('modifying an exercise invalidates the cache', async () => {
    db.query.mockReturnValueOnce(Promise.resolve({ rows: [{ id: 1, name: 'Bench Press' }] }));

    await request(app).get('/api/exercises');

    db.query.mockReturnValueOnce(Promise.resolve({ rows: [{ id: 1, name: 'Incline Bench Press' }] }));
    const modified = await request(app).put('/api/exercises/1').send({ exercice_name: 'Incline Bench Press' });
    expect(modified.status).toBe(200);

    expect(require('../utils/exerciseCache').getCachedExercises()).toBeNull();
  });
});

describe('POST /api/exercises validation', () => {
  test('returns 400 when the name is missing', async () => {
    const res = await request(app).post('/api/exercises').send({ body_part: 'Chest' });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });
});
