/**
 * 食材库模块 API 集成测试
 *
 * 看完 user.api.test.js 再来看这个，结构完全一样。
 * 区别是这个模块有的接口不需要登录，有的需要。
 */

// ============================================
// 【固定模板】每个测试文件开头都要写这三行
// ============================================
process.env.DB_NAME = 'diet_plan_test';
process.env.JWT_SECRET = 'diet_plan_test_secret';

const request = require('supertest');
const {
  initTestEnvironment,
  closeTestEnvironment,
  resetDatabase,
  createApp,
  createTestUser,
  getTestPool,
} = require('../helpers/testSetup');

// ============================================
// 【固定模板】全局变量和生命周期
// ============================================
let app;

beforeAll(async () => {
  await initTestEnvironment(); // 步骤1：建测试库 + 建表 + 导入200+食材
  app = createApp();           // 步骤2：创建 Express 应用
}, 30000);

afterAll(async () => {
  await closeTestEnvironment(); // 收尾：关闭数据库连接
});

beforeEach(async () => {
  await resetDatabase();        // 每个用例前清空用户数据，食材库保留
});

// ============================================
// 不需要登录的接口
// ============================================

describe('获取食材列表 GET /api/food', () => {
  it('不登录也能访问', async () => {
    const res = await request(app).get('/api/food');

    expect(res.status).toBe(200);
    expect(res.body.code).toBe(200);
    // 测试数据库初始化时导入了 200+ 食材
    expect(res.body.data.length).toBeGreaterThan(0);
  });

  it('支持按分类筛选', async () => {
    const res = await request(app).get('/api/food?category=主食');

    expect(res.status).toBe(200);
    // 返回的每一项分类都应该是"主食"
    res.body.data.forEach((food) => {
      expect(food.category).toBe('主食');
    });
  });

  it('支持按关键词搜索', async () => {
    const res = await request(app).get('/api/food?keyword=鸡胸肉');

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(1);
    expect(res.body.data[0].name).toBe('鸡胸肉');
  });

  it('搜不到返回空数组', async () => {
    const res = await request(app).get('/api/food?keyword=不存在食材xyz');

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
  });
});

describe('获取食材详情 GET /api/food/:id', () => {
  it('id=1 返回米饭', async () => {
    const res = await request(app).get('/api/food/1');

    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe('米饭');
    expect(res.body.data.category).toBe('主食');
    // 验证营养成分字段存在
    expect(parseFloat(res.body.data.calories_per_100g)).toBeGreaterThan(0);
    expect(parseFloat(res.body.data.protein_per_100g)).toBeGreaterThan(0);
  });

  it('不存在的 id 返回 404', async () => {
    const res = await request(app).get('/api/food/99999');

    expect(res.status).toBe(404);
  });
});

describe('获取分类列表 GET /api/food/categories', () => {
  it('返回所有分类', async () => {
    const res = await request(app).get('/api/food/categories');

    expect(res.status).toBe(200);
    expect(res.body.data).toContain('主食');
    expect(res.body.data).toContain('肉类');
    expect(res.body.data).toContain('蔬菜');
    expect(res.body.data).toContain('水果');
  });
});

// ============================================
// 需要登录的接口
// ============================================

describe('自定义食材（需要登录）', () => {
  let token;

  beforeEach(async () => {
    // 先创建一个用户并登录，拿到 token
    const user = await createTestUser(app);
    token = user.token;
  });

  it('登录后可以添加自定义食材', async () => {
    const res = await request(app)
      .post('/api/food/custom')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: '蛋白粉',
        category: '其他',
        calories_per_100g: 380,
        protein_per_100g: 80,
        fat_per_100g: 5,
        carbs_per_100g: 10,
      });

    expect(res.status).toBe(201);
    expect(res.body.data.id).toBeGreaterThan(0);

    // 验证数据库里真的有这条记录
    const pool = getTestPool();
    const [rows] = await pool.query(
      'SELECT * FROM food_items WHERE name = ? AND is_custom = 1',
      ['蛋白粉']
    );
    expect(rows.length).toBe(1);
    expect(rows[0].is_custom).toBe(1);
  });

  it('不登录添加返回 401', async () => {
    const res = await request(app)
      .post('/api/food/custom')
      .send({ name: '蛋白粉', category: '其他', calories_per_100g: 380 });

    expect(res.status).toBe(401);
  });

  it('必填字段缺失返回 400', async () => {
    const res = await request(app)
      .post('/api/food/custom')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: '只有名字' }); // 缺 category 和 calories_per_100g

    expect(res.status).toBe(400);
  });

  it('可以删除自己添加的自定义食材', async () => {
    // 先添加
    const addRes = await request(app)
      .post('/api/food/custom')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: '要删除的食材',
        category: '其他',
        calories_per_100g: 100,
      });
    const foodId = addRes.body.data.id;

    // 再删除
    const delRes = await request(app)
      .delete(`/api/food/custom/${foodId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(delRes.status).toBe(200);

    // 验证数据库里已经没有了
    const pool = getTestPool();
    const [rows] = await pool.query('SELECT * FROM food_items WHERE id = ?', [foodId]);
    expect(rows.length).toBe(0);
  });
});

describe('收藏食材（需要登录）', () => {
  let token;

  beforeEach(async () => {
    const user = await createTestUser(app);
    token = user.token;
  });

  it('可以收藏和取消收藏', async () => {
    // 收藏 id=1 的食材（米饭）
    const favRes = await request(app)
      .post('/api/food/1/favorite')
      .set('Authorization', `Bearer ${token}`);

    expect(favRes.status).toBe(201);
    expect(favRes.body.data.favorited).toBe(true);

    // 验证数据库里有收藏记录
    const pool = getTestPool();
    const [rows] = await pool.query(
      'SELECT * FROM favorite_foods WHERE food_id = 1'
    );
    expect(rows.length).toBe(1);

    // 再次请求 → 取消收藏
    const unfavRes = await request(app)
      .post('/api/food/1/favorite')
      .set('Authorization', `Bearer ${token}`);

    expect(unfavRes.status).toBe(200);
    expect(unfavRes.body.data.favorited).toBe(false);
  });

  it('未登录收藏返回 401', async () => {
    const res = await request(app).post('/api/food/1/favorite');

    expect(res.status).toBe(401);
  });
});
