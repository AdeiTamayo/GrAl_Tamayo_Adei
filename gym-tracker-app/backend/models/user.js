const pool = require('../config/database');
const bcrypt = require('bcrypt');

class User {
    /**
     * Create a new user
     */
    static async createUser(name, surname, email, password, gender, weight, height, birth_date, profile_picture) {
        try {
            if (!email || !password) {
                throw new Error('Email and password are required');
            }
            const hashedPassword = await bcrypt.hash(password, 10);
            const query = `
                INSERT INTO users (name, surname, email, password, gender, weight, height, birth_date, profile_picture) 
                VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9) 
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
                birth_date ?? null,
                profile_picture ?? null
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
                SELECT name, surname, email, gender, weight, height, birth_date, profile_picture 
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

}

module.exports = User;