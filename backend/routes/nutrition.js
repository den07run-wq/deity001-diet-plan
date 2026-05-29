const express = require('express');
const router = express.Router();
const nutritionController = require('../controllers/nutritionController');
const { authMiddleware } = require('../middleware/auth');

router.get('/daily', authMiddleware, nutritionController.getDaily);
router.get('/weekly', authMiddleware, nutritionController.getWeekly);
router.get('/monthly', authMiddleware, nutritionController.getMonthly);

module.exports = router;