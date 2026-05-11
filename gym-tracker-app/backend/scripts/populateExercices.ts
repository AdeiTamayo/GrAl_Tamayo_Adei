import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
import axios from 'axios';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const require = createRequire(import.meta.url);

// Helper function to prevent "Too Many Requests" (429) errors
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

dotenv.config({ path: path.resolve('PATH_TO_EnvFile') });

const pool = require('../config/database');

async function seedExercises(): Promise<void> {
    const apiKey = process.env.RAPIDAPI_KEY || process.env.RapidAPI_Key;
    if (!apiKey) throw new Error('RAPIDAPI_KEY is not set.');

    let offset = 0;
    const limit = 10; // Match what the API is actually returning per page
    let totalInserted = 0;
    let totalSkipped = 0;
    let hasMore = true;

    console.log('🚀 Starting full exercise sync...');

    while (hasMore) {
        try {
            console.log(`Fetching exercises starting from offset: ${offset}...`);

            const response = await axios.get("https://exercisedb.p.rapidapi.com/exercises", {
                params: {
                    limit: limit.toString(),
                    offset: offset.toString()
                },
                headers: {
                    'X-RapidAPI-Key': apiKey,
                    'X-RapidAPI-Host': 'exercisedb.p.rapidapi.com'
                }
            });

            const data = response.data;
            // The API might return an array directly or a { data: [] } object
            const exercises = Array.isArray(data) ? data : (data.data || []);

            if (exercises.length === 0) {
                console.log('✅ Reached the end of the API data.');
                hasMore = false;
                break;
            }

            for (const ex of exercises) {
                try {
                    await pool.query(
                        `INSERT INTO exercises 
                            (api_id, name, body_part, target_muscle, secondary_muscles, 
                             equipment, difficulty, category, description, instructions)
                         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                         ON CONFLICT (api_id) DO UPDATE 
                            SET name = EXCLUDED.name,
                                difficulty = EXCLUDED.difficulty,
                                category = EXCLUDED.category,
                                description = EXCLUDED.description,
                                instructions = EXCLUDED.instructions`,
                        [
                            ex.id,
                            ex.name,
                            ex.bodyPart || null,
                            ex.target || null,
                            ex.secondaryMuscles || [],
                            ex.equipment || null,
                            ex.difficulty || null,
                            ex.category || null,
                            ex.description || null,
                            ex.instructions || []
                        ]
                    );
                    totalInserted++;
                } catch (err) {
                    console.warn(`Skipped ${ex.id}: ${err.message}`);
                    totalSkipped++;
                }
            }

            console.log(`Successfully processed batch. Total so far: ${totalInserted}`);

            // Move to the next page based on how many we actually got
            offset += exercises.length;

            // IMPORTANT: If your API plan has a rate limit, we wait 1.5 seconds 
            // to ensure we don't get blocked.
            await sleep(1500);

        } catch (err) {
            if (err.response?.status === 429) {
                console.warn('⚠️ Rate limited! Waiting 5 seconds before trying again...');
                await sleep(5000);
            } else {
                console.error('Batch fetch failed:', err.response?.data || err.message);
                hasMore = false;
            }
        }
    }

    console.log(`\n✨ Finished! Total Sync: ${totalInserted}, Total Skipped: ${totalSkipped}`);
    await pool.end();
}

seedExercises();