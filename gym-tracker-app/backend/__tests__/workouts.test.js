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

const mockWorkout = { id: 1, name: 'Push Day', date: '2024-01-15', note: 'Great pump', user_id: 1 };
const mockExercise = { id: 1, name: 'Bench Press', body_part: 'Chest' };
const mockSet = { id: 1, weight: 80, repetitions: 10, rpe: 8 };

let app;

beforeEach(() => {
  jest.resetModules();
  const db = require('../config/database');
  db.query.mockReset();
  db.query.mockReturnValue(Promise.resolve({ rows: [] }));
  app = require('../server');
});

describe('GET /api/workouts', () => {
  test('returns list of workouts', async () => {
    const db = require('../config/database');
    db.query.mockReturnValueOnce(Promise.resolve({ rows: [mockWorkout] }));
    const res = await request(app).get('/api/workouts');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].name).toBe('Push Day');
  });
});

describe('GET /api/workouts/:id', () => {
  test('returns a workout by id', async () => {
    const db = require('../config/database');
    db.query.mockReturnValueOnce(Promise.resolve({ rows: [mockWorkout] }));
    const res = await request(app).get('/api/workouts/1');
    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe('Push Day');
  });

  test('returns 404 for non-existent workout', async () => {
    const db = require('../config/database');
    db.query.mockReturnValueOnce(Promise.resolve({ rows: [] }));
    const res = await request(app).get('/api/workouts/999');
    expect(res.status).toBe(404);
  });
});

describe('POST /api/workouts', () => {
  test('creates a new workout', async () => {
    const db = require('../config/database');
    db.query.mockReturnValueOnce(Promise.resolve({ rows: [mockWorkout] }));
    const res = await request(app).post('/api/workouts').send({ name: 'Push Day', date: '2024-01-15' });
    expect(res.status).toBe(201);
    expect(res.body.data.name).toBe('Push Day');
  });
});

describe('PUT /api/workouts/:id', () => {
  test('updates a workout', async () => {
    const db = require('../config/database');
    db.query.mockReturnValueOnce(Promise.resolve({ rows: [{ ...mockWorkout, name: 'Pull Day' }] }));
    const res = await request(app).put('/api/workouts/1').send({ name: 'Pull Day' });
    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe('Pull Day');
  });
});

describe('DELETE /api/workouts/:id', () => {
  test('deletes a workout', async () => {
    const db = require('../config/database');
    db.query.mockReturnValueOnce(Promise.resolve({ rowCount: 1, rows: [{ id: 1 }] }));
    const res = await request(app).delete('/api/workouts/1');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test('returns 404 when deleting non-existent workout', async () => {
    const db = require('../config/database');
    db.query.mockReturnValueOnce(Promise.resolve({ rowCount: 0, rows: [] }));
    const res = await request(app).delete('/api/workouts/999');
    expect(res.status).toBe(404);
  });
});

describe('POST /api/workouts/:id/exercises', () => {
  test('adds exercise to workout', async () => {
    const db = require('../config/database');
    db.query.mockReturnValueOnce(Promise.resolve({ rows: [{ id: 10, workout_id: 1, exercise_id: 5 }] }));
    const res = await request(app).post('/api/workouts/1/exercises').send({ exercise_id: 5 });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
  });
});

describe('POST /api/workouts/exercises/:workoutExerciseId/sets', () => {
  test('adds a set to a workout exercise', async () => {
    const db = require('../config/database');
    db.query
      .mockReturnValueOnce(Promise.resolve({ rows: [{ next_set: 1 }] }))
      .mockReturnValueOnce(Promise.resolve({ rows: [mockSet] }))
      .mockReturnValueOnce(Promise.resolve({ rows: [{ exercise_id: 1 }] }))
      .mockReturnValueOnce(Promise.resolve({ rows: [] }));
    const res = await request(app).post('/api/workouts/exercises/1/sets').send({ weight: 80, reps: 10 });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.weight).toBe(80);
  });
});

describe('PUT /api/workouts/sets/:setId', () => {
  test('updates a set', async () => {
    const db = require('../config/database');
    db.query.mockReturnValueOnce(Promise.resolve({ rows: [{ ...mockSet, weight: 85 }] }));
    const res = await request(app).put('/api/workouts/sets/1').send({ weight: 85, reps: 8 });
    expect(res.status).toBe(200);
    expect(res.body.data.weight).toBe(85);
  });
});

describe('DELETE /api/workouts/sets/:setId', () => {
  test('deletes a set', async () => {
    const db = require('../config/database');
    db.query.mockReturnValueOnce(Promise.resolve({ rowCount: 1, rows: [{ id: 1 }] }));
    const res = await request(app).delete('/api/workouts/sets/1');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

describe('DELETE /api/workouts/exercises/:workoutExerciseId', () => {
  test('deletes an exercise from workout', async () => {
    const db = require('../config/database');
    db.query.mockReturnValueOnce(Promise.resolve({ rowCount: 1, rows: [{ id: 1 }] }));
    const res = await request(app).delete('/api/workouts/exercises/1');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});
