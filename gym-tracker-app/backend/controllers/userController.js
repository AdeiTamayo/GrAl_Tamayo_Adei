const jwt = require('jsonwebtoken');
const User = require('../models/user');
const { requireVar } = require('../config/env');
const { sendData, sendError } = require('../utils/httpResponses');

exports.getProfile = async (req, res) => {
    try {
        const user = await User.findUserById(req.userId);

        if (!user) {
            return sendError(res, 404, 'User not found');
        }

        return sendData(res, 200, { user });
    } catch (error) {
        console.error('[User] Error fetching profile:', error);
        return sendError(res, 500, 'Failed to fetch profile');
    }
};

exports.updateProfile = async (req, res) => {
    try {
        const { name, surname, email, gender, height, weight, birth_date } = req.body;

        const user = await User.updateUser(req.userId, {
            name, surname, email, gender, weight, height, birth_date
        });

        return sendData(res, 200, { user });
    } catch (error) {
        console.error('[User] Error updating profile:', error);
        return sendError(res, 500, 'Failed to update profile');
    }
};

exports.deleteUser = async (req, res) => {
    try {
        const { password } = req.body;

        if (!password) {
            return sendError(res, 400, 'Password is required to delete account');
        }

        const user = await User.findUserPasswordById(req.userId);
        if (!user) {
            return sendError(res, 404, 'User not found');
        }

        const isValid = await User.validatePassword(password, user.password);
        if (!isValid) {
            return sendError(res, 403, 'Incorrect password');
        }

        await User.deleteUser(req.userId);

        return sendData(res, 200, {});
    } catch (error) {
        console.error('[User] Error deleting user:', error);
        return sendError(res, 500, 'Error deleting user');
    }
};

exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return sendError(res, 400, 'Email and password are required');
        }

        const user = await User.findUserByEmail(email);

        // The same message is returned whether the email is unknown or the
        // password is wrong, so the endpoint does not reveal which accounts exist.
        if (!user) {
            return sendError(res, 401, 'Invalid email or password');
        }

        const isValid = await User.validatePassword(password, user.password);
        if (!isValid) {
            return sendError(res, 401, 'Invalid email or password');
        }

        const token = jwt.sign(
            { userId: user.id, email: user.email },
            requireVar('JWT_SECRET'),
            { expiresIn: '7d' }
        );

        return sendData(res, 200, {
            message: 'Login successful',
            token,
            user: { id: user.id, email: user.email }
        });
    } catch (error) {
        console.error('[User] Login error:', error.message);
        return sendError(res, 500, 'Login failed');
    }
};

exports.register = async (req, res) => {
    try {
        const { name, surname, email, password, gender_id, weight, height, birth_date } = req.body;

        if (!email || !password) {
            return sendError(res, 400, 'Email and password are required');
        }

        const existingUser = await User.findUserByEmail(email);
        if (existingUser) {
            return sendError(res, 409, 'Email already registered');
        }

        const user = await User.createUser(name, surname, email, password, gender_id, weight, height, birth_date);

        return sendData(res, 201, {
            message: 'Registration successful',
            user: { id: user.id, email: user.email }
        });
    } catch (error) {
        console.error('[User] Registration error:', error.message);
        return sendError(res, 500, 'Registration failed');
    }
};

exports.getWeightHistory = async (req, res) => {
    try {
        const { startDate, endDate, page, limit, sortBy, sortOrder } = req.query;

        if (startDate && isNaN(Date.parse(startDate))) {
            return sendError(res, 400, 'Invalid startDate format (use YYYY-MM-DD)');
        }

        if (endDate && isNaN(Date.parse(endDate))) {
            return sendError(res, 400, 'Invalid endDate format (use YYYY-MM-DD)');
        }

        if (startDate && endDate && startDate > endDate) {
            return sendError(res, 400, 'startDate cannot be after endDate');
        }

        const result = await User.getWeightHistory(req.userId, {
            startDate,
            endDate,
            page: toPositiveInt(page),
            limit: toPositiveInt(limit),
            // Whitelisted here because both values are interpolated into SQL.
            sortBy: ['date', 'weight'].includes(sortBy) ? sortBy : undefined,
            sortOrder: sortOrder === 'asc' ? 'asc' : undefined
        });

        return sendData(res, 200, { data: result.rows, total: result.total });
    } catch (error) {
        console.error('[User] Error getting weight history:', error.message);
        return sendError(res, 500, 'Get weight history failed');
    }
};

exports.addWeight = async (req, res) => {
    try {
        const { weight, date } = req.body;

        if (weight == null || !date) {
            return sendError(res, 400, 'weight and date are required');
        }

        const entry = await User.addWeight(req.userId, weight, date);
        const currentWeight = await User.syncProfileWeightFromHistory(req.userId);

        return sendData(res, 201, { data: entry, currentWeight });
    } catch (error) {
        console.error('[User] Error adding weight:', error);
        return sendError(res, 500, 'Add weight failed');
    }
};

exports.updateWeight = async (req, res) => {
    try {
        const { id, weight, date } = req.body;

        if (!id || weight == null || !date) {
            return sendError(res, 400, 'id, weight and date are required');
        }

        const entry = await User.updateWeight(id, weight, date, req.userId);
        await User.syncProfileWeightFromHistory(req.userId);

        return sendData(res, 200, { data: entry });
    } catch (error) {
        console.error('[User] Error updating weight:', error);
        return sendError(res, 500, 'Update weight failed');
    }
};

exports.deleteWeight = async (req, res) => {
    try {
        const { id } = req.params;

        if (!id) {
            return sendError(res, 400, 'id is required');
        }

        await User.deleteWeight(id, req.userId);
        await User.syncProfileWeightFromHistory(req.userId);

        return sendData(res, 200, {});
    } catch (error) {
        console.error('[User] Error deleting weight:', error);
        return sendError(res, 500, 'Delete weight failed');
    }
};

exports.getSettings = async (req, res) => {
    try {
        const settings = await User.getSettings(req.userId);
        return sendData(res, 200, { data: settings });
    } catch (error) {
        console.error('[User] Error fetching settings:', error.message);
        return sendError(res, 500, 'Failed to fetch settings');
    }
};

exports.updateSettings = async (req, res) => {
    try {
        const { show_rpe, show_1rm, show_goals, show_rest_time, default_rest_time } = req.body;

        const settings = await User.updateSettings(req.userId, {
            show_rpe, show_1rm, show_goals, show_rest_time, default_rest_time
        });

        return sendData(res, 200, { data: settings });
    } catch (error) {
        console.error('[User] Error updating settings:', error.message);
        return sendError(res, 500, 'Failed to update settings');
    }
};

function toPositiveInt(value) {
    if (value === undefined) return undefined;
    const parsed = parseInt(value, 10);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
}
