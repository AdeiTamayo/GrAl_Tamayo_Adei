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
        const workout = await Workout.getWorkoutById(req.params.id);
        if (!workout) {
            return res.status(404).json({
                success: false,
                error: 'Workout not found'
            });
        }

        console.log("Workout in controller", workout);

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
        await Workout.deleteWorkout(req.params.id);

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


// insertSet
exports.insertSet = async (req, res) => {
    console.log("Insert set request received");
    try {
        const workoutId = req.params.id;
        const { exercise_id, weight, reps, time, note } = req.body;
        const userId = req.userId;

        const set = await Workout.insertSet(workoutId, exercise_id, weight, reps, time, note);

        // TODO: Add date as 5. parameter
        await PR.checkAndLogPR(userId, exercise_id, weight, reps, null, "");

        return res.status(201).json({
            success: true,
            data: set
        });
    } catch (error) {
        console.log("Couldn't insert set", error);
        return res.status(500).json({
            success: false,
            error: 'Error inserting set'
        });
    }
};

// updateSet
exports.updateSet = async (req, res) => {
    console.log("Update set request received");
    try {
        const setId = req.params.setId;
        const { weight, reps, time } = req.body;

        const updatedSet = await Workout.updateSet(setId, weight, reps, time);

        return res.json({
            success: true,
            data: updatedSet
        });
    } catch (error) {
        console.log("Couldn't update set", error);
        return res.status(500).json({
            success: false,
            error: 'Error updating set'
        });
    }
};

// deleteSet
exports.deleteSet = async (req, res) => {
    console.log("Delete set request received");
    try {
        const setId = req.params.setId;

        await Workout.deleteSet(setId);

        return res.json({
            success: true
        });
    } catch (error) {
        console.log("Couldn't delete set", error);
        return res.status(500).json({
            success: false,
            error: 'Error deleting set'
        });
    }
};