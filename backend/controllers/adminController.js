const bcrypt = require('bcryptjs');
const pool = require('../config/db');
const User = require('../models/User');
const FoodItem = require('../models/FoodItem');

const adminController = {
  // ==================== 仪表盘 ====================
  async dashboard(req, res) {
    try {
      const [[{ totalUsers }]] = await pool.query('SELECT COUNT(*) AS totalUsers FROM users');
      const [[{ todayNew }]] = await pool.query(
        'SELECT COUNT(*) AS todayNew FROM users WHERE DATE(created_at) = CURDATE()'
      );
      const [[{ todayRecords }]] = await pool.query(
        'SELECT COUNT(*) AS todayRecords FROM meal_records WHERE DATE(created_at) = CURDATE()'
      );
      const [[{ todayActive }]] = await pool.query(
        'SELECT COUNT(DISTINCT user_id) AS todayActive FROM meal_records WHERE DATE(created_at) = CURDATE()'
      );
      const [topFoods] = await pool.query(
        `SELECT f.name, f.category, COUNT(mr.id) AS record_count
         FROM meal_records mr
         JOIN food_items f ON mr.food_id = f.id
         WHERE mr.created_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
         GROUP BY mr.food_id
         ORDER BY record_count DESC
         LIMIT 10`
      );
      const [categoryStats] = await pool.query(
        `SELECT category, COUNT(*) AS count
         FROM food_items
         GROUP BY category
         ORDER BY count DESC`
      );
      const [[{ avgCalorieTarget }]] = await pool.query(
        'SELECT ROUND(AVG(daily_calorie_target), 0) AS avgCalorieTarget FROM users WHERE daily_calorie_target IS NOT NULL'
      );
      const [userGrowth] = await pool.query(
        `SELECT DATE(created_at) AS date, COUNT(*) AS count
         FROM users
         WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
         GROUP BY DATE(created_at)
         ORDER BY date`
      );

      res.json({
        code: 200,
        message: 'success',
        data: {
          totalUsers,
          todayNew,
          todayActive,
          todayRecords,
          avgCalorieTarget: avgCalorieTarget || 0,
          topFoods,
          categoryStats,
          userGrowth,
        },
      });
    } catch (err) {
      console.error('仪表盘数据获取失败:', err);
      res.status(500).json({ code: 500, message: '服务器内部错误', data: null });
    }
  },

  // ==================== 用户管理 ====================
  async listUsers(req, res) {
    try {
      const { keyword, role, status, page = 1, pageSize = 10 } = req.query;
      const limit = Number(pageSize);
      const offset = (Number(page) - 1) * limit;

      const [list, total] = await Promise.all([
        User.findAll({ keyword, role, status, limit, offset }),
        User.countAll({ keyword, role, status }),
      ]);

      res.json({
        code: 200,
        message: 'success',
        data: { list, total, page: Number(page), pageSize: limit },
      });
    } catch (err) {
      console.error('用户列表获取失败:', err);
      res.status(500).json({ code: 500, message: '服务器内部错误', data: null });
    }
  },

  async updateUserStatus(req, res) {
    try {
      const { id } = req.params;
      const { status } = req.body;

      if (![0, 1].includes(status)) {
        return res.status(400).json({ code: 400, message: '状态值无效', data: null });
      }

      const user = await User.findRoleById(id);
      if (!user) {
        return res.status(404).json({ code: 404, message: '用户不存在', data: null });
      }
      if (user.role === 1 && status === 0) {
        return res.status(400).json({ code: 400, message: '不能禁用管理员账号', data: null });
      }

      await User.setStatus(id, status);
      await logAction(req.userId, status === 0 ? 'disable_user' : 'enable_user', 'user', id);

      res.json({ code: 200, message: status === 0 ? '已禁用' : '已启用', data: null });
    } catch (err) {
      console.error('更新用户状态失败:', err);
      res.status(500).json({ code: 500, message: '服务器内部错误', data: null });
    }
  },

  async resetUserPassword(req, res) {
    try {
      const { id } = req.params;
      const defaultPassword = '123456';
      const password_hash = await bcrypt.hash(defaultPassword, 10);

      const user = await User.findRoleById(id);
      if (!user) {
        return res.status(404).json({ code: 404, message: '用户不存在', data: null });
      }

      await User.updatePassword(id, password_hash);
      await logAction(req.userId, 'reset_password', 'user', id);

      res.json({ code: 200, message: '密码已重置为 123456', data: null });
    } catch (err) {
      console.error('重置密码失败:', err);
      res.status(500).json({ code: 500, message: '服务器内部错误', data: null });
    }
  },

  // ==================== 食材管理 ====================
  async listFoods(req, res) {
    try {
      const { keyword, category, page = 1, pageSize = 10 } = req.query;
      const limit = Number(pageSize);
      const offset = (Number(page) - 1) * limit;

      let countSql = 'SELECT COUNT(*) AS total FROM food_items WHERE 1=1';
      let dataSql = 'SELECT * FROM food_items WHERE 1=1';
      const params = [];

      if (keyword) {
        countSql += ' AND name LIKE ?';
        dataSql += ' AND name LIKE ?';
        params.push(`%${keyword}%`);
      }
      if (category) {
        countSql += ' AND category = ?';
        dataSql += ' AND category = ?';
        params.push(category);
      }

      const [[{ total }]] = await pool.query(countSql, params);

      dataSql += ' ORDER BY category, name LIMIT ? OFFSET ?';
      const [list] = await pool.query(dataSql, [...params, limit, offset]);

      res.json({
        code: 200,
        message: 'success',
        data: { list, total, page: Number(page), pageSize: limit },
      });
    } catch (err) {
      console.error('食材列表获取失败:', err);
      res.status(500).json({ code: 500, message: '服务器内部错误', data: null });
    }
  },

  async createFood(req, res) {
    try {
      const { name, category, calories_per_100g, protein_per_100g, fat_per_100g, carbs_per_100g, fiber_per_100g } = req.body;

      if (!name || !category || calories_per_100g === undefined) {
        return res.status(400).json({ code: 400, message: '食材名称、分类和热量不能为空', data: null });
      }

      const validCategories = ['主食', '肉类', '蛋奶', '豆类', '蔬菜', '水果', '零食', '饮品', '调味料', '其他'];
      if (!validCategories.includes(category)) {
        return res.status(400).json({ code: 400, message: '无效的食材分类', data: null });
      }

      const id = await FoodItem.create({
        name, category, calories_per_100g, protein_per_100g, fat_per_100g, carbs_per_100g, fiber_per_100g,
        created_by: req.userId,
      });
      await logAction(req.userId, 'create_food', 'food', id);

      res.status(201).json({ code: 201, message: '食材添加成功', data: { id } });
    } catch (err) {
      console.error('添加食材失败:', err);
      if (err.code === 'DUPLICATE_FOOD' || err.code === 'ER_DUP_ENTRY') {
        return res.status(409).json({ code: 409, message: '该食材名称已存在', data: null });
      }
      res.status(500).json({ code: 500, message: '服务器内部错误', data: null });
    }
  },

  async updateFood(req, res) {
    try {
      const { id } = req.params;
      const { name, category, calories_per_100g, protein_per_100g, fat_per_100g, carbs_per_100g, fiber_per_100g } = req.body;

      const existing = await FoodItem.findById(id);
      if (!existing) {
        return res.status(404).json({ code: 404, message: '食材不存在', data: null });
      }

      const validCategories = ['主食', '肉类', '蛋奶', '豆类', '蔬菜', '水果', '零食', '饮品', '调味料', '其他'];
      if (category && !validCategories.includes(category)) {
        return res.status(400).json({ code: 400, message: '无效的食材分类', data: null });
      }

      const updates = [];
      const values = [];
      const fields = { name, category, calories_per_100g, protein_per_100g, fat_per_100g, carbs_per_100g, fiber_per_100g };
      for (const [key, value] of Object.entries(fields)) {
        if (value !== undefined && value !== null) {
          updates.push(`${key} = ?`);
          values.push(value);
        }
      }

      if (updates.length === 0) {
        return res.status(400).json({ code: 400, message: '没有需要更新的字段', data: null });
      }

      values.push(id);
      await pool.query(`UPDATE food_items SET ${updates.join(', ')} WHERE id = ?`, values);
      await logAction(req.userId, 'update_food', 'food', id);

      res.json({ code: 200, message: '食材更新成功', data: null });
    } catch (err) {
      console.error('更新食材失败:', err);
      if (err.code === 'ER_DUP_ENTRY') {
        return res.status(409).json({ code: 409, message: '该食材名称已存在', data: null });
      }
      res.status(500).json({ code: 500, message: '服务器内部错误', data: null });
    }
  },

  async deleteFood(req, res) {
    try {
      const { id } = req.params;

      const existing = await FoodItem.findById(id);
      if (!existing) {
        return res.status(404).json({ code: 404, message: '食材不存在', data: null });
      }

      await pool.query('DELETE FROM food_items WHERE id = ?', [id]);
      await logAction(req.userId, 'delete_food', 'food', id);

      res.json({ code: 200, message: '食材已删除', data: null });
    } catch (err) {
      console.error('删除食材失败:', err);
      res.status(500).json({ code: 500, message: '服务器内部错误', data: null });
    }
  },

  // ==================== 操作日志 ====================
  async listLogs(req, res) {
    try {
      const { page = 1, pageSize = 10 } = req.query;
      const limit = Number(pageSize);
      const offset = (Number(page) - 1) * limit;

      const [[{ total }]] = await pool.query('SELECT COUNT(*) AS total FROM admin_logs');
      const [list] = await pool.query(
        `SELECT al.*, u.username AS admin_name
         FROM admin_logs al
         LEFT JOIN users u ON al.admin_id = u.id
         ORDER BY al.created_at DESC
         LIMIT ? OFFSET ?`,
        [limit, offset]
      );

      res.json({
        code: 200,
        message: 'success',
        data: { list, total, page: Number(page), pageSize: limit },
      });
    } catch (err) {
      console.error('操作日志获取失败:', err);
      res.status(500).json({ code: 500, message: '服务器内部错误', data: null });
    }
  },

  // ==================== 系统公告 ====================
  async listAnnouncements(req, res) {
    try {
      const [list] = await pool.query(
        'SELECT * FROM announcements ORDER BY created_at DESC'
      );
      res.json({ code: 200, message: 'success', data: list });
    } catch (err) {
      console.error('公告列表获取失败:', err);
      res.status(500).json({ code: 500, message: '服务器内部错误', data: null });
    }
  },

  async createAnnouncement(req, res) {
    try {
      const { title, content } = req.body;
      if (!title || !content) {
        return res.status(400).json({ code: 400, message: '标题和内容不能为空', data: null });
      }
      const [result] = await pool.query(
        'INSERT INTO announcements (title, content, created_by) VALUES (?, ?, ?)',
        [title, content, req.userId]
      );
      await logAction(req.userId, 'create_announcement', 'system', result.insertId);
      res.status(201).json({ code: 201, message: '公告发布成功', data: { id: result.insertId } });
    } catch (err) {
      console.error('发布公告失败:', err);
      res.status(500).json({ code: 500, message: '服务器内部错误', data: null });
    }
  },

  async updateAnnouncement(req, res) {
    try {
      const { id } = req.params;
      const { title, content, is_active } = req.body;
      const [result] = await pool.query(
        'UPDATE announcements SET title = ?, content = ?, is_active = ? WHERE id = ?',
        [title, content, is_active, id]
      );
      if (result.affectedRows === 0) {
        return res.status(404).json({ code: 404, message: '公告不存在', data: null });
      }
      await logAction(req.userId, 'update_announcement', 'system', id);
      res.json({ code: 200, message: '公告更新成功', data: null });
    } catch (err) {
      console.error('更新公告失败:', err);
      res.status(500).json({ code: 500, message: '服务器内部错误', data: null });
    }
  },

  async deleteAnnouncement(req, res) {
    try {
      const { id } = req.params;
      await pool.query('DELETE FROM announcements WHERE id = ?', [id]);
      await logAction(req.userId, 'delete_announcement', 'system', id);
      res.json({ code: 200, message: '公告已删除', data: null });
    } catch (err) {
      console.error('删除公告失败:', err);
      res.status(500).json({ code: 500, message: '服务器内部错误', data: null });
    }
  },
};

async function logAction(adminId, action, targetType, targetId) {
  try {
    await pool.query(
      'INSERT INTO admin_logs (admin_id, action, target_type, target_id) VALUES (?, ?, ?, ?)',
      [adminId, action, targetType, targetId || null]
    );
  } catch (err) {
    console.error('操作日志记录失败:', err);
  }
}

module.exports = adminController;
