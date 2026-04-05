const express = require('express');
const router = express.Router();
const routineController = require('../controllers/routineController');
const authMiddleware = require('../middleware/auth');

//-------------- Routines --------------

// GET /api/exercises/routines - Get all routines for the logged-in user
router.get('/routines', authMiddleware, routineController.getUserRoutines);

// GET /api/exercises/routines/:id - Get a specific routine + its exercises
router.get('/routines/:id', authMiddleware, routineController.getRoutineById);

// POST /api/exercises/routines - Create a new routine (e.g., "Leg Day")
router.post('/routines', authMiddleware, routineController.createRoutine);

// PUT /api/exercises/routines/:id - Update routine name or notes
router.put('/routines/:id', authMiddleware, routineController.updateRoutine);

// DELETE /api/exercises/routines/:id - Delete a routine
router.delete('/routines/:id', authMiddleware, routineController.deleteRoutine);


//-------------- Routine Exercises --------------

// POST /api/exercises/routines/:id/exercises - Add an exercise to a routine
router.post('/routines/:id/exercises', authMiddleware, routineController.addExerciseToRoutine);

// PUT /api/exercises/routines/exercises/:item_id - Update planned sets/reps for a specific item
router.put('/routines/exercises/:item_id', authMiddleware, routineController.updateRoutineExercise);

// DELETE /api/exercises/routines/exercises/:item_id - Remove an exercise from a routine
router.delete('/routines/exercises/:item_id', authMiddleware, routineController.removeExerciseFromRoutine);


module.exports = router;