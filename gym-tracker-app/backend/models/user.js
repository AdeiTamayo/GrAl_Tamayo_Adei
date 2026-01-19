const pool = require('../config/database');
const bcrypt = require('bcrypt');

class User {
    /**
     * Create a new user
     */
    static async createUser(email, password) {
        try {
            const hashedPassword = await bcrypt.hash(password, 10);
            const query = 'INSERT INTO users (email, password) VALUES ($1, $2) RETURNING id, email, created_at';
            const result = await pool.query(query, [email, hashedPassword]);
            console.log('[User Model] User created:', result.rows[0].email);
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
     * Get all users
     */
    static async getAll() {
        try {
            const query = 'SELECT id, email, created_at FROM users ORDER BY created_at DESC';
            const result = await pool.query(query);
            return result.rows;
        } catch (error) {
            console.error('[User Model] Error fetching users:', error.message);
            throw error;
        }
    }
}

module.exports = User;