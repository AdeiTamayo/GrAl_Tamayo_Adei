const express = require('express');
const router = express.Router();
const goalController = require('../controllers/goalController');
const authMiddleware = require('../middleware/auth');

router.get('/', authMiddleware, goalController.getGoals);
router.post('/', authMiddleware, goalController.createGoal);
router.put('/:id', authMiddleware, goalController.updateGoal);
router.delete('/:id', authMiddleware, goalController.deleteGoal);

module.exports = router;