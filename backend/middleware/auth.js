const jwt = require('jsonwebtoken');
const pool = require('../config/db');

const JWT_SECRET = process.env.JWT_SECRET || 'diet_plan_secret_key_2026';
const JWT_EXPIRES_IN = '7d';

function generateToken(userId) {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

async function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ code: 401, message: '未登录或Token已过期', data: null });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const [rows] = await pool.query('SELECT id, role, status FROM users WHERE id = ?', [decoded.userId]);
    if (!rows[0]) {
      return res.status(401).json({ code: 401, message: '用户不存在', data: null });
    }
    if (rows[0].status === 0) {
      return res.status(403).json({ code: 403, message: '账号已被禁用，请联系管理员', data: null });
    }
    req.userId = decoded.userId;
    req.userRole = rows[0].role;
    next();
  } catch (err) {
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
      return res.status(401).json({ code: 401, message: 'Token无效或已过期', data: null });
    }
    next(err);
  }
}

function adminMiddleware(req, res, next) {
  if (req.userRole !== 1) {
    return res.status(403).json({ code: 403, message: '权限不足，需要管理员权限', data: null });
  }
  next();
}

module.exports = { generateToken, authMiddleware, adminMiddleware, JWT_SECRET };
