const express = require('express');
const router = express.Router();
const performanceController = require('../controllers/PerformanceController');
const { authMiddleware, roleMiddleware } = require('../middleware/auth');

router.get('/dashboard-stats', 
    authMiddleware, 
    roleMiddleware('Администратор'), 
    performanceController.getDashboardStats
);

router.get('/realtime', 
    authMiddleware, 
    roleMiddleware('Администратор'), 
    performanceController.getRealTimeMetrics
);

router.delete('/clear-old', 
    authMiddleware, 
    roleMiddleware('Администратор'), 
    performanceController.clearOldMetrics
);

module.exports = router;