const Workout = require('../models/workout');
const PR = require('../models/pr');

exports.getWorkouts = async (req, res) => {
    console.log("Get all workouts request received");

    try {

        const userId = req.userId;

        const workouts = await Workout.getWorkouts(userId);

        if (!workouts) {
            return res.status(404).json({
                success: false,
                error: 'Workout not found'
            });
        }

        res.json({
            success: true,
            data: workouts
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            success: false,
            error: 'Failed to get workouts'
        });
    }
}

// getWorkoutById
exports.getWorkoutById = async (req, res) => {
    console.log("Get workout by id request received");
    try {
        const workout = await Workout.getWorkoutById(req.params.id, req.userId);
        if (!workout) {
            return res.status(404).json({
                success: false,
                error: 'Workout not found'
            });
        }
        res.json({
            success: true,
            data: workout
        })

    } catch (error) {
        console.log(error);
        return res.status(500).json({
            success: false,
            error: 'Failed to get workout'
        });

    }


}

exports.createWorkout = async (req, res) => {
    console.log("Create workout request received");
    try {
        const { name, date, note } = req.body
        // ID is going to be created in the database so no need to pass            
        // Date could be personalized /= from the current date

        const userId = req.userId;

        const workout = await Workout.createWorkout(userId, name, date, note);

        if (!workout) {
            console.log("Error creating new workout");
            return res.status(404).json({
                success: false,
                error: 'Couldnt create workout'
            })
        }

        return res.status(201).json({
            success: true,
            data: workout
        });


    } catch (error) {
        console.log("Couldn't create the workout");
        return res.status(500).json({
            success: false,
            error: 'Error creating new workout'
        })
    }
}

// updateWorkout
exports.updateWorkout = async (req, res) => {
    console.log("Modify workout request received");
    try {
        const id = req.params.id;

        const { name, date, note } = req.body;

        const workout = await Workout.updateWorkout(id, name, date, note);

        if (!workout) {
            console.log("Error modifying new workout");
            return res.status(404).json({
                success: false,
                error: 'Couldnt modify workout'
            })
        }

        return res.json({
            success: true,
            data: workout
        })

    } catch (error) {
        console.log("Couldn't modify the workout");
        return res.status(500).json({
            success: false,
            error: 'Error modifying workout'
        })
    }

}

// deleteWorkout
exports.deleteWorkout = async (req, res) => {
    console.log("Delete workout request received");
    try {
        const deleted = await Workout.deleteWorkout(req.params.id, req.userId);

        if (!deleted) {
            return res.status(404).json({
                success: false,
                error: 'Workout not found or unauthorized'
            });
        }

        return res.json({
            success: true,
        })

    } catch (error) {
        console.log("Couldn't delete the Workout");
        return res.status(500).json({
            success: false,
            error: 'Error deleting Workout'
        })
    }
}

exports.addWorkoutExercise = async (req, res) => {
    try {
        const workoutId = req.params.id;
        const { exercise_id, note } = req.body;

        const row = await Workout.addWorkoutExercise(workoutId, exercise_id, note);
        return res.status(201).json({ success: true, data: row });
    } catch (error) {
        console.error('[Controller] Add Workout Exercise Error:', error);
        return res.status(500).json({ success: false, error: 'Failed to add exercise' });
    }
};

exports.deleteWorkoutExercise = async (req, res) => {
    try {
        const workoutExerciseId = req.params.workoutExerciseId;
        const deleted = await Workout.deleteWorkoutExercise(workoutExerciseId, req.userId);
        if (!deleted) {
            return res.status(404).json({ success: false, error: 'Exercise not found or unauthorized' });
        }
        return res.status(200).json({ success: true });
    } catch (error) {
        console.error('[Controller] Delete Workout Exercise Error:', error);
        return res.status(500).json({ success: false, error: 'Failed to delete exercise from workout' });
    }
};

exports.addSet = async (req, res) => {
    try {
        const workoutExerciseId = req.params.workoutExerciseId;
        const { weight, reps, time, note } = req.body;

        const row = await Workout.insertSet(workoutExerciseId, weight, reps, time, note);

        let isPr = false;
        try {
            const exerciseId = await Workout.getExerciseIdForWorkoutExercise(workoutExerciseId, req.userId);
            if (exerciseId && weight > 0 && reps > 0) {
                const pr = await PR.checkAndLogPR(req.userId, exerciseId, weight, reps, null, note);
                isPr = pr !== null;
            }
        } catch (prError) {
            console.error('[Controller] PR check failed (non-blocking):', prError.message);
        }

        return res.status(201).json({ success: true, data: row, isPr });
    } catch (error) {
        console.error('[Controller] Add Set Error:', error);
        return res.status(500).json({ success: false, error: 'Failed to add set' });
    }
};


// updateSet
exports.updateSet = async (req, res) => {
    try {
        const setId = req.params.setId;
        const { weight, reps, time, note } = req.body;

        const query = `
            UPDATE sets 
            SET weight = $1, repetitions = $2, time = $3, note = $4
            WHERE id = $5 RETURNING *;
        `;
        const pool = require('../config/database');
        const result = await pool.query(query, [weight, reps, time, note, setId]);

        return res.status(200).json({ success: true, data: result.rows[0] });
    } catch (error) {
        console.error('[Controller] Update Set Error:', error);
        return res.status(500).json({ success: false, error: 'Failed to update set' });
    }
};

// deleteSet
exports.deleteSet = async (req, res) => {
    try {
        const setId = req.params.setId;
        const deleted = await Workout.deleteSet(setId, req.userId);
        if (!deleted) {
            return res.status(404).json({ success: false, error: 'Set not found or unauthorized' });
        }
        return res.status(200).json({ success: true });
    } catch (error) {
        console.error('[Controller] Delete Set Error:', error);
        return res.status(500).json({ success: false, error: 'Failed to delete set' });
    }
};