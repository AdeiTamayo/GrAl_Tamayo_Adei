const PlannedWorkout = require('../models/plannedWorkout');
const { sendData, sendError } = require('../utils/httpResponses');

exports.getAll = async (req, res) => {
    try {
        const planned = await PlannedWorkout.getAll(req.userId);
        return sendData(res, 200, { data: planned });
    } catch (error) {
        console.error('[PlannedWorkouts] Error fetching:', error);
        return sendError(res, 500, 'Failed to get planned workouts');
    }
};

exports.create = async (req, res) => {
    try {
        const { date, name, routine_id, note } = req.body;

        if (!date || !name) {
            return sendError(res, 400, 'Date and name are required');
        }

        const planned = await PlannedWorkout.create(req.userId, date, name, routine_id, note);
        return sendData(res, 201, { data: planned });
    } catch (error) {
        console.error('[PlannedWorkouts] Error creating:', error);
        return sendError(res, 500, 'Failed to create planned workout');
    }
};

exports.update = async (req, res) => {
    try {
        const { date, name, note } = req.body;
        const planned = await PlannedWorkout.update(req.params.id, req.userId, date, name, note);

        if (!planned) {
            return sendError(res, 404, 'Planned workout not found or unauthorized');
        }
        return sendData(res, 200, { data: planned });
    } catch (error) {
        console.error('[PlannedWorkouts] Error updating:', error);
        return sendError(res, 500, 'Failed to update planned workout');
    }
};

exports.delete = async (req, res) => {
    try {
        const deleted = await PlannedWorkout.delete(req.params.id, req.userId);

        if (!deleted) {
            return sendError(res, 404, 'Planned workout not found or unauthorized');
        }
        return sendData(res, 200, {});
    } catch (error) {
        console.error('[PlannedWorkouts] Error deleting:', error);
        return sendError(res, 500, 'Failed to delete planned workout');
    }
};
