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
                re.planned_time,
                re.note,
                e.id AS exercise_id,
                e.name AS exercise_name,
                e.body_part,
                e.equipment,
                COALESCE(
                    json_agg(
                        json_build_object(
                            'id', rs.id,
                            'set_number', rs.set_number,
                            'planned_weight', rs.planned_weight,
                            'planned_reps', rs.planned_reps,
                            'planned_time', rs.planned_time
                        )
                        ORDER BY rs.set_number
                    ) FILTER (WHERE rs.id IS NOT NULL),
                    '[]'::json
                ) AS sets
            FROM routine_exercises re
            JOIN exercises e ON re.exercise_id = e.id
            LEFT JOIN routine_sets rs ON rs.routine_exercise_id = re.id
            WHERE re.routine_id = $1
            GROUP BY re.id, e.id, e.name, e.body_part, e.equipment
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

    static async addExerciseToRoutine(routineId, userId, exercise_id, exercise_order, planned_sets, planned_reps, planned_weight, planned_time, note) {
        try {
            // First, ensure the routine belongs to the user
            const routineCheck = await pool.query(`SELECT id FROM routines WHERE id = $1 AND user_id = $2`, [routineId, userId]);
            if (routineCheck.rowCount === 0) return null;

            const query = `
                INSERT INTO routine_exercises 
                (routine_id, exercise_id, exercise_order, planned_sets, planned_reps, planned_weight, planned_time, note)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                RETURNING *;
            `;
            const values = [routineId, exercise_id, exercise_order, planned_sets, planned_reps, planned_weight, planned_time, note];
            const result = await pool.query(query, values);
            return result.rows[0];
        } catch (error) {
            console.error('[Routine Model] Error adding exercise to routine:', error);
            throw error;
        }
    }

    static async updateRoutineExercise(itemId, userId, exercise_order, planned_sets, planned_reps, planned_weight, planned_time, note) {
        try {
            const query = `
                UPDATE routine_exercises re
                SET 
                    exercise_order = COALESCE($3, exercise_order),
                    planned_sets = COALESCE($4, planned_sets), 
                    planned_reps = COALESCE($5, planned_reps), 
                    planned_weight = COALESCE($6, planned_weight), 
                    planned_time = COALESCE($7, planned_time),
                    note = COALESCE($8, note)
                FROM routines r
                WHERE re.routine_id = r.id AND re.id = $1 AND r.user_id = $2
                RETURNING re.*;
            `;
            const values = [itemId, userId, exercise_order, planned_sets, planned_reps, planned_weight, planned_time, note];
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

    // Insert a planned set into a routine exercise owned by the given user.
    // Returns null when the routine exercise does not exist or is not theirs.
    static async addSetToRoutineExercise(routineExerciseId, userId, setNumber, weight, reps, time) {
        try {
            const ownershipCheck = await pool.query(
                `SELECT re.id
                 FROM routine_exercises re
                 JOIN routines r ON re.routine_id = r.id
                 WHERE re.id = $1 AND r.user_id = $2`,
                [routineExerciseId, userId]
            );
            if (ownershipCheck.rows.length === 0) return null;

            const query = `
            INSERT INTO routine_sets (routine_exercise_id, set_number, planned_weight, planned_reps, planned_time) 
            VALUES ($1, $2, $3, $4, $5) RETURNING *;
        `;
            const { rows } = await pool.query(query, [routineExerciseId, setNumber, weight, reps, time]);
            return rows[0];
        } catch (error) {
            console.error('[Routine Model] Error adding set to routine:', error);
            throw error;
        }
    }

    // Update a planned set, scoped to the routine owner. Omitted fields keep
    // their stored value. Returns null when the set is not owned by the user.
    static async updateRoutineSet(setId, userId, weight, reps, time) {
        try {
            const fields = [];
            const values = [];
            let idx = 1;

            if (weight !== undefined && weight !== null) {
                fields.push(`rs.planned_weight = $${idx++}`);
                values.push(weight);
            }
            if (reps !== undefined && reps !== null) {
                fields.push(`rs.planned_reps = $${idx++}`);
                values.push(reps);
            }
            if (time !== undefined && time !== null) {
                fields.push(`rs.planned_time = $${idx++}`);
                values.push(time);
            }

            if (fields.length === 0) return null;

            values.push(setId, userId);
            const query = `
                UPDATE routine_sets rs
                SET ${fields.join(', ')}
                FROM routine_exercises re, routines r
                WHERE rs.routine_exercise_id = re.id
                  AND re.routine_id = r.id
                  AND rs.id = $${idx}
                  AND r.user_id = $${idx + 1}
                RETURNING rs.*;
            `;
            const { rows } = await pool.query(query, values);
            return rows[0] || null;
        } catch (error) {
            console.error('[Routine Model] Error updating routine set:', error);
            throw error;
        }
    }

    // Delete a planned set, scoped to the routine owner.
    static async deleteRoutineSet(setId, userId) {
        try {
            const query = `
                DELETE FROM routine_sets rs
                USING routine_exercises re, routines r
                WHERE rs.routine_exercise_id = re.id
                  AND re.routine_id = r.id
                  AND rs.id = $1
                  AND r.user_id = $2
                RETURNING rs.id;
            `;
            const { rowCount } = await pool.query(query, [setId, userId]);
            return rowCount > 0;
        } catch (error) {
            console.error('[Routine Model] Error removing set from routine:', error);
            throw error;
        }
    }
}

module.exports = Routine;