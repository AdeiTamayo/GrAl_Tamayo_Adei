const { Pool, types } = require('pg');
const { requireVar } = require('./env');

types.setTypeParser(1082, (val) => val);

const pool = new Pool({
    host: requireVar('DB_HOST'),
    port: requireVar('DB_PORT'),
    database: requireVar('DB_NAME'),
    user: requireVar('DB_USER'),
    password: requireVar('DB_PASSWORD'),
});

pool.on('connect', () => {
    console.log('[Database] Connected to PostgreSQL');
});

pool.on('error', (err) => {
    console.error('[Database] Unexpected error on idle client:', err);
});

module.exports = pool;
