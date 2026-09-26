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

const mockExercises = [
  { id: 1, name: 'Bench Press', bodyPart: 'Chest', target: 'Pectorals', equipment: 'Barbell', difficulty: 'Intermediate', category: 'Strength', is_custom: false },
  { id: 2, name: 'Squat', bodyPart: 'Legs', target: 'Quadriceps', equipment: 'Barbell', difficulty: 'Intermediate', category: 'Strength', is_custom: false },
];

const mockExercise = {
  id: 1, name: 'Bench Press', bodyPart: 'Chest', target: 'Pectorals',
  equipment: 'Barbell', difficulty: 'Intermediate', category: 'Strength',
  description: 'Lie on a bench and press the bar up', secondary_muscles: 'Triceps',
  instructions: 'Lie down, grip bar, lower to chest, press up',
};

const mockHistory = [
  { date: '2024-01-01', workout_name: 'Push Day', max_weight: 80, total_volume: 240, max_reps: 10 },
];

let app;

beforeEach(() => {
  jest.resetModules();
  const db = require('../config/database');
  db.query.mockReset();
  db.query.mockReturnValue(Promise.resolve({ rows: [] }));
  app = require('../server');
});

describe('GET /api/exercises', () => {
  test('returns list of exercises with pagination', async () => {
    const db = require('../config/database');
    db.query
      .mockReturnValueOnce(Promise.resolve({ rows: [{ total: '2' }] }))
      .mockReturnValueOnce(Promise.resolve({ rows: mockExercises }));

    const res = await request(app).get('/api/exercises?page=1&limit=10');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveLength(2);
    expect(res.body.total).toBe(2);
    expect(res.body.data[0].name).toBe('Bench Press');
  });

  test('returns exercises without pagination params', async () => {
    const db = require('../config/database');
    db.query
      .mockReturnValueOnce(Promise.resolve({ rows: [{ total: '2' }] }))
      .mockReturnValueOnce(Promise.resolve({ rows: mockExercises }));

    const res = await request(app).get('/api/exercises');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveLength(2);
  });

  test('returns empty list when no exercises found', async () => {
    const db = require('../config/database');
    db.query
      .mockReturnValueOnce(Promise.resolve({ rows: [{ total: '0' }] }))
      .mockReturnValueOnce(Promise.resolve({ rows: [] }));

    const res = await request(app).get('/api/exercises');
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
    expect(res.body.total).toBe(0);
  });
});

describe('GET /api/exercises/:id', () => {
  test('returns an exercise by id', async () => {
    const db = require('../config/database');
    db.query.mockReturnValueOnce(Promise.resolve({ rows: [mockExercise] }));

    const res = await request(app).get('/api/exercises/1');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe('Bench Press');
  });

  test('returns 404 for non-existent exercise', async () => {
    const db = require('../config/database');
    db.query.mockReturnValueOnce(Promise.resolve({ rows: [] }));

    const res = await request(app).get('/api/exercises/999');
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });
});

describe('GET /api/exercises/filters', () => {
  test('returns filter options', async () => {
    const db = require('../config/database');
    db.query
      .mockReturnValueOnce(Promise.resolve({ rows: [{ name: 'Barbell' }, { name: 'Dumbbell' }] }))
      .mockReturnValueOnce(Promise.resolve({ rows: [{ name: 'Chest' }, { name: 'Back' }] }))
      .mockReturnValueOnce(Promise.resolve({ rows: [{ name: 'Strength' }, { name: 'Cardio' }] }));

    const res = await request(app).get('/api/exercises/filters');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.equipment).toEqual(['Barbell', 'Dumbbell']);
    expect(res.body.data.muscles).toEqual(['Chest', 'Back']);
    expect(res.body.data.categoryType).toEqual(['Strength', 'Cardio']);
  });
});

describe('POST /api/exercises', () => {
  test('creates a new exercise', async () => {
    const db = require('../config/database');
    db.query.mockReturnValueOnce(Promise.resolve({ rows: [{ id: 3, name: 'Deadlift', body_part: 'Back' }] }));

    const res = await request(app)
      .post('/api/exercises')
      .send({
        exercice_name: 'Deadlift',
        body_part: 'Back',
        target_muscle: 'Hamstrings',
        equipment: 'Barbell',
        difficulty: 'Intermediate',
        category: 'Strength',
      });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe('Deadlift');
  });

  test('returns 500 when creation fails', async () => {
    const db = require('../config/database');
    db.query.mockReturnValueOnce(Promise.reject(new Error('DB error')));

    const res = await request(app)
      .post('/api/exercises')
      .send({ exercice_name: 'Bad Exercise' });
    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
  });
});

describe('PUT /api/exercises/:id', () => {
  test('modifies an existing exercise', async () => {
    const db = require('../config/database');
    db.query.mockReturnValueOnce(Promise.resolve({ rows: [{ ...mockExercise, name: 'Incline Bench Press' }] }));

    const res = await request(app)
      .put('/api/exercises/1')
      .send({ exercice_name: 'Incline Bench Press' });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe('Incline Bench Press');
  });
});

describe('DELETE /api/exercises/:id', () => {
  test('deletes an exercise', async () => {
    const db = require('../config/database');
    db.query.mockReturnValueOnce(Promise.resolve({ rowCount: 1 }));

    const res = await request(app).delete('/api/exercises/1');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

describe('GET /api/exercises/:id/history', () => {
  test('returns exercise history', async () => {
    const db = require('../config/database');
    db.query.mockReturnValueOnce(Promise.resolve({ rows: mockHistory, rowCount: 1 }));

    const res = await request(app).get('/api/exercises/1/history');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveLength(1);
  });

  test('returns 400 for invalid exercise id', async () => {
    const res = await request(app).get('/api/exercises/abc/history');
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });
});
