const Routines = require('../models/routines');
const { sendData, sendError } = require('../utils/httpResponses');

exports.getUserRoutines = async (req, res) => {
    try {
        const routines = await Routines.getUserRoutines(req.userId);
        return sendData(res, 200, { routines });
    } catch (error) {
        console.error('[Routines] Error fetching routines:', error);
        return sendError(res, 500, 'Failed to fetch routines');
    }
};

exports.getRoutineById = async (req, res) => {
    try {
        const routine = await Routines.getRoutineById(req.params.id, req.userId);

        if (!routine) {
            return sendError(res, 404, 'Routine not found');
        }
        return sendData(res, 200, { data: routine });
    } catch (error) {
        console.error('[Routines] Error fetching routine:', error);
        return sendError(res, 500, 'Failed to fetch routine with id');
    }
};

exports.createRoutine = async (req, res) => {
    try {
        const routine = await Routines.createRoutine(req.userId, req.body.name);

        if (!routine) {
            return sendError(res, 404, 'Could not create routine');
        }
        return sendData(res, 201, { data: routine });
    } catch (error) {
        console.error('[Routines] Error creating routine:', error);
        return sendError(res, 500, 'Failed to create routine');
    }
};

exports.updateRoutine = async (req, res) => {
    try {
        const { name, note } = req.body;
        const routine = await Routines.updateRoutine(req.params.id, req.userId, name, note);

        if (!routine) {
            return sendError(res, 404, 'Routine not found or you do not have permission to edit it.');
        }
        return sendData(res, 200, { data: routine });
    } catch (error) {
        console.error('[Routines] Error updating routine:', error);
        return sendError(res, 500, 'Failed to update routine');
    }
};

exports.deleteRoutine = async (req, res) => {
    try {
        const deleted = await Routines.deleteRoutine(req.params.id, req.userId);

        if (!deleted) {
            return sendError(res, 404, 'Routine not found or unauthorized');
        }
        return sendData(res, 200, { message: 'Routine deleted successfully' });
    } catch (error) {
        console.error('[Routines] Error deleting routine:', error);
        return sendError(res, 500, 'Failed to delete routine');
    }
};

exports.addExerciseToRoutine = async (req, res) => {
    try {
        const { exercise_id, exercise_order, planned_sets, planned_reps, planned_weight, planned_time, note } = req.body;

        const exercise = await Routines.addExerciseToRoutine(
            req.params.id, req.userId, exercise_id, exercise_order,
            planned_sets, planned_reps, planned_weight, planned_time, note
        );

        if (!exercise) {
            return sendError(res, 404, 'Failed to add exercise or unauthorized');
        }
        return sendData(res, 200, { data: exercise });
    } catch (error) {
        console.error('[Routines] Error adding exercise:', error);
        return sendError(res, 500, 'Failed to add exercise to routine');
    }
};

exports.updateRoutineExercise = async (req, res) => {
    try {
        const { exercise_order, planned_sets, planned_reps, planned_weight, planned_time, note } = req.body;

        const exercise = await Routines.updateRoutineExercise(
            req.params.item_id, req.userId, exercise_order,
            planned_sets, planned_reps, planned_weight, planned_time, note
        );

        if (!exercise) {
            return sendError(res, 404, 'Routine exercise not found or unauthorized');
        }
        return sendData(res, 200, { data: exercise });
    } catch (error) {
        console.error('[Routines] Error updating routine exercise:', error);
        return sendError(res, 500, 'Failed to update routine exercise');
    }
};

exports.removeExerciseFromRoutine = async (req, res) => {
    try {
        const removed = await Routines.removeExerciseFromRoutine(req.params.item_id, req.userId);

        if (!removed) {
            return sendError(res, 404, 'Routine exercise not found or unauthorized');
        }
        return sendData(res, 200, { message: 'Exercise removed successfully' });
    } catch (error) {
        console.error('[Routines] Error removing exercise:', error);
        return sendError(res, 500, 'Failed to remove exercise from routine');
    }
};

exports.addSetToRoutineExercise = async (req, res) => {
    try {
        const { set_number, planned_weight, planned_reps, planned_time } = req.body;

        const set = await Routines.addSetToRoutineExercise(
            req.params.item_id, req.userId, set_number, planned_weight, planned_reps, planned_time
        );

        if (!set) {
            return sendError(res, 404, 'Routine exercise not found or unauthorized');
        }
        return sendData(res, 200, { set });
    } catch (error) {
        console.error('[Routines] Error adding set:', error);
        return sendError(res, 500, 'Failed to add set');
    }
};

exports.updateRoutineSet = async (req, res) => {
    try {
        const { planned_weight, planned_reps, planned_time } = req.body;

        // routine_sets caps these columns at 999.99; reject out-of-range values
        // up front so the user gets a 400 instead of a database driver error.
        if (isOutOfRange(planned_weight) || isOutOfRange(planned_reps) || isOutOfRange(planned_time)) {
            return sendError(res, 400, 'Value must be less than 1000');
        }

        const set = await Routines.updateRoutineSet(req.params.set_id, req.userId, planned_weight, planned_reps, planned_time);

        if (!set) {
            return sendError(res, 404, 'Routine set not found or unauthorized');
        }
        return sendData(res, 200, { set });
    } catch (error) {
        console.error('[Routines] Error updating set:', error);
        // 22003 is Postgres' numeric_value_out_of_range.
        const message = error?.code === '22003'
            ? 'Value exceeds maximum allowed (999.99)'
            : 'Failed to update set';
        return sendError(res, 500, message);
    }
};

exports.deleteRoutineSet = async (req, res) => {
    try {
        const deleted = await Routines.deleteRoutineSet(req.params.set_id, req.userId);

        if (!deleted) {
            return sendError(res, 404, 'Routine set not found or unauthorized');
        }
        return sendData(res, 200, {});
    } catch (error) {
        console.error('[Routines] Error deleting set:', error);
        return sendError(res, 500, 'Failed to delete set');
    }
};

function isOutOfRange(value) {
    return value != null && Math.abs(value) >= 1000;
}
