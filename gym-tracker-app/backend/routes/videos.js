const express = require('express');
const router = express.Router();
const videoController = require('../controllers/videoController');
const upload = require('../middleware/upload');

// POST /api/videos/pose-estimation
router.post('/pose-estimation', upload.single('video'), videoController.processPoseEstimation);

// POST /api/videos/barbell-tracking
router.post('/barbell-tracking', upload.single('video'), videoController.processBarbellTracking);

module.exports = router;
