const express = require('express');
const router = express.Router();
const workoutController = require('../controllers/workoutController');
const authMiddleware = require('../middleware/auth');



router.get('/', authMiddleware, workoutController.getWorkouts);
router.get('/:id', authMiddleware, workoutController.getWorkoutById);
router.post('/', authMiddleware, workoutController.createWorkout);
router.put('/:id', authMiddleware, workoutController.updateWorkout);
router.delete('/:id', authMiddleware, workoutController.deleteWorkout);



router.post('/:id/sets', authMiddleware, workoutController.insertSet);
router.put('/sets/:setId', authMiddleware, workoutController.updateSet);
router.delete('/sets/:setId', authMiddleware, workoutController.deleteSet);


module.exports = router;