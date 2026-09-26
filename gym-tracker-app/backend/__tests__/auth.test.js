jest.mock('../config/database', () => {
  const { Pool } = require('pg');
  const pool = new Pool();
  pool.query = jest.fn();
  pool.connect = jest.fn();
  return pool;
});

const jwt = require('jsonwebtoken');

describe('Auth middleware (unit)', () => {
  let authMiddleware;
  let req, res;
  let db;

  beforeEach(() => {
    jest.resetModules();
    process.env.JWT_SECRET = 'test-secret';
    db = require('../config/database');
    db.query.mockReset();
    db.query.mockReturnValue(Promise.resolve({ rows: [{ '?column?': 1 }] }));
    authMiddleware = require('../middleware/auth');
    authMiddleware._clearUserCache();
    req = { headers: {} };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
  });

  afterEach(() => {
    delete process.env.JWT_SECRET;
  });

  test('returns 401 when no token provided', () => {
    authMiddleware(req, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ success: false, error: 'No token provided' });
  });

  test('returns 403 when token is invalid', () => {
    req.headers['authorization'] = 'Bearer invalid-token';
    authMiddleware(req, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ success: false, error: 'Invalid token' });
  });

  test('calls next() when token is valid', async () => {
    const token = jwt.sign({ userId: 1, email: 'test@example.com' }, 'test-secret');
    req.headers['authorization'] = `Bearer ${token}`;
    const next = jest.fn();
    await authMiddleware(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(req.userId).toBe(1);
    expect(req.userEmail).toBe('test@example.com');
  });

  test('extracts Bearer token from authorization header', async () => {
    const token = jwt.sign({ userId: 42, email: 'user@example.com' }, 'test-secret');
    req.headers['authorization'] = `Bearer ${token}`;
    const next = jest.fn();
    await authMiddleware(req, res, next);
    expect(req.userId).toBe(42);
    expect(req.userEmail).toBe('user@example.com');
  });

  test('returns 401 when the account behind the token no longer exists', async () => {
    db.query.mockReturnValue(Promise.resolve({ rows: [] }));
    const token = jwt.sign({ userId: 7, email: 'gone@example.com' }, 'test-secret');
    req.headers['authorization'] = `Bearer ${token}`;
    const next = jest.fn();
    await authMiddleware(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ success: false, error: 'Account no longer exists' });
    expect(next).not.toHaveBeenCalled();
  });

  test('fails closed (500) when the account lookup errors', async () => {
    db.query.mockReturnValue(Promise.reject(new Error('db down')));
    const token = jwt.sign({ userId: 8, email: 'x@example.com' }, 'test-secret');
    req.headers['authorization'] = `Bearer ${token}`;
    const next = jest.fn();
    await authMiddleware(req, res, next);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(next).not.toHaveBeenCalled();
  });

  test('caches the account lookup for subsequent requests', async () => {
    const token = jwt.sign({ userId: 9, email: 'y@example.com' }, 'test-secret');
    req.headers['authorization'] = `Bearer ${token}`;
    await authMiddleware(req, res, jest.fn());
    db.query.mockClear();
    await authMiddleware(req, res, jest.fn());
    expect(db.query).not.toHaveBeenCalled();
  });
});
