const express = require('express');
const router = express.Router();
const exerciseController = require('../controllers/exerciseController');
const authMiddleware = require('../middleware/auth');

router.get('/', authMiddleware, exerciseController.getExercises);
router.get('/filters', authMiddleware, exerciseController.getFilterOptions);
router.get('/:id', authMiddleware, exerciseController.getExerciseById);
router.post('/', authMiddleware, exerciseController.createExercise);
router.put('/:id', authMiddleware, exerciseController.modifyExercise);
router.delete('/:id', authMiddleware, exerciseController.deleteExercise);


module.exports = router;