const express = require('express');
const router = express.Router();
const dietPlanController = require('../controllers/dietPlanController');
const { authMiddleware } = require('../middleware/auth');

router.get('/templates', dietPlanController.getTemplates);
router.get('/', authMiddleware, dietPlanController.list);
router.post('/', authMiddleware, dietPlanController.create);
router.get('/:id', authMiddleware, dietPlanController.detail);
router.put('/:id', authMiddleware, dietPlanController.update);
router.delete('/:id', authMiddleware, dietPlanController.delete);
router.get('/:id/day/:day', authMiddleware, dietPlanController.getDayFoods);
router.post('/:id/food', authMiddleware, dietPlanController.addFood);
router.put('/food/:planFoodId', authMiddleware, dietPlanController.updatePlanFood);
router.delete('/food/:planFoodId', authMiddleware, dietPlanController.removePlanFood);

module.exports = router;