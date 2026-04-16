const pool = require('../config/database');

class Exercise {
    static async getExercises() {
        try {
            const query = `
                SELECT
                    id,
                    name,
                    body_part,
                    target_muscle,
                    secondary_muscles,
                    equipment,
                    difficulty,
                    category,
                    is_custom
                FROM exercises
                ORDER BY name ASC;
            `;
            const result = await pool.query(query);
            return result.rows;
        } catch (error) {
            console.error('[Exercise Model] Error fetching exercises list:', error.message);
            throw error;
        }
    }


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
                    secondary_muscles, 
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

    static async createExercise(exercice_name, body_part, target_muscle, secondary_muscles, equipment, difficulty, category, description, instructions) {
        try {
            const query = `
                INSERT INTO exercises (
                name, 
                body_part,
                target_muscle,
                secondary_muscles,
                equipment,
                difficulty,
                category,
                description,
                instructions, 
                is_custom
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, true)
                RETURNING *;            
            `;

            const values = [exercice_name, body_part, target_muscle, secondary_muscles, equipment, difficulty, category, description, instructions]
            const result = await pool.query(query, values);
            return result.rows[0];
        } catch (error) {
            console.error('[Exercise Model] Error creating exercise:', error.message);
            throw error;
        }

    }

    static async modifyExercise(id, exercice_name, body_part, target_muscle, secondary_muscles, equipment, difficulty, category, description, instructions) {
        try {
            const query = `
            UPDATE exercises
                SET
                    name = $1,
                    body_part = $2,
                    target_muscle = $3,
                    secondary_muscles = $4,
                    equipment = $5,
                    difficulty = $6,
                    category = $7,
                    description = $8,
                    instructions = $9
                WHERE id = $10 AND is_custom = true
                RETURNING *;
            
            `;

            const values = [
                exercice_name,
                body_part,
                target_muscle,
                secondary_muscles,
                equipment,
                difficulty,
                category,
                description,
                instructions,
                id
            ];

            const result = await pool.query(query, values);
            return result.rows[0];

        } catch (error) {
            console.error('[Exercise Model] Error modifying exercise:', error.message);
            throw error;
        }
    }

    static async deleteExercise(id) {

        try {
            const query = `
                DELETE FROM exercises
                WHERE ID = $1
                RETURNING id;
            `;

            const result = await pool.query(query, [id]);
            return result.rowCount > 0;
        } catch (error) {
            console.error('[Exercise Model] Error deleting exercise:', error.message);
            throw error;
        }
    }

    static async getFilterOptions() {
        const equipmentQuery = `SELECT DISTINCT equipment AS name FROM exercises WHERE equipment IS NOT NULL AND equipment != '' ORDER BY equipment`;
        const targetMusclesQuery = `SELECT DISTINCT target_muscle AS name FROM exercises WHERE target_muscle IS NOT NULL AND target_muscle != '' ORDER BY name`;
        const categoryTypeQuery = `SELECT DISTINCT category AS name FROM exercises WHERE category IS NOT NULL AND category != '' ORDER BY category`;

        try {
            const [equipmentRes, musclesRes, categoryTypeRes] = await Promise.all([
                pool.query(equipmentQuery),
                pool.query(targetMusclesQuery),
                pool.query(categoryTypeQuery)
            ]);

            return {
                equipment: equipmentRes.rows.map(row => row.name),
                muscles: musclesRes.rows.map(row => row.name),
                categoryType: categoryTypeRes.rows.map(row => row.name)
            };
        } catch (error) {
            console.error('[Exercise Model] Error fetching filter options:', error.message);
            throw error;
        }
    }

}

module.exports = Exercise;

