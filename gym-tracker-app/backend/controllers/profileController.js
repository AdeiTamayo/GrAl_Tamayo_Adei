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
        console.error('Error fetching profile:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch profile' });
    }
};

exports.updateProfile = async (req, res) => {
    console.log('\n=== Profile Update Request ===');
    try {

        const { username, email, height, weight } = req.body;

        const updatedUser = await User.updateUser(req.userId, {
            username,
            email,
            height,
            weight
        });

        res.json({
            success: true,
            user: updatedUser
        });
    } catch (error) {
        console.error('Error updating profile:', error);
        res.status(500).json({ success: false, error: 'Failed to update profile' });
    }
};