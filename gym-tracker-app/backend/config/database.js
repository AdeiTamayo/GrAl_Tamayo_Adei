const { Pool } = require('pg');

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'gym_tracker_db',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '12345678',
});

pool.on('connect', () => {
    console.log('[Database] Connected to PostgreSQL');
});

pool.on('error', (err) => {
    console.error('[Database] Unexpected error:', err);
    process.exit(-1);
});

module.exports = pool;