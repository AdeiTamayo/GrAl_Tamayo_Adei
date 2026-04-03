const express = require('express');
const router = express.Router();
const exerciseController = require('../controllers/exerciseController');
const authMiddleware = require('../middleware/auth');

// GET /api/exercises
router.get('/', authMiddleware, exerciseController.getExercises);

module.exports = router;