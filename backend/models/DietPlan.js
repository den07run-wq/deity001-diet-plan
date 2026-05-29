const pool = require('../config/db');

const DietPlan = {
  async findByUserId(userId) {
    const [rows] = await pool.query(
      'SELECT * FROM diet_plans WHERE user_id = ? ORDER BY created_at DESC',
      [userId]
    );
    return rows;
  },

  async findById(id, userId) {
    const [rows] = await pool.query(
      'SELECT * FROM diet_plans WHERE id = ? AND user_id = ?',
      [id, userId]
    );
    return rows[0] || null;
  },

  async findByIdWithFoods(id, userId) {
    const plan = await this.findById(id, userId);
    if (!plan) return null;

    const [foods] = await pool.query(
      `SELECT pf.*, fi.name, fi.calories_per_100g, fi.protein_per_100g, fi.fat_per_100g, fi.carbs_per_100g, fi.category
       FROM plan_foods pf
       JOIN food_items fi ON pf.food_id = fi.id
       WHERE pf.plan_id = ?
       ORDER BY FIELD(pf.day_of_week, '周一','周二','周三','周四','周五','周六','周日'),
                FIELD(pf.meal_type, '早餐','午餐','晚餐','加餐')`,
      [id]
    );
    plan.planFoods = foods;
    return plan;
  },

  async create({ user_id, name, goal, start_date, end_date, daily_calories, daily_protein, daily_fat, daily_carbs }) {
    const [result] = await pool.query(
      `INSERT INTO diet_plans (user_id, name, goal, start_date, end_date, daily_calories, daily_protein, daily_fat, daily_carbs)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [user_id, name, goal, start_date, end_date, daily_calories, daily_protein || 0, daily_fat || 0, daily_carbs || 0]
    );
    return result.insertId;
  },

  async update(id, userId, fields) {
    const allowedFields = ['name', 'goal', 'start_date', 'end_date', 'daily_calories', 'daily_protein', 'daily_fat', 'daily_carbs', 'status'];
    const updates = [];
    const values = [];

    for (const [key, value] of Object.entries(fields)) {
      if (allowedFields.includes(key) && value !== undefined) {
        updates.push(`${key} = ?`);
        values.push(value);
      }
    }

    if (updates.length === 0) return false;

    values.push(id, userId);
    await pool.query(`UPDATE diet_plans SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`, values);
    return true;
  },

  async delete(id, userId) {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      await conn.query('DELETE FROM plan_foods WHERE plan_id = ?', [id]);
      const [result] = await conn.query('DELETE FROM diet_plans WHERE id = ? AND user_id = ?', [id, userId]);
      await conn.commit();
      return result.affectedRows > 0;
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  },

  async getDayFoods(planId, userId, dayOfWeek) {
    const plan = await this.findById(planId, userId);
    if (!plan) return null;

    const [foods] = await pool.query(
      `SELECT pf.*, fi.name, fi.calories_per_100g, fi.protein_per_100g, fi.fat_per_100g, fi.carbs_per_100g, fi.category
       FROM plan_foods pf
       JOIN food_items fi ON pf.food_id = fi.id
       WHERE pf.plan_id = ? AND pf.day_of_week = ?
       ORDER BY FIELD(pf.meal_type, '早餐','午餐','晚餐','加餐')`,
      [planId, dayOfWeek]
    );
    return foods;
  },

  async addFood({ plan_id, food_id, day_of_week, meal_type, quantity }) {
    const [result] = await pool.query(
      'INSERT INTO plan_foods (plan_id, food_id, day_of_week, meal_type, quantity) VALUES (?, ?, ?, ?, ?)',
      [plan_id, food_id, day_of_week, meal_type, quantity]
    );
    return result.insertId;
  },

  async updatePlanFood(planFoodId, { quantity }) {
    await pool.query('UPDATE plan_foods SET quantity = ? WHERE id = ?', [quantity, planFoodId]);
    return true;
  },

  async removePlanFood(planFoodId) {
    const [result] = await pool.query('DELETE FROM plan_foods WHERE id = ?', [planFoodId]);
    return result.affectedRows > 0;
  },

  async getTemplates() {
    const [rows] = await pool.query(
      'SELECT * FROM diet_plans WHERE is_template = 1 ORDER BY goal, name'
    );
    return rows;
  },
};

module.exports = DietPlan;