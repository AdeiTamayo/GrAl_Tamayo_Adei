const jwt = require('jsonwebtoken');

describe('Auth middleware (unit)', () => {
  let authMiddleware;
  let req, res;

  beforeEach(() => {
    jest.resetModules();
    process.env.JWT_SECRET = 'test-secret';
    authMiddleware = require('../middleware/auth');
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

  test('calls next() when token is valid', () => {
    const token = jwt.sign({ userId: 1, email: 'test@example.com' }, 'test-secret');
    req.headers['authorization'] = `Bearer ${token}`;
    const next = jest.fn();
    authMiddleware(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(req.userId).toBe(1);
    expect(req.userEmail).toBe('test@example.com');
  });

  test('extracts Bearer token from authorization header', () => {
    const token = jwt.sign({ userId: 42, email: 'user@example.com' }, 'test-secret');
    req.headers['authorization'] = `Bearer ${token}`;
    const next = jest.fn();
    authMiddleware(req, res, next);
    expect(req.userId).toBe(42);
    expect(req.userEmail).toBe('user@example.com');
  });
});
