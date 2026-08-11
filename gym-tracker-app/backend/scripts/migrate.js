const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const supabase = require('../config/database');

async function runMigrations() {
    const migrationsDir = path.join(__dirname, '../migrations');
    const files = fs.readdirSync(migrationsDir)
        .filter(f => f.endsWith('.sql'))
        .sort();

    console.log(`Found ${files.length} migration files`);

    // Raw SQL (DDL) cannot run through supabase-js / PostgREST.
    // Migrations must be applied via the Supabase SQL editor.
    console.error('');
    console.error('Migrations cannot be executed from this script while using Supabase.');
    console.error('Open the Supabase Dashboard -> SQL Editor and run each file in order:');
    for (const file of files) {
        console.error(`  - backend/migrations/${file}`);
    }
    console.error('');
    console.error('Alternatively, use the Supabase CLI: supabase db push');
    process.exit(1);
}

runMigrations();
