const express = require('express');
const router = express.Router();
const videoController = require('../controllers/videoController');
const upload = require('../middleware/upload');
const verifyToken = require('../middleware/auth');

router.use(verifyToken);
router.post('/pose-estimation', upload.single('video'), videoController.processPoseEstimation);
router.post('/barbell-tracking', upload.single('video'), videoController.processBarbellTracking);
router.get('/', videoController.getUserVideos);

module.exports = router;
