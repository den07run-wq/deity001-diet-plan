const pool = require('../config/db');

const FoodItem = {
  async findAll({ category, keyword, limit = 100, offset = 0 }) {
    let sql = 'SELECT * FROM food_items WHERE 1=1';
    const params = [];

    if (category) {
      sql += ' AND category = ?';
      params.push(category);
    }
    if (keyword) {
      sql += ' AND name LIKE ?';
      params.push(`%${keyword}%`);
    }

    sql += ' ORDER BY category, name LIMIT ? OFFSET ?';
    params.push(Number(limit), Number(offset));

    const [rows] = await pool.query(sql, params);
    return rows;
  },

  async findById(id) {
    const [rows] = await pool.query('SELECT * FROM food_items WHERE id = ?', [id]);
    return rows[0] || null;
  },

  async getCategories() {
    const [rows] = await pool.query(
      "SELECT DISTINCT category FROM food_items ORDER BY FIELD(category, '主食','肉类','蛋奶','豆类','蔬菜','水果','零食','饮品','调味料','其他')"
    );
    return rows.map((r) => r.category);
  },

  async findByName(name) {
    const [rows] = await pool.query('SELECT id FROM food_items WHERE name = ?', [name]);
    return rows[0] || null;
  },

  async create({ name, category, calories_per_100g, protein_per_100g, fat_per_100g, carbs_per_100g, fiber_per_100g, created_by }) {
    const existing = await this.findByName(name);
    if (existing) {
      const err = new Error('DUPLICATE_FOOD');
      err.code = 'DUPLICATE_FOOD';
      throw err;
    }
    const [result] = await pool.query(
      `INSERT INTO food_items (name, category, calories_per_100g, protein_per_100g, fat_per_100g, carbs_per_100g, fiber_per_100g, is_custom, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?)`,
      [name, category, calories_per_100g, protein_per_100g || 0, fat_per_100g || 0, carbs_per_100g || 0, fiber_per_100g || 0, created_by]
    );
    return result.insertId;
  },

  async deleteCustom(id, userId) {
    const [result] = await pool.query('DELETE FROM food_items WHERE id = ? AND is_custom = 1 AND created_by = ?', [id, userId]);
    return result.affectedRows > 0;
  },
};

module.exports = FoodItem;