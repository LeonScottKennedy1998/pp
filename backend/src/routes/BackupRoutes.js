const express = require('express');
const router = express.Router();
const backupController = require('../controllers/backupController');
const { authMiddleware, roleMiddleware } = require('../middleware/auth');

router.get('/', 
    authMiddleware, 
    roleMiddleware('Администратор'), 
    backupController.getBackups
);

router.get('/stats', 
    authMiddleware, 
    roleMiddleware('Администратор'), 
    backupController.getBackupStats
);

router.post('/sql', 
    authMiddleware, 
    roleMiddleware('Администратор'), 
    backupController.createSqlBackup
);

router.post('/json', 
    authMiddleware, 
    roleMiddleware('Администратор'), 
    backupController.createJsonBackup
);

router.get('/download/:filename', 
    authMiddleware, 
    roleMiddleware('Администратор'), 
    backupController.downloadBackup
);

router.delete('/:filename', 
    authMiddleware, 
    roleMiddleware('Администратор'), 
    backupController.deleteBackup
);


module.exports = router;