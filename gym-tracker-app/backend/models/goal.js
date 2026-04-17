const pool = require('../config/database');

class Goal {
    static async getUserGoals(userId) {
        try {
            const query = `
                SELECT g.id, g.target_weight, g.target_reps, g.created_at, e.name AS exercise_name
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

    static async createGoal(userId, exerciseId, targetWeight, targetReps) {
        try {
            const query = `
                INSERT INTO goals (user_id, exercise_id, target_weight, target_reps) 
                VALUES ($1, $2, $3, $4) 
                RETURNING id, target_weight, target_reps;
            `;
            const result = await pool.query(query, [userId, exerciseId, targetWeight, targetReps]);
            return result.rows[0];
        } catch (error) {
            console.error('[Goal Model] Error creating goal:', error);
            throw error;
        }
    }

    static async updateGoal(goalId, userId, targetWeight, targetReps) {
        try {
            const query = `
                UPDATE goals 
                SET target_weight = $1, target_reps = $2 
                WHERE id = $3 AND user_id = $4 
                RETURNING id, target_weight, target_reps;
            `;
            const result = await pool.query(query, [targetWeight, targetReps, goalId, userId]);
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