const express = require('express');
const router = express.Router();
const videoController = require('../controllers/videoController');
const upload = require('../middleware/upload');
const verifyToken = require('../middleware/auth');

// All video routes require authentication
router.use(verifyToken);

// POST /api/videos/pose-estimation
router.post('/pose-estimation', upload.single('video'), videoController.processPoseEstimation);

// POST /api/videos/barbell-tracking
router.post('/barbell-tracking', upload.single('video'), videoController.processBarbellTracking);

// GET /api/videos - list authenticated user's videos
router.get('/', videoController.getUserVideos);

module.exports = router;
