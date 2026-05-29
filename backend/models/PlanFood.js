const pool = require('../config/db');

const PlanFood = {
  async findByPlanId(planId) {
    const [rows] = await pool.query(
      `SELECT pf.*, fi.name, fi.calories_per_100g, fi.protein_per_100g, fi.fat_per_100g, fi.carbs_per_100g
       FROM plan_foods pf
       JOIN food_items fi ON pf.food_id = fi.id
       WHERE pf.plan_id = ?
       ORDER BY FIELD(pf.day_of_week, '周一','周二','周三','周四','周五','周六','周日'),
                FIELD(pf.meal_type, '早餐','午餐','晚餐','加餐')`,
      [planId]
    );
    return rows;
  },

  async findById(id) {
    const [rows] = await pool.query('SELECT * FROM plan_foods WHERE id = ?', [id]);
    return rows[0] || null;
  },
};

module.exports = PlanFood;