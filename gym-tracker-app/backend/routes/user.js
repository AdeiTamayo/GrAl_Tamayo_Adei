const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const userController = require('../controllers/userController');

router.post('/login', userController.login);
router.post('/register', userController.register);
router.get('/', authMiddleware, userController.getProfile);
router.put('/', authMiddleware, userController.updateProfile);
router.delete('/', authMiddleware, userController.deleteUser);
router.get('/weights', authMiddleware, userController.getWeightHistory);
router.post('/weights', authMiddleware, userController.addWeight);
router.put('/weights', authMiddleware, userController.updateWeight);
router.delete('/weights/:id', authMiddleware, userController.deleteWeight);

module.exports = router;
