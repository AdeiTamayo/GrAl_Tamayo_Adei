const pool = require('../config/database');

class PlannedWorkout {
    static async getAll(userId) {
        const result = await pool.query(
            `SELECT pw.*, r.name AS routine_name
             FROM planned_workouts pw
             LEFT JOIN routines r ON pw.routine_id = r.id
             WHERE pw.user_id = $1
             ORDER BY pw.date DESC, pw.created_at DESC`,
            [userId]
        );
        return result.rows;
    }

    static async getById(id, userId) {
        const result = await pool.query(
            `SELECT pw.*, r.name AS routine_name
             FROM planned_workouts pw
             LEFT JOIN routines r ON pw.routine_id = r.id
             WHERE pw.id = $1 AND pw.user_id = $2`,
            [id, userId]
        );
        return result.rows[0] || null;
    }

    static async create(userId, date, name, routineId, note) {
        const result = await pool.query(
            `INSERT INTO planned_workouts (user_id, date, routine_id, name, note)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING *`,
            [userId, date, routineId || null, name, note || null]
        );
        return result.rows[0];
    }

    static async update(id, userId, date, name, note) {
        const result = await pool.query(
            `UPDATE planned_workouts
             SET date = COALESCE($1, date),
                 name = COALESCE($2, name),
                 note = COALESCE($3, note)
             WHERE id = $4 AND user_id = $5
             RETURNING *`,
            [date || null, name || null, note || null, id, userId]
        );
        return result.rows[0] || null;
    }

    static async delete(id, userId) {
        const result = await pool.query(
            `DELETE FROM planned_workouts WHERE id = $1 AND user_id = $2 RETURNING id`,
            [id, userId]
        );
        return result.rowCount > 0;
    }
}

module.exports = PlannedWorkout;
