const express = require('express');
const router = express.Router();
const prController = require('../controllers/prController');
const authMiddleware = require('../middleware/auth');

router.get('/', authMiddleware, prController.getPrSummary);
router.get('/:id/history', authMiddleware, prController.getPrHistory);
router.post('/', authMiddleware, prController.createPR);
router.delete('/:id', authMiddleware, prController.deletePR);

module.exports = router;