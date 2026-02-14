const express = require('express');
const router = express.Router();
const discountController = require('../controllers/discountController');
const { authMiddleware, roleMiddleware } = require('../middleware/auth');

router.post('/product/:productId', 
    authMiddleware, 
    roleMiddleware('Товаровед'), 
    discountController.setDiscount
);

router.delete('/product/:productId', 
    authMiddleware, 
    roleMiddleware('Товаровед'), 
    discountController.removeDiscount
);

router.get('/', 
    authMiddleware, 
    roleMiddleware('Товаровед'), 
    discountController.getAllDiscounts
);

router.get('/product/:productId', 
    authMiddleware, 
    discountController.getProductDiscount
);


router.post('/rules', 
    authMiddleware, 
    roleMiddleware('Товаровед'), 
    discountController.createRule);

router.get('/rules', 
    authMiddleware, 
    roleMiddleware('Товаровед'), 
    discountController.getRules);

router.post('/rules/:ruleId/apply', 
    authMiddleware, roleMiddleware('Товаровед'), 
    discountController.applyRule);

router.patch('/rules/:ruleId/toggle', 
    authMiddleware, roleMiddleware('Товаровед'), 
    discountController.toggleRule);

router.delete('/rules/:ruleId', 
    authMiddleware, 
    roleMiddleware('Товаровед'), 
    discountController.deleteRule);

router.get('/rules/:ruleId/preview', 
    authMiddleware, 
    roleMiddleware('Товаровед'), 
    discountController.previewRule);


router.put('/rules/:ruleId', 
    authMiddleware, 
    roleMiddleware('Товаровед'), 
    discountController.updateRule);

router.delete('/rules/:ruleId/discounts', 
    authMiddleware, 
    roleMiddleware('Товаровед'), 
    discountController.removeRuleDiscounts
);

module.exports = router;