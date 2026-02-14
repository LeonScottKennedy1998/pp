const express = require('express');
const router = express.Router();
const productController = require('../controllers/ProductController');
const { authMiddleware, roleMiddleware } = require('../middleware/auth');


router.get('/', productController.getProducts);
router.get('/categories', productController.getCategories);
router.get('/:id', productController.getProductById);
router.get('/categories', productController.getCategories);

router.post('/', 
    authMiddleware, 
    roleMiddleware('Товаровед'), 
    productController.createProduct
);

router.put('/:id', 
    authMiddleware, 
    roleMiddleware('Товаровед'), 
    productController.updateProduct
);

router.patch('/:id/deactivate', 
    authMiddleware, 
    roleMiddleware('Товаровед'), 
    productController.deactivateProduct
);

router.patch('/:id/activate', 
    authMiddleware, 
    roleMiddleware('Товаровед'), 
    productController.activateProduct
);

router.get('/admin/all', 
    authMiddleware, 
    roleMiddleware('Товаровед'), 
    productController.getAllProducts
);

router.post('/batch', productController.getProductsBatch);
module.exports = router;