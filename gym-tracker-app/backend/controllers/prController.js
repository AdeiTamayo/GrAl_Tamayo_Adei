const PR = require('../models/pr');
const { sendData, sendError } = require('../utils/httpResponses');

exports.getPrSummary = async (req, res) => {
    try {
        const prs = await PR.getPrSummary(req.userId);
        return sendData(res, 200, { data: prs });
    } catch (error) {
        console.error('[PRs] Error fetching PR summary:', error);
        return sendError(res, 500, 'Failed to get PR summary');
    }
};

exports.getPrHistory = async (req, res) => {
    try {
        const history = await PR.getPrHistory(req.userId, req.params.id);
        return sendData(res, 200, { data: history });
    } catch (error) {
        console.error('[PRs] Error fetching PR history:', error);
        return sendError(res, 500, 'Failed to get PR history');
    }
};

exports.createPR = async (req, res) => {
    try {
        const { exercise_id, weight, repetitions, date, note } = req.body;
        const pr = await PR.createPR(req.userId, exercise_id, weight, repetitions, date, note);
        return sendData(res, 201, { data: pr });
    } catch (error) {
        console.error('[PRs] Error creating PR:', error);
        return sendError(res, 500, 'Failed to manually create PR');
    }
};

exports.updatePR = async (req, res) => {
    try {
        const { weight, repetitions, date, note } = req.body;
        const pr = await PR.updatePR(req.userId, req.params.id, weight, repetitions, date, note);

        if (!pr) {
            return sendError(res, 404, 'PR not found or you do not have permission to update it');
        }
        return sendData(res, 200, { data: pr });
    } catch (error) {
        console.error('[PRs] Error updating PR:', error);
        return sendError(res, 500, 'Failed to update PR');
    }
};

exports.deletePR = async (req, res) => {
    try {
        const deleted = await PR.deletePR(req.userId, req.params.id);

        if (!deleted) {
            return sendError(res, 404, 'PR not found or you do not have permission to delete it');
        }
        return sendData(res, 200, { message: 'PR deleted successfully' });
    } catch (error) {
        console.error('[PRs] Error deleting PR:', error);
        return sendError(res, 500, 'Failed to delete PR');
    }
};
