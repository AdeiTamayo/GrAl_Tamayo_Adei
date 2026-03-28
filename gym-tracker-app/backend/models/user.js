const pool = require('../config/database');
const bcrypt = require('bcrypt');

class User {
    /**
     * Create a new user
     */

    static async createUser(name, surname, email, password, gender_id, weight, height, birth_date, profile_picture) {
        try {
            if (!email || !password) {
                throw new Error('Email and password are requiered');
            }
            const hashedPassword = await bcrypt.hash(password, 10);
            const query = "INSERT INTO users (name, surname, email, password, gender_id, weight, height, birth_date, profile_picture) VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id";
            const result = await pool.query(query, [name ?? null, surname ?? null, email, hashedPassword, gender_id ?? null, weight ?? null, height ?? null, birth_date ?? null, profile_picture ?? null]);
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

}

module.exports = User;