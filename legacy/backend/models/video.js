const pool = require('../config/database');

class Video {
    /**
     * Save processed video record
     */
    static async createVideo(userId, filename, processType, processedUrl) {
        try {
            const query = `
                INSERT INTO videos (user_id, filename, process_type, processed_url, status)
                VALUES ($1, $2, $3, $4, 'completed')
                RETURNING *
            `;
            const result = await pool.query(query, [userId, filename, processType, processedUrl]);
            console.log('[Video Model] Video saved:', result.rows[0].id);
            return result.rows[0];
        } catch (error) {
            console.error('[Video Model] Error saving video:', error.message);
            throw error;
        }
    }

    /**
     * Get videos by user ID
     */
    static async getVideosByUserId(userId) {
        try {
            const query = 'SELECT * FROM videos WHERE user_id = $1 ORDER BY created_at DESC';
            const result = await pool.query(query, [userId]);
            return result.rows;
        } catch (error) {
            console.error('[Video Model] Error fetching videos:', error.message);
            throw error;
        }
    }

    /**
     * Get videos by user mail
     */
    static async getVideosByUserEmail(email) {
        try {
            const query = `
                SELECT v.*
                FROM videos v   
                JOIN users u ON v.user_id = u.id
                WHERE u.email = $1
            `;
            const result = await pool.query(query, [email]);
            return result.rows;
        } catch (error) {
            console.error('[Video Model] Error fetching videos by email:', error.message);
            throw error;
        }
    }

    /**
     * Get video by ID
     */
    static async getVideoById(videoId) {
        try {
            const query = 'SELECT * FROM videos WHERE id = $1';
            const result = await pool.query(query, [videoId]);
            return result.rows[0] || null;
        } catch (error) {
            console.error('[Video Model] Error fetching video:', error.message);
            throw error;
        }
    }
}

module.exports = Video;