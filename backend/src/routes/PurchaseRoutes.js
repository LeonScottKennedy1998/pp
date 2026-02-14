const express = require('express');
const router = express.Router();
const purchaseController = require('../controllers/purchaseController');
const { authMiddleware, roleMiddleware } = require('../middleware/auth');

router.get('/suppliers', authMiddleware, roleMiddleware('Менеджер по закупкам'), purchaseController.getSuppliers);
router.post('/suppliers', authMiddleware, roleMiddleware('Менеджер по закупкам'), purchaseController.createSupplier);
router.put('/suppliers/:supplierId', authMiddleware, roleMiddleware('Менеджер по закупкам'), purchaseController.updateSupplier);

router.get('/orders', authMiddleware, roleMiddleware('Менеджер по закупкам'), purchaseController.getPurchaseOrders);
router.post('/orders', authMiddleware, roleMiddleware('Менеджер по закупкам'), purchaseController.createPurchaseOrder);
router.patch('/orders/:poId/status', authMiddleware, roleMiddleware('Менеджер по закупкам'), purchaseController.updateOrderStatus);
router.get('/orders/:poId', authMiddleware, roleMiddleware('Менеджер по закупкам'), purchaseController.getOrderDetails);

router.get('/stock-analysis', authMiddleware, roleMiddleware('Менеджер по закупкам'), purchaseController.getStockAnalysis);
router.get('/recommendations', authMiddleware, roleMiddleware('Менеджер по закупкам'), purchaseController.getPurchaseRecommendations);
router.get('/delivery-statuses', authMiddleware, roleMiddleware('Менеджер по закупкам'), purchaseController.getDeliveryStatuses);

router.get('/reports', authMiddleware, roleMiddleware('Менеджер по закупкам'), purchaseController.getPurchaseReport);

module.exports = router;