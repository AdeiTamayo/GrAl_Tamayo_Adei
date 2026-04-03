const pool = require('../config/database');

class Exercise {
    /**
     * Get exercise by ID
     */
    static async getExerciseById(id) {
        try {
            const query = `
                SELECT 
                    id, 
                    name, 
                    body_part AS "bodyPart", 
                    target_muscle AS "target", 
                    equipment, 
                    difficulty, 
                    category, 
                    description, 
                    secondary_muscles AS "secondaryMuscles", 
                    instructions 
                FROM exercises 
                WHERE id = $1
            `;
            const result = await pool.query(query, [id]);
            return result.rows[0] || null;
        } catch (error) {
            console.error('[Exercise Model] Error fetching exercise:', error.message);
            throw error;
        }
    }
}

module.exports = Exercise;