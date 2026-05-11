const express = require('express');
const router = express.Router();
const workoutController = require('../controllers/workoutController');
const authMiddleware = require('../middleware/auth');



router.get('/', authMiddleware, workoutController.getWorkouts);
router.post('/', authMiddleware, workoutController.createWorkout);
router.get('/:id', authMiddleware, workoutController.getWorkoutById);
router.put('/:id', authMiddleware, workoutController.updateWorkout);
router.delete('/:id', authMiddleware, workoutController.deleteWorkout);

router.post('/:id/exercises', workoutController.addWorkoutExercise);
router.delete('/exercises/:workoutExerciseId', workoutController.deleteWorkoutExercise);
router.post('/exercises/:workoutExerciseId/sets', workoutController.addSet);
router.put('/sets/:setId', authMiddleware, workoutController.updateSet);
router.delete('/sets/:setId', authMiddleware, workoutController.deleteSet);


module.exports = router;