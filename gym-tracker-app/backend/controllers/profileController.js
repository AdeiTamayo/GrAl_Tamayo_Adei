const pool = require('../config/database');

exports.getProfile = async (req, res) => {
    console.log('\n=== Profile Info Request ===');

    try {
        const result = await pool.query(
            'SELECT name, surname, email, gender, weight, height, birth_date, profile_picture FROM users WHERE id = $1', [req.userId]
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

exports.updateProfile = async (req, res) => {
    console.log('\n=== Profile Update Request ===');
    const { name, surname, email, gender, weight, height, birth_date } = req.body;
    try {
        console.log(`UPDATE users 
             SET name=$1, surname=$2, email=$3, gender=$4, weight=$5, height=$6, birth_date=$7
             WHERE id=$8`,
            [name, surname, email, gender, weight, height, birth_date, req.userId]);

        await pool.query(
            `UPDATE users 
             SET name=$1, surname=$2, email=$3, gender=$4, weight=$5, height=$6, birth_date=$7
             WHERE id=$8`,
            [name, surname, email, gender, weight, height, birth_date, req.userId]
        );
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Failed to update profile' });
    }
};
