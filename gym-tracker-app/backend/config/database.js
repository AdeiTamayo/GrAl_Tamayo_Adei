const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    host: 'localhost',//process.env.DB_HOST,
    port: 5432,//process.env.DB_PORT,
    database: 'gym_tracker_db',//process.env.DB_NAME,
    user: 'postgres', //process.env.DB_USER,
    password: '12345678',//process.env.DB_PASSWORD,
});

pool.on('connect', () => {
    console.log('[Database] Connected to PostgreSQL');
});

pool.on('error', (err) => {
    console.error('[Database] Unexpected error:', err);
    process.exit(-1);
});

module.exports = pool;