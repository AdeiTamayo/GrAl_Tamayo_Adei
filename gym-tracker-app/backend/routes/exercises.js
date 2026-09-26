const express = require('express');
const router = express.Router();
const exerciseController = require('../controllers/exerciseController');
const authMiddleware = require('../middleware/auth');
const invalidateExerciseCache = require('../middleware/invalidateExerciseCache');

router.get('/', authMiddleware, exerciseController.getExercises);
router.get('/filters', authMiddleware, exerciseController.getFilterOptions);
router.get('/:id', authMiddleware, exerciseController.getExerciseById);
router.get('/:id/history', authMiddleware, exerciseController.getExerciseHistory);

// Every write route invalidates the read-through exercise cache.
router.post('/', authMiddleware, invalidateExerciseCache, exerciseController.createExercise);
router.put('/:id', authMiddleware, invalidateExerciseCache, exerciseController.modifyExercise);
router.delete('/:id', authMiddleware, invalidateExerciseCache, exerciseController.deleteExercise);

module.exports = router;
