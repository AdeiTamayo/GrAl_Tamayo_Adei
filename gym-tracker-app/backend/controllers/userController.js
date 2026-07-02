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

        const { name, surname, email, gender, height, weight, birth_date } = req.body;

        const updatedUser = await User.updateUser(req.userId, {
            name,
            surname,
            email,
            gender,
            weight,
            height,
            birth_date
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
        const { password } = req.body;

        if (!password) {
            return res.status(400).json({
                success: false,
                error: 'Password is required to delete account'
            });
        }

        const user = await User.findUserPasswordById(req.userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }

        const isValid = await User.validatePassword(password, user.password);
        if (!isValid) {
            return res.status(403).json({
                success: false,
                error: 'Incorrect password'
            });
        }

        await User.deleteUser(req.userId);

        return res.json({
            success: true
        })

    } catch (error) {
        console.error('Error deleting user:', error);
        return res.status(500).json({
            success: false,
            error: 'Error deleting user'
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
            return res.status(400).json({
                success: false,
                error: 'Email and password are required'
            });
        }

        // Find user in database
        const user = await User.findUserByEmail(email);
        if (!user) {
            return res.status(401).json({
                success: false,
                error: 'Invalid email or password'
            });
        }

        // Validate password
        const isValid = await User.validatePassword(password, user.password);
        if (!isValid) {
            return res.status(401).json({
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
        const { name, surname, email, password, gender_id, weight, height, birth_date } = req.body;

        console.log('\n=== Register Request ===');
        console.log(`[Register] Email: ${email}`);
        console.log(`[Register] User values: name=${name}, surname=${surname}, email=${email}, gender_id=${gender_id}, weight=${weight}, height=${height}, birth_date=${birth_date}`);

        // Validate input
        if (!email || !password) {
            return res.status(400).json({
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
        const user = await User.createUser(name, surname, email, password, gender_id, weight, height, birth_date);

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

exports.getWeightHistory = async (req, res) => {
    try {
        console.log('\n=== Get Weight History Request ===');

        const userId = req.userId;
        if (!userId) {
            return res.status(400).json({
                success: false,
                error: 'User ID is required'
            });
        }

        const { startDate, endDate, page, limit, sortBy, sortOrder } = req.query;

        if (startDate && isNaN(Date.parse(startDate))) {
            return res.status(400).json({
                success: false,
                error: 'Invalid startDate format (use YYYY-MM-DD)'
            });
        }

        if (endDate && isNaN(Date.parse(endDate))) {
            return res.status(400).json({
                success: false,
                error: 'Invalid endDate format (use YYYY-MM-DD)'
            });
        }

        if (startDate && endDate && startDate > endDate) {
            return res.status(400).json({
                success: false,
                error: 'startDate cannot be after endDate'
            });
        }

        const validSortBy = ['date', 'weight'].includes(sortBy) ? sortBy : undefined;
        const validSortOrder = ['asc', 'desc'].includes(sortOrder) ? sortOrder : undefined;
        const pageNum = page ? parseInt(page, 10) : undefined;
        const limitNum = limit ? parseInt(limit, 10) : undefined;

        const result = await User.getWeightHistory(userId, {
            startDate,
            endDate,
            page: pageNum,
            limit: limitNum,
            sortBy: validSortBy,
            sortOrder: validSortOrder
        });

        return res.status(200).json({
            success: true,
            data: result.rows,
            total: result.total
        });
    } catch (error) {
        console.error('[Get Weight History Error]:', error.message);
        return res.status(500).json({
            success: false,
            error: 'Get weight history failed'
        });
    }
};

exports.addWeight = async (req, res) => {
    try {
        const userId = req.userId;
        const { weight, date } = req.body;

        if (!userId || weight == null || !date) {
            return res.status(400).json({
                success: false,
                error: 'userId, weight and date are required'
            });
        }

        const newWeightEntry = await User.addWeight(userId, weight, date);
        const currentWeight = await User.syncProfileWeightFromHistory(userId);

        return res.status(201).json({
            success: true,
            data: newWeightEntry,
            currentWeight
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            error: 'Add weight failed'
        });
    }
};

exports.updateWeight = async (req, res) => {
    try {
        const userId = req.userId;
        const { id, weight, date } = req.body;

        if (!id || weight == null || !date) {
            return res.status(400).json({
                success: false,
                error: 'id, weight and date are required'
            });
        }

        const updatedWeight = await User.updateWeight(id, weight, date, userId); // ensure ownership
        await User.syncProfileWeightFromHistory(userId);

        return res.status(200).json({
            success: true,
            data: updatedWeight
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            error: 'Update weight failed'
        });
    }
};

exports.getSettings = async (req, res) => {
    try {
        const settings = await User.getSettings(req.userId);
        return res.status(200).json({ success: true, data: settings });
    } catch (error) {
        console.error('[Settings] Error fetching:', error.message);
        return res.status(500).json({ success: false, error: 'Failed to fetch settings' });
    }
};

exports.updateSettings = async (req, res) => {
    try {
        const { show_rpe, show_1rm, show_goals, show_rest_time, default_rest_time } = req.body;
        const settings = await User.updateSettings(req.userId, { show_rpe, show_1rm, show_goals, show_rest_time, default_rest_time });
        return res.status(200).json({ success: true, data: settings });
    } catch (error) {
        console.error('[Settings] Error updating:', error.message);
        return res.status(500).json({ success: false, error: 'Failed to update settings' });
    }
};

exports.deleteWeight = async (req, res) => {
    try {
        const userId = req.userId;
        const { id } = req.params;

        if (!id) {
            return res.status(400).json({
                success: false,
                error: 'id is required'
            });
        }

        await User.deleteWeight(id, userId); // ensure ownership
        await User.syncProfileWeightFromHistory(userId);

        return res.status(200).json({ success: true });
    } catch (error) {
        return res.status(500).json({
            success: false,
            error: 'Delete weight failed'
        });
    }
};