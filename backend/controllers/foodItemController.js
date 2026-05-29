const FoodItem = require('../models/FoodItem');
const pool = require('../config/db');

const foodItemController = {
  async list(req, res) {
    try {
      const { category, keyword, limit, offset } = req.query;
      const foods = await FoodItem.findAll({ category, keyword, limit, offset });
      res.json({ code: 200, message: 'success', data: foods });
    } catch (err) {
      console.error('获取食材列表失败:', err);
      res.status(500).json({ code: 500, message: '服务器内部错误', data: null });
    }
  },

  async detail(req, res) {
    try {
      const food = await FoodItem.findById(req.params.id);
      if (!food) {
        return res.status(404).json({ code: 404, message: '食材不存在', data: null });
      }
      res.json({ code: 200, message: 'success', data: food });
    } catch (err) {
      console.error('获取食材详情失败:', err);
      res.status(500).json({ code: 500, message: '服务器内部错误', data: null });
    }
  },

  async categories(req, res) {
    try {
      const cats = await FoodItem.getCategories();
      res.json({ code: 200, message: 'success', data: cats });
    } catch (err) {
      console.error('获取分类列表失败:', err);
      res.status(500).json({ code: 500, message: '服务器内部错误', data: null });
    }
  },

  async createCustom(req, res) {
    try {
      const { name, category, calories_per_100g, protein_per_100g, fat_per_100g, carbs_per_100g, fiber_per_100g } = req.body;

      if (!name || !category || !calories_per_100g) {
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

      res.status(201).json({ code: 201, message: '自定义食材添加成功', data: { id } });
    } catch (err) {
      console.error('添加自定义食材失败:', err);
      if (err.code === 'DUPLICATE_FOOD') {
        return res.status(409).json({ code: 409, message: '该食材名称已存在，请勿重复添加', data: null });
      }
      if (err.code === 'ER_DUP_ENTRY') {
        return res.status(409).json({ code: 409, message: '该食材名称已存在，请勿重复添加', data: null });
      }
      res.status(500).json({ code: 500, message: '服务器内部错误', data: null });
    }
  },

  async deleteCustom(req, res) {
    try {
      const deleted = await FoodItem.deleteCustom(req.params.id, req.userId);
      if (!deleted) {
        return res.status(404).json({ code: 404, message: '食材不存在或无权删除', data: null });
      }
      res.json({ code: 200, message: '删除成功', data: null });
    } catch (err) {
      console.error('删除自定义食材失败:', err);
      res.status(500).json({ code: 500, message: '服务器内部错误', data: null });
    }
  },

  async toggleFavorite(req, res) {
    try {
      const foodId = parseInt(req.params.id);
      const userId = req.userId;

      const [existing] = await pool.query(
        'SELECT id FROM favorite_foods WHERE user_id = ? AND food_id = ?',
        [userId, foodId]
      );

      if (existing.length > 0) {
        await pool.query('DELETE FROM favorite_foods WHERE user_id = ? AND food_id = ?', [userId, foodId]);
        return res.json({ code: 200, message: '已取消收藏', data: { favorited: false } });
      }

      await pool.query('INSERT INTO favorite_foods (user_id, food_id) VALUES (?, ?)', [userId, foodId]);
      res.status(201).json({ code: 201, message: '已添加收藏', data: { favorited: true } });
    } catch (err) {
      console.error('切换收藏失败:', err);
      res.status(500).json({ code: 500, message: '操作失败', data: null });
    }
  },

  async getFavorites(req, res) {
    try {
      const [rows] = await pool.query(
        `SELECT f.id AS favorite_id, fi.*
         FROM favorite_foods f
         JOIN food_items fi ON f.food_id = fi.id
         WHERE f.user_id = ?
         ORDER BY f.created_at DESC`,
        [req.userId]
      );
      res.json({ code: 200, message: 'success', data: rows });
    } catch (err) {
      console.error('获取收藏列表失败:', err);
      res.status(500).json({ code: 500, message: '服务器内部错误', data: null });
    }
  },

  async getFavoriteIds(req, res) {
    try {
      const [rows] = await pool.query(
        'SELECT food_id FROM favorite_foods WHERE user_id = ?',
        [req.userId]
      );
      res.json({ code: 200, message: 'success', data: rows.map((r) => r.food_id) });
    } catch (err) {
      console.error('获取收藏ID列表失败:', err);
      res.status(500).json({ code: 500, message: '服务器内部错误', data: null });
    }
  },
};

module.exports = foodItemController;