/**
 * API 集成测试辅助工具
 *
 * 做了什么：
 * 1. 自动创建测试数据库 diet_plan_test（如果不存在）
 * 2. 自动建表 + 导入预置食材数据
 * 3. 每次测试前清空用户数据（保留食材库）
 * 4. 提供 createApp() 给 supertest 使用
 * 5. 提供快捷方法：创建用户、登录获取 token
 */

const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const express = require('express');
const request = require('supertest');

// ============================================
// 第一步：创建测试数据库（如果不存在）
// ============================================
async function ensureTestDatabase() {
  const conn = await mysql.createConnection({
    host: 'localhost',
    port: 3306,
    user: 'root',
    password: '123456',
  });

  await conn.query(
    `CREATE DATABASE IF NOT EXISTS diet_plan_test
     DEFAULT CHARACTER SET utf8mb4
     DEFAULT COLLATE utf8mb4_unicode_ci`
  );
  await conn.end();
}

// ============================================
// 执行 SQL 文件的通用函数
// 使用 multipleStatements: true 一次性执行完整文件
// ============================================
async function executeSqlFile(pool, sqlContent) {
  // 1. 精确替换数据库名 diet_plan → diet_plan_test
  //    用 \b 边界符避免把表名 diet_plans 也改成 diet_plan_tests
  let sql = sqlContent.replace(/\bdiet_plan\b/g, 'diet_plan_test');

  // 2. 移除 USE 语句（连接池已经指定了数据库）
  sql = sql.replace(/USE\s+diet_plan_test\s*;/gi, '');

  // 3. 一次性执行（MySQL 需要 multipleStatements 才能执行多条语句）
  try {
    await pool.query({ sql, multipleStatements: true });
  } catch (err) {
    // 表已存在（IF NOT EXISTS 已能处理大部分，这里是兜底）
    if (err.message.includes('already exists') || err.message.includes('Duplicate')) {
      return;
    }
    throw err;
  }
}

// ============================================
// 第二步：在测试库里建表 + 导入预置食材
// ============================================
async function migrateTestDatabase() {
  const pool = getTestPool();

  // 2a. 执行主建表脚本（包含所有表 + 200+ 预置食材）
  const mainSqlPath = path.join(__dirname, '..', '..', '..', 'database', 'diet_clean.sql');
  const mainSql = fs.readFileSync(mainSqlPath, 'utf8');
  await executeSqlFile(pool, mainSql);

  // 2b. 执行额外的迁移（收藏、体重、饮水、管理员功能等）
  const migrationDir = path.join(__dirname, '..', '..', '..', 'database');
  const migrationFiles = fs
    .readdirSync(migrationDir)
    .filter((f) => f.startsWith('migration_'))
    .sort();

  for (const file of migrationFiles) {
    const migrationSql = fs.readFileSync(path.join(migrationDir, file), 'utf8');
    try {
      await executeSqlFile(pool, migrationSql);
    } catch (err) {
      console.error('迁移执行失败:', file, err.message);
    }
  }
}

// ============================================
// 获取测试数据库连接池
// ============================================
let _pool;
function getTestPool() {
  if (!_pool) {
    _pool = mysql.createPool({
      host: 'localhost',
      port: 3306,
      user: 'root',
      password: '123456',
      database: 'diet_plan_test',
      waitForConnections: true,
      connectionLimit: 5,
      multipleStatements: true,
    });
  }
  return _pool;
}

// ============================================
// 创建一个测试用的 Express 应用
// （和 app.js 完全一样的路由挂载，但不调用 listen）
// ============================================
function createApp() {
  const app = express();
  app.use(express.json({ limit: '20mb' }));
  app.use(express.urlencoded({ extended: true }));

  // 挂载和 app.js 相同的路由
  app.use('/api/user', require('../../routes/user'));
  app.use('/api/food', require('../../routes/foodItem'));
  app.use('/api/plan', require('../../routes/dietPlan'));
  app.use('/api/record', require('../../routes/mealRecord'));
  app.use('/api/nutrition', require('../../routes/nutrition'));
  app.use('/api/admin', require('../../routes/admin'));
  app.use('/api/announcements', require('../../routes/announcement'));
  app.use('/api/ai', require('../../routes/ai'));
  app.use('/api/weight', require('../../routes/weight'));
  app.use('/api/water', require('../../routes/water'));
  app.use('/api/reports', require('../../routes/report'));

  // 健康检查
  app.get('/api/health', (req, res) => {
    res.json({ code: 200, message: 'ok', data: {} });
  });

  // 错误兜底
  app.use((err, req, res, next) => {
    console.error('测试请求错误:', err.message);
    res.status(500).json({ code: 500, message: '服务器内部错误', data: null });
  });

  return app;
}

// ============================================
// 清空用户产生的数据（保留食材库）
// 每个测试用例前调用，保证测试之间互不干扰
// ============================================
async function resetDatabase() {
  const pool = getTestPool();

  await pool.query('SET FOREIGN_KEY_CHECKS = 0');
  await pool.query('TRUNCATE TABLE meal_records');
  await pool.query('TRUNCATE TABLE plan_foods');
  await pool.query('TRUNCATE TABLE diet_plans');
  await pool.query('TRUNCATE TABLE weight_histories');
  await pool.query('TRUNCATE TABLE water_logs');
  await pool.query('TRUNCATE TABLE favorite_foods');
  await pool.query('TRUNCATE TABLE admin_logs');
  await pool.query('TRUNCATE TABLE announcements');
  await pool.query('TRUNCATE TABLE users');
  await pool.query('DELETE FROM food_items WHERE is_custom = 1');
  await pool.query('SET FOREIGN_KEY_CHECKS = 1');
}

// ============================================
// 快捷方法：注册并登录一个测试用户，返回 userId + token
// ============================================
async function createTestUser(app, overrides = {}) {
  const credentials = {
    username: overrides.username || 'testuser',
    password: overrides.password || 'Test123456',
  };

  // 1. 注册
  const regRes = await request(app)
    .post('/api/user/register')
    .send({
      ...credentials,
      nickname: overrides.nickname || '测试用户',
      gender: overrides.gender || '男',
      age: overrides.age || 25,
      height: overrides.height || 175,
      weight: overrides.weight || 70,
      goal: overrides.goal || '保持健康',
    });

  if (regRes.body.code !== 201) {
    throw new Error(`创建测试用户失败: ${JSON.stringify(regRes.body)}`);
  }

  // 2. 登录获取 token
  const loginRes = await request(app)
    .post('/api/user/login')
    .send(credentials);

  if (loginRes.body.code !== 200) {
    throw new Error(`测试用户登录失败: ${JSON.stringify(loginRes.body)}`);
  }

  return {
    userId: regRes.body.data.id,
    token: loginRes.body.data.token,
    user: loginRes.body.data.user,
  };
}

// ============================================
// 全局初始化（jest 的 beforeAll 中调用一次）
// ============================================
let _initialized = false;
async function initTestEnvironment() {
  if (_initialized) return;
  await ensureTestDatabase();
  await migrateTestDatabase();
  _initialized = true;
}

// 测试套件结束后关闭连接池
async function closeTestEnvironment() {
  if (_pool) {
    await _pool.end();
    _pool = null;
    _initialized = false;
  }
}

module.exports = {
  initTestEnvironment,
  closeTestEnvironment,
  resetDatabase,
  createApp,
  createTestUser,
  getTestPool,
};
