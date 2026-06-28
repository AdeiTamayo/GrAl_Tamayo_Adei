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
     * Get hashed password for a user (for sensitive operations)
     */
    static async findUserPasswordById(id) {
        try {
            const query = `SELECT password FROM users WHERE id = $1`;
            const result = await pool.query(query, [id]);
            return result.rows[0] || null;
        } catch (error) {
            console.error('[User Model] Error finding user password:', error.message);
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
                RETURNING *;
            `;
            const result = await pool.query(query, [name, surname, email, gender, weight, height, birth_date, id]);
            return result.rows[0];
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
    static async getWeightHistory(userId, { startDate, endDate, page, limit, sortBy, sortOrder } = {}) {
        try {
            let query = `
                SELECT id, user_id, weight, date
                FROM weight_history
                WHERE user_id = $1
            `;
            const params = [userId];
            let paramIndex = 2;

            if (startDate) {
                query += ` AND date >= $${paramIndex++}`;
                params.push(startDate);
            }

            if (endDate) {
                query += ` AND date <= $${paramIndex++}`;
                params.push(endDate);
            }

            // Count total matching rows before pagination
            let countQuery = 'SELECT COUNT(*)::int AS total FROM weight_history WHERE user_id = $1';
            const countParams = [userId];
            let countIdx = 2;
            if (startDate) {
                countQuery += ` AND date >= $${countIdx++}`;
                countParams.push(startDate);
            }
            if (endDate) {
                countQuery += ` AND date <= $${countIdx++}`;
                countParams.push(endDate);
            }
            const countResult = await pool.query(countQuery, countParams);
            const total = countResult.rows[0].total;

            // Sorting
            const allowedSortColumns = ['date', 'weight'];
            const column = allowedSortColumns.includes(sortBy) ? sortBy : 'date';
            const dir = sortOrder === 'asc' ? 'ASC' : 'DESC';
            query += ` ORDER BY ${column} ${dir}, id ${dir}`;

            // Pagination
            if (page && limit) {
                const offset = (page - 1) * limit;
                query += ` LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
                params.push(limit, offset);
            }

            const result = await pool.query(query, params);
            return { rows: result.rows, total };
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

    static async getSettings(userId) {
        try {
            const query = `SELECT * FROM user_settings WHERE user_id = $1`;
            const result = await pool.query(query, [userId]);
            if (result.rows.length === 0) {
                const insert = await pool.query(
                    `INSERT INTO user_settings (user_id) VALUES ($1) RETURNING *`,
                    [userId]
                );
                return insert.rows[0];
            }
            return result.rows[0];
        } catch (error) {
            console.error('[User Model] Error getting settings:', error.message);
            throw error;
        }
    }

    static async updateSettings(userId, data) {
        try {
            const { show_rpe, show_1rm, default_rest_time } = data;

            // Ensure a row exists first
            await pool.query(
                `INSERT INTO user_settings (user_id) VALUES ($1) ON CONFLICT (user_id) DO NOTHING`,
                [userId]
            );

            const sets = [];
            const params = [];
            let idx = 1;

            if (show_rpe !== undefined) {
                sets.push(`show_rpe = $${idx++}`);
                params.push(show_rpe);
            }
            if (show_1rm !== undefined) {
                sets.push(`show_1rm = $${idx++}`);
                params.push(show_1rm);
            }
            if (default_rest_time !== undefined) {
                sets.push(`default_rest_time = $${idx++}`);
                params.push(default_rest_time);
            }

            if (sets.length === 0) {
                const existing = await pool.query(`SELECT * FROM user_settings WHERE user_id = $1`, [userId]);
                return existing.rows[0];
            }

            params.push(userId);
            const query = `UPDATE user_settings SET ${sets.join(', ')} WHERE user_id = $${idx} RETURNING *`;
            const result = await pool.query(query, params);
            return result.rows[0];
        } catch (error) {
            console.error('[User Model] Error updating settings:', error.message);
            throw error;
        }
    }


}





module.exports = User;