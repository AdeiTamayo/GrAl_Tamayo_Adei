const Exercise = require('../models/exercise');

exports.getExercises = async (req, res) => {
  console.log("Get all exercises request received");

  try {
    const exercices = await Exercise.getExercises();

    if (!exercices) {
      return res.status(404).json({
        success: false,
        error: 'Exercises not found'
      });
    }

    res.json({
      success: true,
      data: exercices
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

    res.json({
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

    return res.json({
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
    id = req.params.id;

    const { exercice_name, body_part, target_muscle, secondary_muscles, equipment, difficulty, category, description, instructions } = req.body;

    const exercice = await Exercise.modifyExercise(id, exercice_name, body_part, target_muscle, secondary_muscles, equipment, difficulty, category, description, instructions);

    if (!exercice) {
      console.log("Error creating new exercise");
      return res.status(404).json({
        success: false,
        error: 'Couldnt modify exercise'
      })
    }

    return res.json({
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

    return res.json({
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

    res.json({
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