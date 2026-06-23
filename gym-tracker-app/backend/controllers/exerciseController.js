const Exercise = require('../models/exercise');

let exercisesCache = null;
let exercisesCacheTime = 0;
const CACHE_TTL = 5 * 60 * 1000;

const invalidateExercisesCache = () => {
  exercisesCache = null;
  exercisesCacheTime = 0;
};

exports.getExercises = async (req, res) => {
  console.log("Get all exercises request received");

  try {
    const page = req.query.page ? parseInt(req.query.page, 10) : null;
    const limit = req.query.limit ? parseInt(req.query.limit, 10) : null;

    const useCache = !page && !limit;

    if (useCache && exercisesCache && Date.now() - exercisesCacheTime < CACHE_TTL) {
      return res.status(200).json({
        success: true,
        data: exercisesCache.exercises,
        total: exercisesCache.total
      });
    }

    const result = await Exercise.getExercises(page, limit);

    if (!result) {
      return res.status(404).json({
        success: false,
        error: 'Exercises not found'
      });
    }

    if (useCache) {
      exercisesCache = result;
      exercisesCacheTime = Date.now();
    }

    res.status(200).json({
      success: true,
      data: result.exercises,
      total: result.total
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      error: 'Failed to get exercises'
    });
  }
}


// getExerciseById
exports.getExerciseById = async (req, res) => {
  console.log("Get exercices by id request received");
  try {
    const exercice = await Exercise.getExerciseById(req.params.id);
    if (!exercice) {
      return res.status(404).json({
        success: false,
        error: 'Exercise not found'
      });
    }

    res.status(200).json({
      success: true,
      data: exercice
    })

  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      error: 'Failed to get exercices, error'
    });

  }
}
// createExercise
exports.createExercise = async (req, res) => {
  console.log("Create exercices request received");
  try {

    const { exercice_name, body_part, target_muscle, secondary_muscles, equipment, difficulty, category, description, instructions } = req.body;

    const exercice = await Exercise.createExercise(exercice_name, body_part, target_muscle, secondary_muscles, equipment, difficulty, category, description, instructions);

    if (!exercice) {
      console.log("Error creating new exercise");
      return res.status(404).json({
        success: false,
        error: 'Couldnt create exercise'
      })
    }

    invalidateExercisesCache();

    return res.status(201).json({
      success: true,
      data: exercice
    })
  } catch (error) {
    console.log("Couldn't create the exercise");
    return res.status(500).json({
      success: false,
      error: 'Error creating new exercise'
    })
  }
}
// modifyExercise
exports.modifyExercise = async (req, res) => {
  console.log("Modify exercise request received");
  try {
    const id = req.params.id;

    const { exercice_name, body_part, target_muscle, secondary_muscles, equipment, difficulty, category, description, instructions } = req.body;

    const exercice = await Exercise.modifyExercise(id, exercice_name, body_part, target_muscle, secondary_muscles, equipment, difficulty, category, description, instructions);

    if (!exercice) {
      console.log("Error creating new exercise");
      return res.status(404).json({
        success: false,
        error: 'Couldnt modify exercise'
      })
    }

    invalidateExercisesCache();

    return res.status(200).json({
      success: true,
      data: exercice
    })

  } catch (error) {
    console.log("Couldn't modify the exercise");
    return res.status(500).json({
      success: false,
      error: 'Error modifying new exercise'
    })
  }

}
// deleteExercise
exports.deleteExercise = async (req, res) => {
  console.log("Delete exercise request received");
  try {
    await Exercise.deleteExercise(req.params.id);

    invalidateExercisesCache();

    return res.status(200).json({
      success: true,
    })

  } catch (error) {
    console.log("Couldn't delete the exercise");
    return res.status(500).json({
      success: false,
      error: 'Error deleting exercise'
    })
  }
}


exports.getFilterOptions = async (req, res) => {
  console.log("Get filter options request received");

  try {
    const filters = await Exercise.getFilterOptions();

    if (!filters) {
      return res.status(404).json({
        success: false,
        error: 'Filter options not found'
      });
    }

    res.status(200).json({
      success: true,
      data: filters
    });

  } catch (error) {
    console.error("Error fetching filter options:", error);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve filter options'
    });
  }
}

exports.getExerciseHistory = async (req, res) => {
  try {
    const exerciseId = parseInt(req.params.id);
    const userId = req.userId;

    if (isNaN(exerciseId)) {
      return res.status(400).json({ success: false, error: 'Invalid Exercise ID' });
    }

    const history = await Exercise.getExerciseHistory(userId, exerciseId);

    res.status(200).json({
      success: true,
      data: history
    });
  } catch (error) {
    console.error("Error fetching exercise history:", error);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve exercise history'
    });
  }
}