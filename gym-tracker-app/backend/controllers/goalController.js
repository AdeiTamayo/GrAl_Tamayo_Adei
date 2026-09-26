const Goal = require('../models/goal');
const { sendData, sendError } = require('../utils/httpResponses');

exports.getGoals = async (req, res) => {
    try {
        const goals = await Goal.getUserGoals(req.userId);
        return sendData(res, 200, { goals });
    } catch (error) {
        console.error('[Goals] Error fetching goals:', error);
        return sendError(res, 500, 'Failed to get goals');
    }
};

exports.createGoal = async (req, res) => {
    try {
        const { exercise_id, target_weight, target_reps, expected_date } = req.body;
        const goal = await Goal.createGoal(req.userId, exercise_id, target_weight, target_reps, expected_date);
        return sendData(res, 200, { goal });
    } catch (error) {
        console.error('[Goals] Error creating goal:', error);
        return sendError(res, 500, 'Failed to create goal');
    }
};

exports.updateGoal = async (req, res) => {
    try {
        const { target_weight, target_reps, expected_date } = req.body;
        const goal = await Goal.updateGoal(req.params.id, req.userId, target_weight, target_reps, expected_date);

        if (!goal) {
            return sendError(res, 404, 'Goal not found or unauthorized');
        }
        return sendData(res, 200, { goal });
    } catch (error) {
        console.error('[Goals] Error updating goal:', error);
        return sendError(res, 500, 'Failed to update goal');
    }
};

exports.deleteGoal = async (req, res) => {
    try {
        const deleted = await Goal.deleteGoal(req.params.id, req.userId);

        if (!deleted) {
            return sendError(res, 404, 'Goal not found or unauthorized');
        }
        return sendData(res, 200, {});
    } catch (error) {
        console.error('[Goals] Error deleting goal:', error);
        return sendError(res, 500, 'Failed to delete goal');
    }
};
