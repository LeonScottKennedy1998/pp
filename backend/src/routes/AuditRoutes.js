const express = require('express');
const router = express.Router();
const auditController = require('../controllers/AuditController');
const { authMiddleware, roleMiddleware } = require('../middleware/auth');

router.get('/', 
    authMiddleware, 
    roleMiddleware('Администратор'), 
    auditController.getAuditLog
);

router.get('/stats', 
    authMiddleware, 
    roleMiddleware('Администратор'), 
    auditController.getAuditStats
);

router.get('/actions', 
    authMiddleware, 
    roleMiddleware('Администратор'), 
    auditController.getAuditActions
);

router.get('/tables', 
    authMiddleware, 
    roleMiddleware('Администратор'), 
    auditController.getAuditTables
);

module.exports = router;