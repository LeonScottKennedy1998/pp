const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analyticsController');
const { authMiddleware, roleMiddleware } = require('../middleware/auth');

router.get('/dashboard-stats', 
    authMiddleware, 
    roleMiddleware('Аналитик'), 
    analyticsController.getDashboardStats
);

router.get('/chart-data', 
    authMiddleware, 
    roleMiddleware('Аналитик'), 
    analyticsController.getChartData
);

router.post('/generate-report', 
    authMiddleware, 
    roleMiddleware('Аналитик'), 
    analyticsController.generateReport
);

module.exports = router;