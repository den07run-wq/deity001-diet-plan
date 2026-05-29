const express = require('express');
const router = express.Router();
const weightController = require('../controllers/weightController');
const { authMiddleware } = require('../middleware/auth');

router.post('/', authMiddleware, weightController.record);
router.get('/trend', authMiddleware, weightController.getTrend);

module.exports = router;
