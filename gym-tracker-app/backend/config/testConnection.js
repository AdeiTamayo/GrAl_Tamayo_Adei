const pool = require('./database');

async function testConnection() {
    try {
        const result = await pool.query('SELECT NOW()');
        console.log('[Test] Connection successful!');
        console.log('[Test] Current time from DB:', result.rows[0]);
        process.exit(0);
    } catch (error) {
        console.error('[Test] Connection failed:', error.message);
        process.exit(1);
    }
}

testConnection();