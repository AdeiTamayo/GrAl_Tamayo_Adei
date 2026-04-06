const express = require('express');
const router = express.Router();
const exerciseController = require('../controllers/exerciseController');
const authMiddleware = require('../middleware/auth');


//-------------- Exercises --------------

// GET /api/exercises - Get all exercises with values to be able to filter
router.get('/', authMiddleware, exerciseController.getExercises);

// GET /api/exercises/filters - Get the filters in order to query exercices (muscle, equipment, exercice_type)
router.get('/filters', authMiddleware, exerciseController.getFilterOptions);

// GET /api/exercises/:id - Get specific exercise details
router.get('/:id', authMiddleware, exerciseController.getExerciseById);

// POST /api/exercises - Create a custom exercise
router.post('/', authMiddleware, exerciseController.createExercise);

// PUT /api/exercises/:id - Update a custom exercise
router.put('/:id', authMiddleware, exerciseController.modifyExercise);

// DELETE /api/exercises/:id - Remove a custom exercise
router.delete('/:id', authMiddleware, exerciseController.deleteExercise);


module.exports = router;