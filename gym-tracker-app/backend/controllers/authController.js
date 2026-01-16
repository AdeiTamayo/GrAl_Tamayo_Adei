const User = require('../models/User');

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
        const user = await User.findByEmail(email);
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

        console.log('[Login] Successful');

        res.json({
            success: true,
            message: 'Login successful',
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
        const { email, password } = req.body;

        console.log('\n=== Register Request ===');
        console.log(`[Register] Email: ${email}`);

        // Validate input
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                error: 'Email and password are required'
            });
        }

        // Check if user already exists
        const existingUser = await User.findByEmail(email);
        if (existingUser) {
            return res.status(409).json({
                success: false,
                error: 'Email already registered'
            });
        }

        // Create user with hashed password
        const user = await User.create(email, password);

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