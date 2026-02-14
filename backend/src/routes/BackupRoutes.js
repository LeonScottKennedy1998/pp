const express = require('express');
const router = express.Router();
const backupController = require('../controllers/BackupController');
const { authMiddleware, roleMiddleware } = require('../middleware/auth');

// Все маршруты только для администраторов
router.use(authMiddleware, roleMiddleware('Администратор'));

// Получение списка бэкапов
router.get('/', backupController.getBackups);

// Получение статистики
router.get('/stats', backupController.getBackupStats);

// Создание бэкапа (теперь только SQL)
router.post('/', backupController.createBackup);

// Восстановление из бэкапа
router.post('/restore/:filename', backupController.restoreBackup);

// Скачивание бэкапа
router.get('/download/:filename', backupController.downloadBackup);

// Удаление бэкапа
router.delete('/:filename', backupController.deleteBackup);

module.exports = router;