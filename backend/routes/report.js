const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const { authMiddleware } = require('../middleware/auth');

router.get('/', authMiddleware, reportController.getWeekly);

module.exports = router;
