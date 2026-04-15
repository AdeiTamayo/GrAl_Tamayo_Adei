const pool = require('../config/database');

class PR {
    // Get the absolute best PR for each exercise the user has performed
    static async getPrSummary(userId) {
        try {
            // DISTINCT ON gets the top row for each exercise_id
            // ORDER BY defines what "top" means: highest weight, then highest reps
            const query = `
                SELECT DISTINCT ON (p.exercise_id)
                    p.id, 
                    p.exercise_id, 
                    e.name AS exercise_name, 
                    p.weight, 
                    p.repetitions, 
                    p.date, 
                    p.note
                FROM pr p
                JOIN exercises e ON p.exercise_id = e.id
                WHERE p.user_id = $1
                ORDER BY p.exercise_id, p.weight DESC, p.repetitions DESC, p.date DESC;
            `;
            const result = await pool.query(query, [userId]);
            return result.rows;
        } catch (error) {
            console.error('[PR Model] Error fetching PR summary:', error.message);
            throw error;
        }
    }

    // Get the history of PRs for a specific exercise
    static async getPrHistory(userId, exerciseId) {
        try {
            const query = `
                SELECT id, weight, repetitions, date, note
                FROM pr
                WHERE user_id = $1 AND exercise_id = $2
                ORDER BY date DESC;
            `;
            const result = await pool.query(query, [userId, exerciseId]);
            return result.rows;
        } catch (error) {
            console.error('[PR Model] Error fetching PR history:', error.message);
            throw error;
        }
    }

    // Creates a PR if it's better than the current max (Called automatically when a set is added)
    static async checkAndLogPR(userId, exerciseId, weight, repetitions, date, note = null) {
        try {
            // Get current best PR
            const currentPrQuery = `
                SELECT weight, repetitions 
                FROM pr 
                WHERE user_id = $1 AND exercise_id = $2
                ORDER BY weight DESC, repetitions DESC 
                LIMIT 1;
            `;
            const currentPrResult = await pool.query(currentPrQuery, [userId, exerciseId]);

            let isNewPr = false;

            if (currentPrResult.rowCount === 0) {
                isNewPr = true; // First time doing this exercise
            } else {
                const current = currentPrResult.rows[0];
                if (weight > current.weight) {
                    isNewPr = true; // Heavier weight
                } else if (Number(weight) === Number(current.weight) && repetitions > current.repetitions) {
                    isNewPr = true; // Same weight, more reps
                }
            }

            if (isNewPr) {
                const prDate = date || new Date().toISOString().split('T')[0];
                const insertQuery = `
                    INSERT INTO pr (user_id, exercise_id, weight, repetitions, date, note)
                    VALUES ($1, $2, $3, $4, $5, $6)
                    RETURNING *;
                `;
                const insertResult = await pool.query(insertQuery, [userId, exerciseId, weight, repetitions, prDate, note]);
                return insertResult.rows[0];
            }

            return null; // Was not a PR
        } catch (error) {
            console.error('[PR Model] Error checking/logging PR:', error.message);
            throw error;
        }
    }

    // Manual manual PR creation (if you have a form for it)
    static async createPR(userId, exerciseId, weight, repetitions, date, note) {
        try {
            const prDate = date || new Date().toISOString().split('T')[0];
            const query = `
                INSERT INTO pr (user_id, exercise_id, weight, repetitions, date, note)
                VALUES ($1, $2, $3, $4, $5, $6)
                RETURNING *;
            `;
            const result = await pool.query(query, [userId, exerciseId, weight, repetitions, prDate, note]);
            return result.rows[0];
        } catch (error) {
            console.error('[PR Model] Error creating PR:', error.message);
            throw error;
        }
    }
}

module.exports = PR;