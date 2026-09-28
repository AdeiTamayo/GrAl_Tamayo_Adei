const Exercise = require('../models/exercise');
const { getCachedExercises, setCachedExercises } = require('../utils/exerciseCache');

/**
 * Parse a positive integer query parameter, or return null when absent/invalid.
 */
function parsePositiveInt(value) {
    if (value === undefined) return null;
    const parsed = parseInt(value, 10);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

/** Return the exercise catalog, using the cache for the full unpaginated list. */
exports.getExercises = async (req, res) => {
    try {
        const page = parsePositiveInt(req.query.page);
        const limit = parsePositiveInt(req.query.limit);

        // Only the full unpaginated list is cached; paginated results differ per request.
        const cacheable = page === null && limit === null;

        if (cacheable) {
            const cached = getCachedExercises();
            if (cached) {
                return res.status(200).json({
                    success: true,
                    data: cached.exercises,
                    total: cached.total
                });
            }
        }

        const result = await Exercise.getExercises(page, limit);

        if (cacheable) {
            setCachedExercises(result);
        }

        return res.status(200).json({
            success: true,
            data: result.exercises,
            total: result.total
        });
    } catch (error) {
        console.error('[Exercises] Error fetching exercises:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to get exercises'
        });
    }
};

/** Return one exercise by its identifier. */
exports.getExerciseById = async (req, res) => {
    try {
        const exercise = await Exercise.getExerciseById(req.params.id);

        if (!exercise) {
            return res.status(404).json({
                success: false,
                error: 'Exercise not found'
            });
        }

        return res.status(200).json({
            success: true,
            data: exercise
        });
    } catch (error) {
        console.error('[Exercises] Error fetching exercise by id:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to get exercise'
        });
    }
};

/** Create a new exercise from the submitted exercise details. */
exports.createExercise = async (req, res) => {
    try {
        // `exercice_name` is the historical request field name; the database
        // column is `name`. Kept as-is so existing clients keep working.
        const { exercice_name, body_part, target_muscle, secondary_muscles, equipment, difficulty, category, description, instructions } = req.body;

        if (!exercice_name) {
            return res.status(400).json({
                success: false,
                error: 'Exercise name is required'
            });
        }

        const exercise = await Exercise.createExercise(
            exercice_name, body_part, target_muscle, secondary_muscles,
            equipment, difficulty, category, description, instructions
        );

        if (!exercise) {
            return res.status(404).json({
                success: false,
                error: 'Could not create exercise'
            });
        }

        return res.status(201).json({
            success: true,
            data: exercise
        });
    } catch (error) {
        console.error('[Exercises] Error creating exercise:', error);
        return res.status(500).json({
            success: false,
            error: 'Error creating new exercise'
        });
    }
};

/** Update an existing exercise and return the modified record. */
exports.modifyExercise = async (req, res) => {
    try {
        const { exercice_name, body_part, target_muscle, secondary_muscles, equipment, difficulty, category, description, instructions } = req.body;

        const exercise = await Exercise.modifyExercise(
            req.params.id, exercice_name, body_part, target_muscle, secondary_muscles,
            equipment, difficulty, category, description, instructions
        );

        if (!exercise) {
            return res.status(404).json({
                success: false,
                error: 'Exercise not found'
            });
        }

        return res.status(200).json({
            success: true,
            data: exercise
        });
    } catch (error) {
        console.error('[Exercises] Error modifying exercise:', error);
        return res.status(500).json({
            success: false,
            error: 'Error modifying exercise'
        });
    }
};

/** Delete an exercise by its identifier. */
exports.deleteExercise = async (req, res) => {
    try {
        const deleted = await Exercise.deleteExercise(req.params.id);

        if (!deleted) {
            return res.status(404).json({
                success: false,
                error: 'Exercise not found'
            });
        }

        return res.status(200).json({ success: true });
    } catch (error) {
        console.error('[Exercises] Error deleting exercise:', error);
        return res.status(500).json({
            success: false,
            error: 'Error deleting exercise'
        });
    }
};

/** Return the available exercise filter values. */
exports.getFilterOptions = async (req, res) => {
    try {
        const filters = await Exercise.getFilterOptions();

        if (!filters) {
            return res.status(404).json({
                success: false,
                error: 'Filter options not found'
            });
        }

        return res.status(200).json({
            success: true,
            data: filters
        });
    } catch (error) {
        console.error('[Exercises] Error fetching filter options:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to retrieve filter options'
        });
    }
};

/** Return the authenticated user's workout history for an exercise. */
exports.getExerciseHistory = async (req, res) => {
    try {
        const exerciseId = parseInt(req.params.id, 10);

        if (!Number.isInteger(exerciseId) || exerciseId <= 0) {
            return res.status(400).json({ success: false, error: 'Invalid Exercise ID' });
        }

        const history = await Exercise.getExerciseHistory(req.userId, exerciseId);

        return res.status(200).json({
            success: true,
            data: history
        });
    } catch (error) {
        console.error('[Exercises] Error fetching exercise history:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to retrieve exercise history'
        });
    }
};
