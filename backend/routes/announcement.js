const express = require('express');
const router = express.Router();
const pool = require('../config/db');

// 获取最新一条发布中的公告（无需登录）
router.get('/latest', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, title, content, created_at FROM announcements WHERE is_active = 1 ORDER BY created_at DESC LIMIT 1'
    );
    res.json({ code: 200, message: 'success', data: rows[0] || null });
  } catch (err) {
    console.error('获取最新公告失败:', err);
    res.status(500).json({ code: 500, message: '服务器内部错误', data: null });
  }
});

// 获取所有已发布公告列表（无需登录），按发布时间倒序
router.get('/list', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, title, content, created_at FROM announcements WHERE is_active = 1 ORDER BY created_at DESC'
    );
    res.json({ code: 200, message: 'success', data: rows });
  } catch (err) {
    console.error('获取公告列表失败:', err);
    res.status(500).json({ code: 500, message: '服务器内部错误', data: null });
  }
});

module.exports = router;
