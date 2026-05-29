const express = require('express');
const router = express.Router();
const foodItemController = require('../controllers/foodItemController');
const { authMiddleware } = require('../middleware/auth');

router.get('/', foodItemController.list);
router.get('/categories', foodItemController.categories);
router.get('/favorites', authMiddleware, foodItemController.getFavorites);
router.get('/favorites/ids', authMiddleware, foodItemController.getFavoriteIds);
router.get('/:id', foodItemController.detail);
router.post('/custom', authMiddleware, foodItemController.createCustom);
router.delete('/custom/:id', authMiddleware, foodItemController.deleteCustom);
router.post('/:id/favorite', authMiddleware, foodItemController.toggleFavorite);

module.exports = router;