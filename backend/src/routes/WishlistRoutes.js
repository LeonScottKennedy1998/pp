const express = require('express');
const router = express.Router();
const wishlistController = require('../controllers/wishlistController');
const { authMiddleware, roleMiddleware } = require('../middleware/auth');

router.post('/', 
    authMiddleware, 
    roleMiddleware('Клиент'),
    wishlistController.addToWishlist
);

router.delete('/:productId', 
    authMiddleware, 
    roleMiddleware('Клиент'),
    wishlistController.removeFromWishlist
);

router.get('/', 
    authMiddleware, 
    roleMiddleware('Клиент'),
    wishlistController.getUserWishlist
);

router.get('/check/:productId', 
    authMiddleware, 
    roleMiddleware('Клиент'),
    wishlistController.checkInWishlist
);

router.get('/count', 
    authMiddleware, 
    roleMiddleware('Клиент'),
    wishlistController.getWishlistCount
);

module.exports = router;