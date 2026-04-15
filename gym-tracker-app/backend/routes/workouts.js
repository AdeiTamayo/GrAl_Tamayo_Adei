const express = require('express');
const router = express.Router();
const workoutController = require('../controllers/workoutController');
const authMiddleware = require('../middleware/auth');

// -------------- Workouts --------------

// GET /api/workouts - Get all workouts of user 
router.get('/', authMiddleware, workoutController.getWorkouts);

// GET /api/workouts/:id - Get a specific workout by ID
router.get('/:id', authMiddleware, workoutController.getWorkoutById);

// POST /api/workouts - Create a new empty workout
router.post('/', authMiddleware, workoutController.createWorkout);

// PUT /api/workouts/:id - Update workout details (e.g., name, notes)
router.put('/:id', authMiddleware, workoutController.updateWorkout);

// DELETE /api/workouts/:id - Delete a workout
router.delete('/:id', authMiddleware, workoutController.deleteWorkout);


// -------------- Sets (Nested under workouts) --------------

// POST /api/workouts/:id/sets - Insert a new set into a specific workout
router.post('/:id/sets', authMiddleware, workoutController.insertSet);

// PUT /api/workouts/sets/:setId - Update a specific set (reps, weight, etc.)
router.put('/sets/:setId', authMiddleware, workoutController.updateSet);

// DELETE /api/workouts/sets/:setId - Delete a specific set
router.delete('/sets/:setId', authMiddleware, workoutController.deleteSet);


module.exports = router;