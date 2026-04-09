const jwt = require('jsonwebtoken');
const User = require('../models/user');

exports.getProfile = async (req, res) => {
    console.log('Profile Info Request');
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
    console.log('Profile Update Request');
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

exports.deleteUser = async (req, res) => {
    console.log('Delete profile request received');

    try {
        await User.deleteUser(req.userId);

        return res.json({
            success: true
        })


    } catch (error) {
        return res.status(500).json({
            success: false,
            error: 'Error deleting exercise'
        })
    }
}


/**
 * Handle user login
 */
exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        console.log('\n=== Login Request ===');
        console.log(`[Login] Email: ${email}`);

        // Validate input
        if (!email || !password) {
            return res.status(404).json({
                success: false,
                error: 'Email and password are required'
            });
        }

        // Find user in database
        const user = await User.findUserByEmail(email);
        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'Invalid email or password'
            });
        }

        // Validate password
        const isValid = await User.validatePassword(password, user.password);
        if (!isValid) {
            return res.status(404).json({
                success: false,
                error: 'Invalid email or password'
            });
        }

        // Generate JWT token with user ID and email
        const token = jwt.sign(
            { userId: user.id, email: user.email },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        console.log('[Login] Successful');

        res.json({
            success: true,
            message: 'Login successful',
            token,
            user: { id: user.id, email: user.email }
        });
    } catch (error) {
        console.error('[Login Error]:', error.message);
        res.status(500).json({
            success: false,
            error: 'Login failed'
        });
    }
};

/**
 * Handle user registration
 */
exports.register = async (req, res) => {
    try {
        const { name, surname, email, password, gender_id, weight, height, birth_date, profile_picture } = req.body;

        console.log('\n=== Register Request ===');
        console.log(`[Register] Email: ${email}`);
        console.log(`[Register] User values: name=${name}, surname=${surname}, email=${email}, gender_id=${gender_id}, weight=${weight}, height=${height}, birth_date=${birth_date}, profile_picture=${profile_picture}`);

        // Validate input
        if (!email || !password) {
            return res.status(404).json({
                success: false,
                error: 'Email and password are required'
            });
        }

        // Check if user already exists
        const existingUser = await User.findUserByEmail(email);
        if (existingUser) {
            return res.status(409).json({
                success: false,
                error: 'Email already registered'
            });
        }

        // Create user with hashed password
        const user = await User.createUser(name, surname, email, password, gender_id, weight, height, birth_date, profile_picture);

        console.log('[Register] User registered successfully');

        res.status(201).json({
            success: true,
            message: 'Registration successful',
            user: { id: user.id, email: user.email }
        });
    } catch (error) {
        console.error('[Register Error]:', error.message);
        res.status(500).json({
            success: false,
            error: 'Registration failed'
        });
    }
};