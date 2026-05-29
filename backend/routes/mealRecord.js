const express = require('express');
const router = express.Router();
const mealRecordController = require('../controllers/mealRecordController');
const { authMiddleware } = require('../middleware/auth');

router.get('/', authMiddleware, mealRecordController.getByDate);
router.post('/', authMiddleware, mealRecordController.create);
router.post('/batch', authMiddleware, mealRecordController.batchCreate);
router.put('/:id', authMiddleware, mealRecordController.update);
router.delete('/:id', authMiddleware, mealRecordController.delete);
router.get('/weekly', authMiddleware, mealRecordController.getWeekly);
router.get('/export', authMiddleware, mealRecordController.getExportData);

module.exports = router;