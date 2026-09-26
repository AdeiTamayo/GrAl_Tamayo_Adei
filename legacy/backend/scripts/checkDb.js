const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const supabase = require('../config/database');

async function checkConnection() {
    const { data, error } = await supabase.from('exercises').select('id').limit(1);

    if (error) {
        console.log(`NOT CONNECTED - ${error.message}`);
        process.exitCode = 1;
    } else {
        console.log(`CONNECTED - sample row: ${JSON.stringify(data)}`);
    }

    supabase.realtime.disconnect();
}

checkConnection();
