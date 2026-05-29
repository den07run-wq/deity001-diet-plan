const pool = require('../config/db');

const User = {
  async findByUsername(username) {
    const [rows] = await pool.query('SELECT * FROM users WHERE username = ?', [username]);
    return rows[0] || null;
  },

  async findById(id) {
    const [rows] = await pool.query(
      'SELECT id, username, nickname, gender, age, height, weight, goal, daily_calorie_target, created_at, updated_at FROM users WHERE id = ?',
      [id]
    );
    return rows[0] || null;
  },

  async create({ username, password_hash, nickname }) {
    const [result] = await pool.query(
      'INSERT INTO users (username, password_hash, nickname) VALUES (?, ?, ?)',
      [username, password_hash, nickname || username]
    );
    return result.insertId;
  },

  async update(id, fields) {
    const allowedFields = ['nickname', 'gender', 'age', 'height', 'weight', 'goal', 'daily_calorie_target'];
    const updates = [];
    const values = [];

    for (const [key, value] of Object.entries(fields)) {
      if (allowedFields.includes(key) && value !== undefined) {
        updates.push(`${key} = ?`);
        values.push(value);
      }
    }

    if (updates.length === 0) return false;

    values.push(id);
    await pool.query(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, values);
    return true;
  },

  async updatePassword(id, password_hash) {
    await pool.query('UPDATE users SET password_hash = ? WHERE id = ?', [password_hash, id]);
    return true;
  },

  // --- 管理员方法 ---
  async findAll({ keyword, role, status, limit = 10, offset = 0 }) {
    let sql = 'SELECT id, username, nickname, gender, age, goal, role, status, created_at FROM users WHERE 1=1';
    const params = [];

    if (keyword) {
      sql += ' AND (username LIKE ? OR nickname LIKE ?)';
      params.push(`%${keyword}%`, `%${keyword}%`);
    }
    if (role !== undefined && role !== '' && role !== null) {
      sql += ' AND role = ?';
      params.push(Number(role));
    }
    if (status !== undefined && status !== '' && status !== null) {
      sql += ' AND status = ?';
      params.push(Number(status));
    }

    sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(Number(limit), Number(offset));

    const [rows] = await pool.query(sql, params);
    return rows;
  },

  async countAll({ keyword, role, status }) {
    let sql = 'SELECT COUNT(*) AS total FROM users WHERE 1=1';
    const params = [];

    if (keyword) {
      sql += ' AND (username LIKE ? OR nickname LIKE ?)';
      params.push(`%${keyword}%`, `%${keyword}%`);
    }
    if (role !== undefined && role !== '' && role !== null) {
      sql += ' AND role = ?';
      params.push(Number(role));
    }
    if (status !== undefined && status !== '' && status !== null) {
      sql += ' AND status = ?';
      params.push(Number(status));
    }

    const [rows] = await pool.query(sql, params);
    return rows[0].total;
  },

  async setStatus(id, status) {
    await pool.query('UPDATE users SET status = ? WHERE id = ?', [status, id]);
    return true;
  },

  async setRole(id, role) {
    await pool.query('UPDATE users SET role = ? WHERE id = ?', [role, id]);
    return true;
  },

  async findRoleById(id) {
    const [rows] = await pool.query('SELECT role FROM users WHERE id = ?', [id]);
    return rows[0] || null;
  },
};

module.exports = User;