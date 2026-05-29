jest.mock('../../config/db', () => ({
  query: jest.fn(),
  getConnection: jest.fn(),
}));

const request = require('supertest');
const express = require('express');
const pool = require('../../config/db');

const bcrypt = require('bcryptjs');
jest.mock('bcryptjs', () => ({
  hash: jest.fn().mockResolvedValue('$2a$10$hashed'),
  compare: jest.fn().mockResolvedValue(true),
}));

function createApp() {
  const app = express();
  app.use(express.json());

  app.get('/api/health', (req, res) => {
    res.json({ code: 200, message: '服务运行正常', data: { uptime: process.uptime() } });
  });

  const userRoutes = require('../../routes/user');
  const foodItemRoutes = require('../../routes/foodItem');
  const dietPlanRoutes = require('../../routes/dietPlan');
  const mealRecordRoutes = require('../../routes/mealRecord');
  const nutritionRoutes = require('../../routes/nutrition');

  app.use('/api/user', userRoutes);
  app.use('/api/food', foodItemRoutes);
  app.use('/api/plan', dietPlanRoutes);
  app.use('/api/record', mealRecordRoutes);
  app.use('/api/nutrition', nutritionRoutes);

  app.use((err, req, res, next) => {
    res.status(500).json({ code: 500, message: '服务器内部错误', data: null });
  });

  return app;
}

function setupPoolForCreate() {
  const mockConn = {
    beginTransaction: jest.fn().mockResolvedValue(),
    commit: jest.fn().mockResolvedValue(),
    rollback: jest.fn().mockResolvedValue(),
    query: jest.fn(),
    release: jest.fn(),
  };
  pool.getConnection.mockResolvedValue(mockConn);
  return mockConn;
}

