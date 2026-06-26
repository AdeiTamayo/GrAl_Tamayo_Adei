const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const pool = require('./config/database');

async function runMigrations() {
    const migrationsDir = path.join(__dirname, 'migrations');
    const files = fs.readdirSync(migrationsDir)
        .filter(f => f.endsWith('.sql'))
        .sort();

    console.log(`Found ${files.length} migration files`);

    for (const file of files) {
        const filePath = path.join(migrationsDir, file);
        const sql = fs.readFileSync(filePath, 'utf8');

        console.log(`Running migration: ${file}`);
        try {
            await pool.query(sql);
            console.log(`  Done: ${file}`);
        } catch (err) {
            console.error(`  Failed: ${file}`);
            console.error(`  Error: ${err.message}`);
            throw err;
        }
    }

    console.log('\nAll migrations completed successfully');
}

runMigrations()
    .then(() => process.exit(0))
    .catch((err) => {
        console.error('Migration failed:', err.message);
        process.exit(1);
    });
