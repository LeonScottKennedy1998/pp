const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authMiddleware, roleMiddleware } = require('../middleware/auth');

router.get('/', 
    authMiddleware, 
    roleMiddleware('Администратор'), 
    userController.getAllUsers
);

router.post('/', 
    authMiddleware, 
    roleMiddleware('Администратор'), 
    userController.createUser
);

router.put('/:id', 
    authMiddleware, 
    roleMiddleware('Администратор'), 
    userController.updateUser
);

router.patch('/:id/block', 
    authMiddleware, 
    roleMiddleware('Администратор'), 
    userController.blockUser
);

router.patch('/:id/unblock', 
    authMiddleware, 
    roleMiddleware('Администратор'), 
    userController.unblockUser
);

router.patch('/:id/reset-password', 
    authMiddleware, 
    roleMiddleware('Администратор'), 
    userController.resetPassword
);

module.exports = router;