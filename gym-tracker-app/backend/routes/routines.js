const express = require('express');
const router = express.Router();
const routineController = require('../controllers/routineController');
const authMiddleware = require('../middleware/auth');

//-------------- Routines --------------

// GET /api/exercises/routines - Get all routines for the logged-in user
router.get('/', authMiddleware, routineController.getUserRoutines);

// GET /api/exercises/routines/:id - Get a specific routine + its exercises
router.get('/:id', authMiddleware, routineController.getRoutineById);

// POST /api/exercises/routines - Create a new routine (e.g., "Leg Day")
router.post('', authMiddleware, routineController.createRoutine);

// PUT /api/exercises/routines/:id - Update routine name or notes
router.put('/:id', authMiddleware, routineController.updateRoutine);

// DELETE /api/exercises/routines/:id - Delete a routine
router.delete('/:id', authMiddleware, routineController.deleteRoutine);


//-------------- Routine Exercises --------------

// POST /api/exercises/routines/:id/exercises - Add an exercise to a routine
router.post('/:id/exercises', authMiddleware, routineController.addExerciseToRoutine);

// PUT /api/exercises/routines/exercises/:item_id - Update planned sets/reps for a specific item
router.put('/exercises/:item_id', authMiddleware, routineController.updateRoutineExercise);

// DELETE /api/exercises/routines/exercises/:item_id - Remove an exercise from a routine
router.delete('/exercises/:item_id', authMiddleware, routineController.removeExerciseFromRoutine);


module.exports = router;