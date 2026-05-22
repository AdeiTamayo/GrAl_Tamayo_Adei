const express = require('express');
const router = express.Router();
const videoController = require('../controllers/videoController');
const upload = require('../middleware/upload');
const authMiddleware = require('../middleware/auth');

// router.use(verifyToken);
router.post('/pose-estimation', upload.single('video'), authMiddleware, videoController.processPoseEstimation);
router.post('/barbell-tracking', upload.single('video'), authMiddleware, videoController.processBarbellTracking);
router.get('/', authMiddleware, videoController.getUserVideos);

module.exports = router;
