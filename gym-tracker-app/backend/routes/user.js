const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const userController = require('../controllers/userController');

// POST /api/user/login
router.post('/login', userController.login);

// POST /api/user/register
router.post('/register', userController.register);

// GET /api/user/getProfile
router.get('/getProfile', authMiddleware, userController.getProfile);

// PUT /api/user/updateProfile
router.put('/updateProfile', authMiddleware, userController.updateProfile);

// DELETE /api/user/deleteProfile
router.delete('/deleteProfile', authMiddleware, userController.deleteUser);

module.exports = router;
