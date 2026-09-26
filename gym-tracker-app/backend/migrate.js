const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { validateEnv } = require('./config/env');

const MIGRATIONS_TABLE = 'schema_migrations';

/**
 * Migrations are recorded by filename so re-running the script is safe: only
 * files that have never been applied are executed. This matters because several
 * migrations here are not idempotent (e.g. `CREATE TYPE`, `ALTER COLUMN TYPE`).
 */
async function ensureMigrationsTable(pool) {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS ${MIGRATIONS_TABLE} (
            filename   VARCHAR(255) PRIMARY KEY,
            applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
    `);
}

async function getAppliedMigrations(pool) {
    const result = await pool.query(`SELECT filename FROM ${MIGRATIONS_TABLE};`);
    return new Set(result.rows.map((row) => row.filename));
}

function getPendingMigrations(applied, files) {
    return files.filter((file) => !applied.has(file));
}

async function runMigrations(pool, { log = console.log } = {}) {
    validateEnv();

    const migrationsDir = path.join(__dirname, 'migrations');
    const files = fs.readdirSync(migrationsDir)
        .filter((file) => file.endsWith('.sql'))
        .sort();

    await ensureMigrationsTable(pool);
    const applied = await getAppliedMigrations(pool);
    const pending = getPendingMigrations(applied, files);

    log(`Found ${files.length} migration files, ${pending.length} pending`);

    for (const file of pending) {
        const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
        log(`Running migration: ${file}`);
        await pool.query(sql);
        await pool.query(`INSERT INTO ${MIGRATIONS_TABLE} (filename) VALUES ($1);`, [file]);
        log(`  Done: ${file}`);
    }

    log(pending.length === 0
        ? '\nDatabase is already up to date'
        : '\nAll migrations completed successfully');
}

module.exports = { runMigrations, ensureMigrationsTable, getAppliedMigrations, getPendingMigrations };

if (require.main === module) {
    const pool = require('./config/database');
    runMigrations(pool)
        .then(() => process.exit(0))
        .catch((err) => {
            console.error('Migration failed:', err.message);
            process.exit(1);
        });
}
