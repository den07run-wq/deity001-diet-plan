const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { authMiddleware } = require('../middleware/auth');

router.post('/add', authMiddleware, async (req, res) => {
  try {
    const { amount = 250 } = req.body;
    const today = new Date().toISOString().split('T')[0];

    await pool.query(
      'INSERT INTO water_logs (user_id, amount_ml, record_date) VALUES (?, ?, ?)',
      [req.userId, amount, today]
    );

    const [rows] = await pool.query(
      'SELECT COALESCE(SUM(amount_ml), 0) AS total FROM water_logs WHERE user_id = ? AND record_date = ?',
      [req.userId, today]
    );

    res.json({
      code: 200,
      message: '饮水记录成功',
      data: { total: rows[0].total, added: amount }
    });
  } catch (err) {
    console.error('添加饮水记录失败:', err);
    res.status(500).json({ code: 500, message: '服务器内部错误', data: null });
  }
});

router.get('/today', authMiddleware, async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];

    const [rows] = await pool.query(
      'SELECT COALESCE(SUM(amount_ml), 0) AS total FROM water_logs WHERE user_id = ? AND record_date = ?',
      [req.userId, today]
    );

    res.json({
      code: 200,
      message: 'success',
      data: { total: rows[0].total, date: today }
    });
  } catch (err) {
    console.error('获取饮水记录失败:', err);
    res.status(500).json({ code: 500, message: '服务器内部错误', data: null });
  }
});

module.exports = router;
