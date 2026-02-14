const express = require('express');
const router = express.Router();
const wishlistNotificationController = require('../controllers/wishlistNotificationController');
const { authMiddleware, roleMiddleware } = require('../middleware/auth');

router.get('/check', 
    authMiddleware, 
    roleMiddleware(['Администратор', 'Товаровед']), 
    wishlistNotificationController.manualCheck
);

router.get('/stats', 
    authMiddleware, 
    roleMiddleware(['Администратор', 'Товаровед', 'Аналитик']), 
    wishlistNotificationController.getNotificationStats
);

module.exports = router;