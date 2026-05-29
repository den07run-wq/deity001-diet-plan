const express = require('express');
const router = express.Router();
const aiController = require('../controllers/aiController');
const { authMiddleware } = require('../middleware/auth');

router.post('/analyze', authMiddleware, aiController.analyze);
router.post('/diet-plan', authMiddleware, aiController.generateDietPlan);

module.exports = router;
