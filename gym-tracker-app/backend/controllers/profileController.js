const User = require('../models/user');

exports.getProfile = async (req, res) => {
    console.log('\n=== Profile Info Request ===');
    try {
        const user = await User.findUserById(req.userId);

        if (!user) {
            console.log('User not found');
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }

        res.json({
            success: true,
            user: user
        });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Failed to fetch profile' });
    }
};

exports.updateProfile = async (req, res) => {
    console.log('\n=== Profile Update Request ===');
    try {
        await User.updateUser(req.userId, req.body);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Failed to update profile' });
    }
};