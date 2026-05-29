const pool = require('../config/db');

const Weight = {
  async create(userId, weight, date) {
    const [result] = await pool.query(
      `INSERT INTO weight_histories (user_id, weight, recorded_at)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE weight = VALUES(weight)`,
      [userId, weight, date]
    );
    return result.insertId;
  },

  async getTrend(userId, days = 30) {
    const [rows] = await pool.query(
      `SELECT weight, recorded_at
       FROM weight_histories
       WHERE user_id = ? AND recorded_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
       ORDER BY recorded_at ASC`,
      [userId, days]
    );
    return rows;
  },
};

module.exports = Weight;
