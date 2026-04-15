const express = require('express');
const router = express.Router();
const prController = require('../controllers/prController');
const authMiddleware = require('../middleware/auth');

// GET /api/prs - Get absolute best PR per exercise
router.get('/', authMiddleware, prController.getPrSummary);

// GET /api/prs/:exerciseId/history - Get timeline of PRs for a specific exercise
router.get('/:exerciseId/history', authMiddleware, prController.getPrHistory);

// POST /api/prs - Manually create a PR
router.post('/', authMiddleware, prController.createPR);

module.exports = router;