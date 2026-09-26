const { REQUIRED_VARS, getMissingVars, validateEnv, requireVar } = require('../config/env');

describe('Config: environment variables', () => {
  const saved = {};

  beforeEach(() => {
    REQUIRED_VARS.forEach((name) => { saved[name] = process.env[name]; });
  });

  afterEach(() => {
    REQUIRED_VARS.forEach((name) => {
      if (saved[name] === undefined) delete process.env[name];
      else process.env[name] = saved[name];
    });
  });

  test('getMissingVars lists every variable that is not set', () => {
    REQUIRED_VARS.forEach((name) => delete process.env[name]);
    expect(getMissingVars()).toEqual(REQUIRED_VARS);
  });

  test('getMissingVars reports only the unset variables', () => {
    REQUIRED_VARS.forEach((name) => { process.env[name] = 'value'; });
    delete process.env.JWT_SECRET;
    expect(getMissingVars()).toEqual(['JWT_SECRET']);
  });

  test('validateEnv passes when everything is configured', () => {
    REQUIRED_VARS.forEach((name) => { process.env[name] = 'value'; });
    expect(() => validateEnv()).not.toThrow();
  });

  test('validateEnv throws and names the missing variables', () => {
    REQUIRED_VARS.forEach((name) => { process.env[name] = 'value'; });
    delete process.env.DB_PASSWORD;
    delete process.env.DB_NAME;

    expect(() => validateEnv()).toThrow(/DB_NAME, DB_PASSWORD/);
    expect(() => validateEnv()).toThrow(/Missing required environment variables/);
  });

  test('requireVar returns the value when set', () => {
    process.env.DB_NAME = 'gym_tracker';
    expect(requireVar('DB_NAME')).toBe('gym_tracker');
  });

  test('requireVar throws a descriptive error when unset', () => {
    delete process.env.DB_NAME;
    expect(() => requireVar('DB_NAME')).toThrow(/Missing required environment variable: DB_NAME/);
  });
});
