const pool = require('../config/database');

class Goal {
    static async getUserGoals(userId) {
        try {
            const query = `
                SELECT g.id, g.exercise_id, g.target_weight, g.target_reps, g.created_at, g.expected_date, e.name AS exercise_name
                FROM goals g
                JOIN exercises e ON g.exercise_id = e.id
                WHERE g.user_id = $1
                ORDER BY g.created_at DESC;
            `;
            const result = await pool.query(query, [userId]);
            return result.rows;
        } catch (error) {
            console.error('[Goal Model] Error getting user goals:', error);
            throw error;
        }
    }

    static async createGoal(userId, exerciseId, targetWeight, targetReps, expectedDate) {
        try {
            const query = `
                INSERT INTO goals (user_id, exercise_id, target_weight, target_reps, expected_date) 
                VALUES ($1, $2, $3, $4, $5) 
                RETURNING id, target_weight, target_reps, expected_date;
            `;
            const result = await pool.query(query, [userId, exerciseId, targetWeight, targetReps, expectedDate || null]);
            return result.rows[0];
        } catch (error) {
            console.error('[Goal Model] Error creating goal:', error);
            throw error;
        }
    }

    static async updateGoal(goalId, userId, targetWeight, targetReps, expectedDate) {
        try {
            const query = `
                UPDATE goals 
                SET target_weight = $1, target_reps = $2, expected_date = $3 
                WHERE id = $4 AND user_id = $5 
                RETURNING id, target_weight, target_reps, expected_date;
            `;
            const result = await pool.query(query, [targetWeight, targetReps, expectedDate || null, goalId, userId]);
            return result.rows[0];
        } catch (error) {
            console.error('[Goal Model] Error updating goal:', error);
            throw error;
        }
    }

    static async deleteGoal(goalId, userId) {
        try {
            const query = `DELETE FROM goals WHERE id = $1 AND user_id = $2 RETURNING id;`;
            const result = await pool.query(query, [goalId, userId]);
            return result.rowCount > 0;
        } catch (error) {
            console.error('[Goal Model] Error deleting goal:', error);
            throw error;
        }
    }
}

module.exports = Goal;