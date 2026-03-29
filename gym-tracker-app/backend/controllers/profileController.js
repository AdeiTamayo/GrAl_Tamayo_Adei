const pool = require('../config/database');

exports.getProfile = async (req, res) => {
    console.log('\n=== Profile Info Request ===');
    console.log([req.userId]);

    try {
        const result = await pool.query(
            'SELECT name, surname, gender, weight, height, birth_date, profile_picture FROM users WHERE id = $1', [req.userId]
        );

        if (result.rows.lenght === 0) {
            console.log('User not found');
            return res.status(404).json({
                success: false,
                error: 'User not found'
            })
        }

        console.log(result.rows[0]);
        res.json({
            success: true,
            user: result.rows[0]
        });

    } catch (error) {

        res.status(500).json({ success: false, error: 'Failed to fetch profile' });
    }
}