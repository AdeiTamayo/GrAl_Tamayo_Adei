const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
require('../config/database');

async function runMigrations() {
    // Raw SQL (DDL) cannot run through supabase-js / PostgREST.
    // The schema must be applied via the Supabase SQL editor.
    console.error('');
    console.error('Migrations cannot be executed from this script while using Supabase.');
    console.error('Open the Supabase Dashboard -> SQL Editor and run the schema file:');
    console.error('  - backend/migrations/schema.sql');
    console.error('');
    console.error('Alternatively, use the Supabase CLI: supabase db push');
    process.exit(1);
}

runMigrations();
