const express = require('express');
const router = express.Router();
const videoController = require('../controllers/videoController');
const upload = require('../middleware/upload');
const authMiddleware = require('../middleware/auth');

router.post('/pose-estimation', authMiddleware, upload.single('video'), videoController.processPoseEstimation);
router.post('/barbell-tracking', authMiddleware, upload.single('video'), videoController.processBarbellTracking);
router.get('/', authMiddleware, videoController.getUserVideos);

module.exports = router;
