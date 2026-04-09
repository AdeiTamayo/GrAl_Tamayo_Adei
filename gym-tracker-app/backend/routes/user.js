const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const userController = require('../controllers/userController');

// POST /api/auth/login
router.post('/login', userController.login);

// POST /api/auth/register
router.post('/register', userController.register);

// GET /api/profile/getProfile
router.get('/getProfile', authMiddleware, userController.getProfile);

// PUT /api/profile/updateProfile
router.put('/updateProfile', authMiddleware, userController.updateProfile);

// DELETE /api/profile/deleteProfile
router.delete('/deleteProfile', authMiddleware, userController.deleteUser);

module.exports = router;
