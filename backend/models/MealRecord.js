const pool = require('../config/db');

const MealRecord = {
  async findByDate(userId, date) {
    const [rows] = await pool.query(
      `SELECT mr.*, fi.name AS food_name, fi.calories_per_100g, fi.protein_per_100g, fi.fat_per_100g, fi.carbs_per_100g, fi.category
       FROM meal_records mr
       JOIN food_items fi ON mr.food_id = fi.id
       WHERE mr.user_id = ? AND mr.record_date = ?
       ORDER BY FIELD(mr.meal_type, '早餐','午餐','晚餐','加餐'), mr.created_at`,
      [userId, date]
    );
    return rows;
  },

  async findById(id, userId) {
    const [rows] = await pool.query(
      'SELECT * FROM meal_records WHERE id = ? AND user_id = ?',
      [id, userId]
    );
    return rows[0] || null;
  },

  async batchCreate(records) {
    if (!records || records.length === 0) return [];
    const placeholders = records.map(() => '(?, ?, ?, ?, ?, ?, ?)').join(', ');
    const values = [];
    records.forEach((r) => {
      values.push(r.user_id, r.plan_id || null, r.food_id, r.record_date, r.meal_type, r.quantity, r.note || null);
    });
    const [result] = await pool.query(
      `INSERT INTO meal_records (user_id, plan_id, food_id, record_date, meal_type, quantity, note) VALUES ${placeholders}`,
      values
    );
    return result.affectedRows;
  },

  async create({ user_id, plan_id, food_id, record_date, meal_type, quantity, note }) {
    const [result] = await pool.query(
      `INSERT INTO meal_records (user_id, plan_id, food_id, record_date, meal_type, quantity, note)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [user_id, plan_id || null, food_id, record_date, meal_type, quantity, note || null]
    );
    return result.insertId;
  },

  async update(id, userId, { quantity, meal_type, note }) {
    const updates = [];
    const values = [];

    if (quantity !== undefined) { updates.push('quantity = ?'); values.push(quantity); }
    if (meal_type !== undefined) { updates.push('meal_type = ?'); values.push(meal_type); }
    if (note !== undefined) { updates.push('note = ?'); values.push(note); }

    if (updates.length === 0) return false;

    values.push(id, userId);
    await pool.query(`UPDATE meal_records SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`, values);
    return true;
  },

  async delete(id, userId) {
    const [result] = await pool.query('DELETE FROM meal_records WHERE id = ? AND user_id = ?', [id, userId]);
    return result.affectedRows > 0;
  },

  async getWeeklyRecords(userId, startDate, endDate) {
    const [rows] = await pool.query(
      `SELECT mr.record_date,
              SUM(fi.calories_per_100g * mr.quantity / 100) AS calories,
              SUM(fi.protein_per_100g * mr.quantity / 100) AS protein,
              SUM(fi.fat_per_100g * mr.quantity / 100) AS fat,
              SUM(fi.carbs_per_100g * mr.quantity / 100) AS carbs
       FROM meal_records mr
       JOIN food_items fi ON mr.food_id = fi.id
       WHERE mr.user_id = ? AND mr.record_date BETWEEN ? AND ?
       GROUP BY mr.record_date
       ORDER BY mr.record_date`,
      [userId, startDate, endDate]
    );
    return rows;
  },

  async getMonthlyRecords(userId, year, month) {
    const [rows] = await pool.query(
      `SELECT mr.record_date,
              SUM(fi.calories_per_100g * mr.quantity / 100) AS calories,
              SUM(fi.protein_per_100g * mr.quantity / 100) AS protein,
              SUM(fi.fat_per_100g * mr.quantity / 100) AS fat,
              SUM(fi.carbs_per_100g * mr.quantity / 100) AS carbs
       FROM meal_records mr
       JOIN food_items fi ON mr.food_id = fi.id
       WHERE mr.user_id = ? AND YEAR(mr.record_date) = ? AND MONTH(mr.record_date) = ?
       GROUP BY mr.record_date
       ORDER BY mr.record_date`,
      [userId, year, month]
    );
    return rows;
  },

  async getExportRecords(userId, startDate, endDate) {
    const [rows] = await pool.query(
      `SELECT mr.record_date,
              ROUND(SUM(fi.calories_per_100g * mr.quantity / 100), 0) AS calories,
              ROUND(SUM(fi.protein_per_100g * mr.quantity / 100), 0) AS protein,
              ROUND(SUM(fi.fat_per_100g * mr.quantity / 100), 0) AS fat,
              ROUND(SUM(fi.carbs_per_100g * mr.quantity / 100), 0) AS carbs
       FROM meal_records mr
       JOIN food_items fi ON mr.food_id = fi.id
       WHERE mr.user_id = ? AND mr.record_date BETWEEN ? AND ?
       GROUP BY mr.record_date
       ORDER BY mr.record_date`,
      [userId, startDate, endDate]
    );
    return rows;
  },

  async getDailyTotal(userId, date) {
    const [rows] = await pool.query(
      `SELECT
         COALESCE(SUM(fi.calories_per_100g * mr.quantity / 100), 0) AS calories,
         COALESCE(SUM(fi.protein_per_100g * mr.quantity / 100), 0) AS protein,
         COALESCE(SUM(fi.fat_per_100g * mr.quantity / 100), 0) AS fat,
         COALESCE(SUM(fi.carbs_per_100g * mr.quantity / 100), 0) AS carbs
       FROM meal_records mr
       JOIN food_items fi ON mr.food_id = fi.id
       WHERE mr.user_id = ? AND mr.record_date = ?`,
      [userId, date]
    );
    return rows[0] || { calories: 0, protein: 0, fat: 0, carbs: 0 };
  },
};

module.exports = MealRecord;