jest.mock('../config/database', () => ({
  query: jest.fn(),
}));

const fs = require('fs');
const path = require('path');
const { getPendingMigrations, getAppliedMigrations, runMigrations } = require('../migrate');
const { REQUIRED_VARS } = require('../config/env');

const MIGRATIONS = ['001_a.sql', '002_b.sql', '003_c.sql'];

const listMigrationFiles = () => fs.readdirSync(path.join(__dirname, '..', 'migrations'))
  .filter((file) => file.endsWith('.sql'))
  .sort();

let db;

/**
 * Answer the bookkeeping SELECT with `applied`, and every other statement with an
 * empty result. Matching on SQL rather than call order keeps the test honest
 * about what the migration runner actually does.
 */
function mockDatabase({ applied = [], failOn = null } = {}) {
  db.query.mockImplementation((sql) => {
    if (failOn && sql.includes(failOn)) {
      return Promise.reject(new Error('migration failed'));
    }
    if (sql.includes('SELECT filename FROM schema_migrations')) {
      return Promise.resolve({ rows: applied.map((filename) => ({ filename })) });
    }
    return Promise.resolve({ rows: [] });
  });
}

beforeEach(() => {
  db = require('../config/database');
  db.query.mockReset();
  mockDatabase();
  REQUIRED_VARS.forEach((name) => { process.env[name] = 'value'; });
});

afterEach(() => {
  REQUIRED_VARS.forEach((name) => { delete process.env[name]; });
});

describe('Migration tracking', () => {
  test('getAppliedMigrations returns the recorded filenames', async () => {
    mockDatabase({ applied: ['001_a.sql'] });
    const applied = await getAppliedMigrations(db);
    expect(applied.has('001_a.sql')).toBe(true);
    expect(applied.size).toBe(1);
  });

  test('getPendingMigrations skips files that were already applied', () => {
    const applied = new Set(['001_a.sql', '003_c.sql']);
    expect(getPendingMigrations(applied, MIGRATIONS)).toEqual(['002_b.sql']);
  });

  test('getPendingMigrations returns everything on a fresh database', () => {
    expect(getPendingMigrations(new Set(), MIGRATIONS)).toEqual(MIGRATIONS);
  });

  test('runMigrations executes only the pending files and records them', async () => {
    mockDatabase({ applied: ['001_create_users_table.sql'] });

    const log = jest.fn();
    await runMigrations(db, { log });

    const statements = db.query.mock.calls.map((call) => call[0]);
    // Each recorded migration is an INSERT carrying the filename as its parameter.
    const recorded = db.query.mock.calls
      .filter(([sql]) => sql.includes('INSERT INTO schema_migrations'))
      .map(([, params]) => params[0]);

    const everyFile = listMigrationFiles();

    expect(statements.some((sql) => sql.includes('CREATE TABLE IF NOT EXISTS schema_migrations'))).toBe(true);
    expect(recorded).not.toContain('001_create_users_table.sql');
    expect(recorded.sort()).toEqual(everyFile.filter((file) => file !== '001_create_users_table.sql'));
  });

  test('runMigrations does no work when the database is already up to date', async () => {
    mockDatabase({ applied: listMigrationFiles() });

    const log = jest.fn();
    await runMigrations(db, { log });

    const statements = db.query.mock.calls.map((call) => call[0]);
    expect(statements.filter((sql) => sql.includes('INSERT INTO schema_migrations'))).toHaveLength(0);
    expect(log).toHaveBeenCalledWith(expect.stringContaining('Database is already up to date'));
  });

  test('runMigrations stops and reports the error when a file fails', async () => {
    // 'show_goals' only appears in the last migration file.
    mockDatabase({ failOn: 'show_goals' });

    await expect(runMigrations(db, { log: jest.fn() })).rejects.toThrow('migration failed');

    // The failing file must not be recorded, so the next run retries it.
    const recorded = db.query.mock.calls
      .filter(([sql]) => sql.includes('INSERT INTO schema_migrations'))
      .map(([, params]) => params[0]);
    expect(recorded).not.toContain('010_add_workout_visibility_settings.sql');
  });

  test('runMigrations refuses to run without a complete environment', async () => {
    delete process.env.JWT_SECRET;
    await expect(runMigrations(db, { log: jest.fn() })).rejects.toThrow(/Missing required environment variables/);
    expect(db.query).not.toHaveBeenCalled();
  });
});