describe('API Integration Tests', () => {
  let app;

  beforeEach(() => {
    jest.clearAllMocks();
    app = createApp();
  });

  describe('GET /api/health', () => {
    it('应返回服务运行正常', async () => {
      const res = await request(app).get('/api/health');

      expect(res.status).toBe(200);
      expect(res.body.code).toBe(200);
      expect(res.body.message).toBe('服务运行正常');
    });
  });

  describe('POST /api/user/register', () => {
    it('缺少密码应返回400', async () => {
      const res = await request(app)
        .post('/api/user/register')
        .send({ username: 'test' });

      expect(res.status).toBe(400);
    });

    it('密码少于6位应返回400', async () => {
      const res = await request(app)
        .post('/api/user/register')
        .send({ username: 'test', password: '123' });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('密码至少6位');
    });

    it('成功注册应返回201', async () => {
      pool.query.mockResolvedValueOnce([[]]);
      pool.query.mockResolvedValueOnce([{ insertId: 1 }]);

      const res = await request(app)
        .post('/api/user/register')
        .send({ username: 'newuser', password: '123456' });

      expect(res.status).toBe(201);
      expect(res.body.code).toBe(201);
      expect(res.body.data.username).toBe('newuser');
    });

    it('用户名已存在应返回400', async () => {
      pool.query.mockResolvedValue([[{ id: 1 }]]);

      const res = await request(app)
        .post('/api/user/register')
        .send({ username: 'existing', password: '123456' });

      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/user/login', () => {
    it('缺少密码应返回400', async () => {
      const res = await request(app)
        .post('/api/user/login')
        .send({ username: 'test' });

      expect(res.status).toBe(400);
    });

    it('用户不存在应返回400', async () => {
      pool.query.mockResolvedValue([[]]);

      const res = await request(app)
        .post('/api/user/login')
        .send({ username: 'no', password: '123456' });

      expect(res.status).toBe(400);
    });

    it('成功登录应返回token和用户信息', async () => {
      pool.query.mockResolvedValue([[{
        id: 1, username: 'test', password_hash: 'hash', nickname: '昵称',
        gender: null, age: null, height: null, weight: null,
        goal: null, daily_calorie_target: null,
      }]]);

      const res = await request(app)
        .post('/api/user/login')
        .send({ username: 'test', password: '123456' });

      expect(res.status).toBe(200);
      expect(res.body.data.token).toBeTruthy();
      expect(res.body.data.user.id).toBe(1);
    });
  });

  describe('GET /api/user/profile (需认证)', () => {
    it('无token应返回401', async () => {
      const res = await request(app).get('/api/user/profile');

      expect(res.status).toBe(401);
    });

    it('无效token应返回401', async () => {
      const res = await request(app)
        .get('/api/user/profile')
        .set('Authorization', 'Bearer invalid_token');

      expect(res.status).toBe(401);
    });

    it('有效token应返回用户信息', async () => {
      const jwt = require('jsonwebtoken');
      const token = jwt.sign({ userId: 1 }, require('../../middleware/auth').JWT_SECRET);

      pool.query.mockResolvedValue([[{ id: 1, username: 'test', nickname: '昵称' }]]);

      const res = await request(app)
        .get('/api/user/profile')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(1);
    });
  });

  describe('GET /api/food (公开接口)', () => {
    it('应返回食材列表', async () => {
      pool.query.mockResolvedValue([[{ id: 1, name: '鸡胸肉' }]]);

      const res = await request(app).get('/api/food');

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
    });

    it('支持分类筛选', async () => {
      pool.query.mockResolvedValue([[]]);

      const res = await request(app).get('/api/food?category=肉类');

      expect(res.status).toBe(200);
    });
  });

  describe('GET /api/food/:id', () => {
    it('不存在的食材应返回404', async () => {
      pool.query.mockResolvedValue([[]]);

      const res = await request(app).get('/api/food/99999');

      expect(res.status).toBe(404);
    });

    it('存在的食材应返回详情', async () => {
      pool.query.mockResolvedValue([[{ id: 1, name: '鸡胸肉' }]]);

      const res = await request(app).get('/api/food/1');

      expect(res.status).toBe(200);
    });
  });

  describe('POST /api/plan (需认证)', () => {
    it('无token应返回401', async () => {
      const res = await request(app)
        .post('/api/plan')
        .send({ name: 'test', goal: '减脂', start_date: '2026-01-01', end_date: '2026-01-31' });

      expect(res.status).toBe(401);
    });

    it('有效token可创建计划', async () => {
      const jwt = require('jsonwebtoken');
      const token = jwt.sign({ userId: 1 }, require('../../middleware/auth').JWT_SECRET);

      pool.query.mockResolvedValue([{ insertId: 5 }]);

      const res = await request(app)
        .post('/api/plan')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: '减脂计划', goal: '减脂', start_date: '2026-01-01', end_date: '2026-01-31' });

      expect(res.status).toBe(201);
      expect(res.body.data.id).toBe(5);
    });
  });

  describe('GET /api/plan/templates (公开接口)', () => {
    it('应返回模板列表', async () => {
      pool.query.mockResolvedValue([[]]);

      const res = await request(app).get('/api/plan/templates');

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  describe('POST /api/record (需认证)', () => {
    it('无token应返回401', async () => {
      const res = await request(app)
        .post('/api/record')
        .send({ food_id: 1, record_date: '2026-01-01', meal_type: '早餐', quantity: 100 });

      expect(res.status).toBe(401);
    });

    it('有效token可创建记录', async () => {
      const jwt = require('jsonwebtoken');
      const token = jwt.sign({ userId: 1 }, require('../../middleware/auth').JWT_SECRET);

      pool.query.mockResolvedValue([{ insertId: 10 }]);

      const res = await request(app)
        .post('/api/record')
        .set('Authorization', `Bearer ${token}`)
        .send({ food_id: 1, record_date: '2026-01-01', meal_type: '早餐', quantity: 100 });

      expect(res.status).toBe(201);
      expect(res.body.data.id).toBe(10);
    });
  });

  describe('GET /api/nutrition/daily (需认证)', () => {
    it('无token应返回401', async () => {
      const res = await request(app).get('/api/nutrition/daily?date=2026-01-01');

      expect(res.status).toBe(401);
    });

    it('有效token应返回营养数据', async () => {
      const jwt = require('jsonwebtoken');
      const token = jwt.sign({ userId: 1 }, require('../../middleware/auth').JWT_SECRET);

      pool.query.mockResolvedValueOnce([{ calories: 1500, protein: 60, fat: 40, carbs: 200 }]);
      pool.query.mockResolvedValueOnce([[{ id: 1, username: 'test', daily_calorie_target: 2000 }]]);
      pool.query.mockResolvedValueOnce([[]]);

      const res = await request(app)
        .get('/api/nutrition/daily?date=2026-01-01')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.totalNutrition).toBeDefined();
      expect(res.body.data.targetNutrition).toBeDefined();
      expect(res.body.data.suggestions).toBeDefined();
    });
  });

  describe('错误处理', () => {
    it('数据库异常应返回500', async () => {
      const jwt = require('jsonwebtoken');
      const token = jwt.sign({ userId: 1 }, require('../../middleware/auth').JWT_SECRET);

      pool.query.mockRejectedValue(new Error('DB error'));

      const res = await request(app)
        .post('/api/plan')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'test', goal: '减脂', start_date: '2026-01-01', end_date: '2026-01-31' });

      expect(res.status).toBe(500);
    });
  });
});