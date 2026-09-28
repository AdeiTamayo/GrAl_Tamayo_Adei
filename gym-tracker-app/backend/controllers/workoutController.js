const Workout = require('../models/workout');
const PR = require('../models/pr');
const { sendData, sendError } = require('../utils/httpResponses');

/** Return all workouts belonging to the authenticated user. */
exports.getWorkouts = async (req, res) => {
    try {
        const workouts = await Workout.getWorkouts(req.userId);
        return sendData(res, 200, { data: workouts });
    } catch (error) {
        console.error('[Workouts] Error fetching workouts:', error);
        return sendError(res, 500, 'Failed to get workouts');
    }
};

/** Return one workout owned by the authenticated user. */
exports.getWorkoutById = async (req, res) => {
    try {
        const workout = await Workout.getWorkoutById(req.params.id, req.userId);

        if (!workout) {
            return sendError(res, 404, 'Workout not found');
        }
        return sendData(res, 200, { data: workout });
    } catch (error) {
        console.error('[Workouts] Error fetching workout:', error);
        return sendError(res, 500, 'Failed to get workout');
    }
};

/** Create a workout for the authenticated user. */
exports.createWorkout = async (req, res) => {
    try {
        const { name, date, note } = req.body;

        const workout = await Workout.createWorkout(req.userId, name, date, note);

        if (!workout) {
            return sendError(res, 404, 'Could not create workout');
        }
        return sendData(res, 201, { data: workout });
    } catch (error) {
        console.error('[Workouts] Error creating workout:', error);
        return sendError(res, 500, 'Error creating new workout');
    }
};

/** Update a workout owned by the authenticated user. */
exports.updateWorkout = async (req, res) => {
    try {
        const { name, date, note } = req.body;
        const workout = await Workout.updateWorkout(req.params.id, req.userId, name, date, note);

        if (!workout) {
            return sendError(res, 404, 'Workout not found or unauthorized');
        }
        return sendData(res, 200, { data: workout });
    } catch (error) {
        console.error('[Workouts] Error updating workout:', error);
        return sendError(res, 500, 'Error modifying workout');
    }
};

/** Delete a workout owned by the authenticated user. */
exports.deleteWorkout = async (req, res) => {
    try {
        const deleted = await Workout.deleteWorkout(req.params.id, req.userId);

        if (!deleted) {
            return sendError(res, 404, 'Workout not found or unauthorized');
        }
        return sendData(res, 200, {});
    } catch (error) {
        console.error('[Workouts] Error deleting workout:', error);
        return sendError(res, 500, 'Error deleting Workout');
    }
};

/** Add an exercise to a workout. */
exports.addWorkoutExercise = async (req, res) => {
    try {
        const { exercise_id, note } = req.body;
        const row = await Workout.addWorkoutExercise(req.params.id, req.userId, exercise_id, note);

        if (!row) {
            return sendError(res, 404, 'Workout not found or unauthorized');
        }
        return sendData(res, 201, { data: row });
    } catch (error) {
        console.error('[Workouts] Error adding exercise:', error);
        return sendError(res, 500, 'Failed to add exercise');
    }
};

/** Remove an exercise from a workout. */
exports.deleteWorkoutExercise = async (req, res) => {
    try {
        const deleted = await Workout.deleteWorkoutExercise(req.params.workoutExerciseId, req.userId);

        if (!deleted) {
            return sendError(res, 404, 'Exercise not found or unauthorized');
        }
        return sendData(res, 200, {});
    } catch (error) {
        console.error('[Workouts] Error deleting exercise:', error);
        return sendError(res, 500, 'Failed to delete exercise from workout');
    }
};

/** Add a set to a workout exercise and check whether it creates a PR. */
exports.addSet = async (req, res) => {
    try {
        const { weight, reps, time, note, rpe } = req.body;
        const workoutExerciseId = req.params.workoutExerciseId;

        const row = await Workout.insertSet(workoutExerciseId, req.userId, weight, reps, time, note, rpe);
        if (!row) {
            return sendError(res, 404, 'Exercise not found or unauthorized');
        }

        // A PR is a bonus, not a precondition: if the check fails the set is
        // still saved, so logging a workout is never blocked by it.
        let isPr = false;
        try {
            const exerciseId = await Workout.getExerciseIdForWorkoutExercise(workoutExerciseId, req.userId);
            if (exerciseId && weight > 0 && reps > 0) {
                const pr = await PR.checkAndLogPR(req.userId, exerciseId, weight, reps, null, note);
                isPr = pr !== null;
            }
        } catch (prError) {
            console.error('[Workouts] PR check failed (non-blocking):', prError.message);
        }

        return sendData(res, 201, { data: row, isPr });
    } catch (error) {
        console.error('[Workouts] Error adding set:', error);
        return sendError(res, 500, 'Failed to add set');
    }
};

/** Update a set owned by the authenticated user. */
exports.updateSet = async (req, res) => {
    try {
        const { weight, reps, time, note, rpe } = req.body;
        const set = await Workout.updateSet(req.params.setId, req.userId, weight, reps, time, note, rpe);

        if (!set) {
            return sendError(res, 404, 'Set not found or unauthorized');
        }
        return sendData(res, 200, { data: set });
    } catch (error) {
        console.error('[Workouts] Error updating set:', error);
        return sendError(res, 500, 'Failed to update set');
    }
};

/** Delete a set owned by the authenticated user. */
exports.deleteSet = async (req, res) => {
    try {
        const deleted = await Workout.deleteSet(req.params.setId, req.userId);

        if (!deleted) {
            return sendError(res, 404, 'Set not found or unauthorized');
        }
        return sendData(res, 200, {});
    } catch (error) {
        console.error('[Workouts] Error deleting set:', error);
        return sendError(res, 500, 'Failed to delete set');
    }
};
