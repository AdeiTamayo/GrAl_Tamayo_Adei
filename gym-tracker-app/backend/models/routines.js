const pool = require('../config/database');

class Routine {

    static async getUserRoutines(userId) {
        try {
            const query = `SELECT id, name, note FROM routines WHERE user_id = $1 ORDER BY id DESC;`;
            const result = await pool.query(query, [userId]);
            return result.rows;
        } catch (error) {
            console.error('[Routine Model] Error getting user routines:', error);
            throw error;
        }
    }

    static async getRoutineById(routineId, userId) {
        try {
            const routineQuery = `SELECT id, name, note FROM routines WHERE id = $1 AND user_id = $2;`;
            const routineResult = await pool.query(routineQuery, [routineId, userId]);

            if (routineResult.rows.length === 0) return null;
            const routine = routineResult.rows[0];

            const exercisesQuery = `
                SELECT 
                    re.id AS item_id, 
                    re.exercise_order, 
                    re.planned_sets, 
                    re.planned_reps, 
                    re.planned_weight, 
                    re.note,
                    e.id AS exercise_id, 
                    e.name AS exercise_name, 
                    e.body_part, 
                    e.equipment
                FROM routine_exercises re
                JOIN exercises e ON re.exercise_id = e.id
                WHERE re.routine_id = $1
                ORDER BY re.exercise_order ASC;
            `;
            const exercisesResult = await pool.query(exercisesQuery, [routineId]);

            routine.exercises = exercisesResult.rows;
            return routine;
        } catch (error) {
            console.error('[Routine Model] Error getting routine by id:', error);
            throw error;
        }
    }

    static async createRoutine(userId, name) {
        try {
            const query = `
                INSERT INTO routines (user_id, name) 
                VALUES ($1, $2) 
                RETURNING id, name, note;
            `;
            const result = await pool.query(query, [userId, name]);
            return result.rows[0];
        } catch (error) {
            console.error('[Routine Model] Error creating routine:', error);
            throw error;
        }
    }

    static async updateRoutine(routineId, userId, name, note) {
        try {
            const query = `
                UPDATE routines 
                SET name = COALESCE($3, name), note = COALESCE($4, note)
                WHERE id = $1 AND user_id = $2
                RETURNING id, name, note;
            `;
            const result = await pool.query(query, [routineId, userId, name, note]);
            return result.rows[0];
        } catch (error) {
            console.error('[Routine Model] Error updating routine:', error);
            throw error;
        }
    }

    static async deleteRoutine(routineId, userId) {
        try {
            const query = `DELETE FROM routines WHERE id = $1 AND user_id = $2 RETURNING id;`;
            const result = await pool.query(query, [routineId, userId]);
            return result.rowCount > 0;
        } catch (error) {
            console.error('[Routine Model] Error deleting routine:', error);
            throw error;
        }
    }

    static async addExerciseToRoutine(routineId, userId, exercise_id, exercise_order, planned_sets, planned_reps, planned_weight, note) {
        try {
            // First, ensure the routine belongs to the user
            const routineCheck = await pool.query(`SELECT id FROM routines WHERE id = $1 AND user_id = $2`, [routineId, userId]);
            if (routineCheck.rowCount === 0) return null;

            const query = `
                INSERT INTO routine_exercises 
                (routine_id, exercise_id, exercise_order, planned_sets, planned_reps, planned_weight, note)
                VALUES ($1, $2, $3, $4, $5, $6, $7)
                RETURNING *;
            `;
            const values = [routineId, exercise_id, exercise_order, planned_sets, planned_reps, planned_weight, note];
            const result = await pool.query(query, values);
            return result.rows[0];
        } catch (error) {
            console.error('[Routine Model] Error adding exercise to routine:', error);
            throw error;
        }
    }

    static async updateRoutineExercise(itemId, userId, exercise_order, planned_sets, planned_reps, planned_weight, note) {
        try {
            const query = `
                UPDATE routine_exercises re
                SET 
                    exercise_order = COALESCE($3, exercise_order),
                    planned_sets = COALESCE($4, planned_sets), 
                    planned_reps = COALESCE($5, planned_reps), 
                    planned_weight = COALESCE($6, planned_weight), 
                    note = COALESCE($7, note)
                FROM routines r
                WHERE re.routine_id = r.id AND re.id = $1 AND r.user_id = $2
                RETURNING re.*;
            `;
            const values = [itemId, userId, exercise_order, planned_sets, planned_reps, planned_weight, note];
            const result = await pool.query(query, values);
            return result.rows[0];
        } catch (error) {
            console.error('[Routine Model] Error updating routine exercise:', error);
            throw error;
        }
    }

    static async removeExerciseFromRoutine(itemId, userId) {
        try {
            const query = `
                DELETE FROM routine_exercises re
                USING routines r
                WHERE re.routine_id = r.id AND re.id = $1 AND r.user_id = $2
                RETURNING re.id;
            `;
            const result = await pool.query(query, [itemId, userId]);
            return result.rowCount > 0;
        } catch (error) {
            console.error('[Routine Model] Error removing exercise from routine:', error);
            throw error;
        }
    }
}

module.exports = Routine;