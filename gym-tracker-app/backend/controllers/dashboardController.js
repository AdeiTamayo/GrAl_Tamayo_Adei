const Dashboard = require('../models/dashboard');
const { sendData, sendError } = require('../utils/httpResponses');

/**
 * Headline numbers for the dashboard: total sessions, this week's volume and
 * the current training streak.
 */
exports.getDashboardStats = async (req, res) => {
    try {
        const stats = await Dashboard.getStats(req.userId);
        return sendData(res, 200, { data: stats });
    } catch (error) {
        console.error('[Dashboard] Error loading stats:', error.message);
        return sendError(res, 500, 'Failed to load dashboard stats');
    }
};
