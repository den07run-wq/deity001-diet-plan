const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

// 所有管理后台接口都需要登录 + 管理员权限
router.use(authMiddleware, adminMiddleware);

// 仪表盘
router.get('/dashboard', adminController.dashboard);

// 用户管理
router.get('/users', adminController.listUsers);
router.put('/users/:id/status', adminController.updateUserStatus);
router.put('/users/:id/reset-password', adminController.resetUserPassword);

// 食材管理
router.get('/foods', adminController.listFoods);
router.post('/foods', adminController.createFood);
router.put('/foods/:id', adminController.updateFood);
router.delete('/foods/:id', adminController.deleteFood);

// 操作日志
router.get('/logs', adminController.listLogs);

// 系统公告
router.get('/announcements', adminController.listAnnouncements);
router.post('/announcements', adminController.createAnnouncement);
router.put('/announcements/:id', adminController.updateAnnouncement);
router.delete('/announcements/:id', adminController.deleteAnnouncement);

module.exports = router;
