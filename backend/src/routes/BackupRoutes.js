const express = require('express');
const router = express.Router();
const backupController = require('../controllers/BackupController');
const { authMiddleware, roleMiddleware } = require('../middleware/auth');

router.use(authMiddleware, roleMiddleware('Администратор'));

router.get('/', backupController.getBackups);

router.get('/stats', backupController.getBackupStats);

router.post('/', backupController.createBackup);

router.post('/restore/:filename', backupController.restoreBackup);

router.get('/download/:filename', backupController.downloadBackup);

router.delete('/:filename', backupController.deleteBackup);

module.exports = router;