const Routines = require('../models/routines');

exports.getUserRoutines = async (req, res) => {
    console.log("Get all user routines request received");
    try {
        const routines = await Routines.getUserRoutines(req.userId);

        if (!routines) {
            console.log('Routines not found');
            return res.status(404).json({
                success: false,
                error: 'Routines not found'
            })
        }

        res.json({
            success: true,
            routines
        })

    } catch (error) {
        console.log('Failed to fetch routines');
        res.status(500).json({ success: false, error: 'Failed to fetch routines' });
    }
}

exports.getRoutineById = async (req, res) => {
    console.log("Get routines by id request received");
    try {
        const routineId = req.params.id;
        const routine = await Routines.getRoutineById(routineId, req.userId);

        if (!routine) {
            console.log('Routine not found');
            return res.status(404).json({
                success: false,
                error: 'Routine not found'
            })
        }

        res.json({
            success: true,
            data: routine
        })
    } catch (error) {
        console.log('Failed to fetch routine with id');
        res.status(500).json({ success: false, error: 'Failed to fetch routine with id' });
    }
}

exports.createRoutine = async (req, res) => {
    console.log("Create user routine request received");
    try {
        const userId = req.userId;
        const { name } = req.body;

        const routine = await Routines.createRoutine(userId, name);

        if (!routine) {
            console.log('Failed to create routine');
            return res.status(404).json({
                success: false,
                error: 'Could not create routine'
            })
        }

        res.status(201).json({
            success: true,
            data: routine
        })
    } catch (error) {
        console.log('Failed to create routine');
        res.status(500).json({ success: false, error: 'Failed to create routine' });
    }
}

exports.updateRoutine = async (req, res) => {
    console.log("Update routine request received");
    try {
        const routineId = req.params.id;
        const userId = req.userId;
        const { name, note } = req.body;

        const updatedRoutine = await Routines.updateRoutine(routineId, userId, name, note);

        if (!updatedRoutine) {
            return res.status(404).json({
                success: false,
                error: 'Routine not found or you do not have permission to edit it.'
            });
        }

        res.json({
            success: true,
            data: updatedRoutine
        });

    } catch (error) {
        console.error("Error updating routine:", error);
        return res.status(500).json({
            success: false,
            error: 'Failed to update routine'
        });
    }
}

exports.deleteRoutine = async (req, res) => {
    console.log("Delete routine request received");
    try {
        const routineId = req.params.id;
        const userId = req.userId;

        const deleted = await Routines.deleteRoutine(routineId, userId);

        if (!deleted) {
            return res.status(404).json({ success: false, error: 'Routine not found or unauthorized' });
        }

        res.json({ success: true, message: 'Routine deleted successfully' });
    } catch (error) {
        console.error("Error deleting routine:", error);
        res.status(500).json({ success: false, error: 'Failed to delete routine' });
    }
}

exports.addExerciseToRoutine = async (req, res) => {
    console.log("Add exercise to routine request received");
    try {
        const routineId = req.params.id;
        const userId = req.userId;
        const { exercise_id, exercise_order, planned_sets, planned_reps, planned_weight, note } = req.body;

        const addedExercise = await Routines.addExerciseToRoutine(routineId, userId, exercise_id, exercise_order, planned_sets, planned_reps, planned_weight, note);

        if (!addedExercise) {
            return res.status(404).json({ success: false, error: 'Failed to add exercise or unauthorized' });
        }

        res.json({ success: true, data: addedExercise });
    } catch (error) {
        console.error("Error adding exercise:", error);
        res.status(500).json({ success: false, error: 'Failed to add exercise to routine' });
    }
}

exports.updateRoutineExercise = async (req, res) => {
    console.log("Update routine exercise request received");
    try {
        const itemId = req.params.item_id;
        const userId = req.userId;
        const { exercise_order, planned_sets, planned_reps, planned_weight, note } = req.body;

        const updatedExercise = await Routines.updateRoutineExercise(itemId, userId, exercise_order, planned_sets, planned_reps, planned_weight, note);

        if (!updatedExercise) {
            return res.status(404).json({ success: false, error: 'Routine exercise not found or unauthorized' });
        }

        res.json({ success: true, data: updatedExercise });
    } catch (error) {
        console.error("Error updating routine exercise:", error);
        res.status(500).json({ success: false, error: 'Failed to update routine exercise' });
    }
}

exports.removeExerciseFromRoutine = async (req, res) => {
    console.log("Remove exercise from routine request received");
    try {
        const itemId = req.params.item_id;
        const userId = req.userId;

        const removed = await Routines.removeExerciseFromRoutine(itemId, userId);

        if (!removed) {
            return res.status(404).json({ success: false, error: 'Routine exercise not found or unauthorized' });
        }

        res.json({ success: true, message: 'Exercise removed successfully' });
    } catch (error) {
        console.error("Error removing exercise:", error);
        res.status(500).json({ success: false, error: 'Failed to remove exercise from routine' });
    }
}

exports.addSetToRoutineExercise = async (req, res) => {
    try {
        const { set_number, planned_weight, planned_reps, planned_time } = req.body;
        const set = await Routines.addSetToRoutineExercise(req.params.item_id, set_number, planned_weight, planned_reps, planned_time);
        res.json({ success: true, set });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Failed to add set' });
    }
};

exports.updateRoutineSet = async (req, res) => {
    try {
        const { planned_weight, planned_reps, planned_time } = req.body;
        const updated = await Routines.updateRoutineSet(req.params.set_id, planned_weight, planned_reps, planned_time);
        res.json({ success: true, set: updated });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Failed to update set' });
    }
};

exports.deleteRoutineSet = async (req, res) => {
    try {
        const deleted = await Routines.deleteRoutineSet(req.params.set_id);
        res.json({ success: deleted });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Failed to delete set' });
    }
};