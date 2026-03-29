const express = require('express');
const router = express.Router();
const profileController = require('../controllers/profileController');
const authMiddleware = require('../middleware/auth');

// GET /api/profile/getProfile
router.get('/getProfile', authMiddleware, profileController.getProfile);

module.exports = router;

