const express = require('express');
const router = express.Router();
const exerciseController = require('../controllers/exerciseController');

// GET /api/exercises
router.get('/', exerciseController.getExercises);

module.exports = router;
