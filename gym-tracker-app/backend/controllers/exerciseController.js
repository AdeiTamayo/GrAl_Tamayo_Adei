const Exercise = require('../models/exercise');

exports.getExercises = async (req, res) => {
  console.log("Get exercises request received");
  try {
    // Currently hardcoded to fetch ID 1
    const exercise = await Exercise.getExerciseById(1);

    if (!exercise) {
      return res.status(404).json({
        success: false,
        error: 'Exercise not found'
      });
    }

    res.json({
      success: true,
      data: [exercise]
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: 'Failed to get exercises' });
  }
};