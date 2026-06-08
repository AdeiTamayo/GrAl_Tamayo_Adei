const pool = require('../config/database');
const bcrypt = require('bcrypt');

class User {
    /**
     * Create a new user
     */
    static async createUser(name, surname, email, password, gender, weight, height, birth_date) {
        try {
            if (!email || !password) {
                throw new Error('Email and password are required');
            }
            const hashedPassword = await bcrypt.hash(password, 10);
            const query = `
                INSERT INTO users (name, surname, email, password, gender, weight, height, birth_date) 
                VALUES($1, $2, $3, $4, $5, $6, $7, $8) 
                RETURNING id
            `;
            const result = await pool.query(query, [
                name ?? null,
                surname ?? null,
                email,
                hashedPassword,
                gender ?? null,
                weight ?? null,
                height ?? null,
                birth_date ?? null
            ]);
            return result.rows[0];
        } catch (error) {
            console.error('[User Model] Error creating user:', error.message);
            throw error;
        }
    }

    /**
     * Find user by email
     */
    static async findUserByEmail(email) {
        try {
            const query = 'SELECT * FROM users WHERE email = $1';
            const result = await pool.query(query, [email]);
            return result.rows[0] || null;
        } catch (error) {
            console.error('[User Model] Error finding user:', error.message);
            throw error;
        }
    }

    /**
     * Validate password
     */
    static async validatePassword(plainPassword, hashedPassword) {
        return await bcrypt.compare(plainPassword, hashedPassword);
    }

    /**
     * Find user by ID (for profile info)
     */
    static async findUserById(id) {
        try {
            const query = `
                SELECT name, surname, email, gender, weight, height, birth_date 
                FROM users 
                WHERE id = $1
            `;
            const result = await pool.query(query, [id]);
            return result.rows[0] || null;
        } catch (error) {
            console.error('[User Model] Error finding user by id:', error.message);
            throw error;
        }
    }

    /**
     * Update user profile
     */
    static async updateUser(id, data) {
        try {
            const { name, surname, email, gender, weight, height, birth_date } = data;
            const query = `
                UPDATE users 
                SET name=$1, surname=$2, email=$3, gender=$4, weight=$5, height=$6, birth_date=$7
                WHERE id=$8
            `;
            await pool.query(query, [name, surname, email, gender, weight, height, birth_date, id]);
        } catch (error) {
            console.error('[User Model] Error updating user:', error.message);
            throw error;
        }
    }

    /**
     * Delete user
     */
    static async deleteUser(id) {
        try {
            const query = `
            DELETE FROM users
            WHERE  id = $1
             RETURNING id;
            `;
            const result = await pool.query(query, [id]);
            return result.rowCount > 0;
        } catch (error) {
            console.error('[User Model] Error deleting user:', error.message);
            throw error;
        }
    }

    /**
     * Get all weight history entries for a user
     */
    static async getWeightHistory(userId) {
        try {
            const query = `
                SELECT id, user_id, weight, date
                FROM weight_history
                WHERE user_id = $1
                ORDER BY date DESC, id DESC;
            `;
            const result = await pool.query(query, [userId]);
            return result.rows;
        } catch (error) {
            console.error('[User Model] Error getting weight history:', error.message);
            throw error;
        }
    }

    /**
     * Add a new weight history entry
     */
    static async addWeight(userId, weight, date) {
        try {
            const query = `
                INSERT INTO weight_history (user_id, weight, date)
                VALUES ($1, $2, $3)
                RETURNING id, user_id, weight, date;
            `;
            const result = await pool.query(query, [userId, weight, date]);
            return result.rows[0];
        } catch (error) {
            console.error('[User Model] Error adding weight:', error.message);
            throw error;
        }
    }

    /**
     * Update a weight history entry 
     */
    static async updateWeight(id, weight, date, userId) {
        try {
            const query = `
                UPDATE weight_history
                SET weight = $1, date = $2
                WHERE id = $3 AND user_id = $4
                RETURNING id, user_id, weight, date;
            `;
            const result = await pool.query(query, [weight, date, id, userId]);

            if (result.rowCount === 0) {
                throw new Error('Weight entry not found or not owned by user');
            }

            return result.rows[0];
        } catch (error) {
            console.error('[User Model] Error updating weight:', error.message);
            throw error;
        }
    }

    /**
     * Delete a weight history entry 
     */
    static async deleteWeight(id, userId) {
        try {
            const query = `
                DELETE FROM weight_history
                WHERE id = $1 AND user_id = $2
                RETURNING id;
            `;
            const result = await pool.query(query, [id, userId]);
            return result.rowCount > 0;
        } catch (error) {
            console.error('[User Model] Error deleting weight:', error.message);
            throw error;
        }
    }

    /**
     * Sync users.weight with latest weight_history entry
     */
    static async syncProfileWeightFromHistory(userId) {
        try {
            const latestQuery = `
                SELECT weight
                FROM weight_history
                WHERE user_id = $1
                ORDER BY date DESC, id DESC
                LIMIT 1;
            `;
            const latestResult = await pool.query(latestQuery, [userId]);
            const latestWeight = latestResult.rows.length ? latestResult.rows[0].weight : null;

            await pool.query(
                `UPDATE users SET weight = $1 WHERE id = $2;`,
                [latestWeight, userId]
            );

            return latestWeight;
        } catch (error) {
            console.error('[User Model] Error syncing profile weight:', error.message);
            throw error;
        }
    }


}





module.exports = User;