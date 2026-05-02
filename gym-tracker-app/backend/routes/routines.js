const express = require('express');
const router = express.Router();
const routineController = require('../controllers/routineController');
const authMiddleware = require('../middleware/auth');

router.get('/', authMiddleware, routineController.getUserRoutines);
router.get('/:id', authMiddleware, routineController.getRoutineById);
router.post('/', authMiddleware, routineController.createRoutine);
router.put('/:id', authMiddleware, routineController.updateRoutine);
router.delete('/:id', authMiddleware, routineController.deleteRoutine);

router.post('/:id/exercises', authMiddleware, routineController.addExerciseToRoutine);
router.put('/exercises/:item_id', authMiddleware, routineController.updateRoutineExercise);
router.delete('/exercises/:item_id', authMiddleware, routineController.removeExerciseFromRoutine);
router.post('/exercises/:item_id/sets', authMiddleware, routineController.addSetToRoutineExercise);
router.put('/sets/:set_id', authMiddleware, routineController.updateRoutineSet);
router.delete('/sets/:set_id', authMiddleware, routineController.deleteRoutineSet);


module.exports = router;