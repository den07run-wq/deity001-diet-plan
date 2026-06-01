/**
 * 用户模块 API 集成测试
 *
 * 和旧测试的区别：
 * - 旧测试：mock 数据库 → 只测了"调用链对不对"
 * - 这个：真实请求 → 真实 MySQL → 验证响应 + 验证数据库状态
 *
 * 阅读顺序：从上到下，从简单到复杂
 */

// 【关键】必须在 require 任何项目模块之前，设置环境变量指向测试库
// 这样 db.js 加载时就会连接 diet_plan_test 而不是 diet_plan
process.env.DB_NAME = 'diet_plan_test';
process.env.JWT_SECRET = 'diet_plan_test_secret';

const request = require('supertest');
const { initTestEnvironment, closeTestEnvironment, resetDatabase, createApp, createTestUser, getTestPool } = require('../helpers/testSetup');

// ============================================
// 全局：整个测试文件只创建一次 app
// ============================================
let app;

beforeAll(async () => {
  // 1. 确保测试数据库存在 + 表结构就绪
  await initTestEnvironment();

  // 2. 创建测试用的 Express 应用（路由和 app.js 一模一样）
  app = createApp();
}, 30000); // 首次建库可能慢，给 30 秒超时

afterAll(async () => {
  await closeTestEnvironment();
});

// ============================================
// 每个测试用例前：清空数据库
// 保证 "测试 A 的结果不影响到测试 B"
// ============================================
beforeEach(async () => {
  await resetDatabase();
});

// ============================================
// 测试用例
// ============================================

describe('健康检查', () => {
  it('GET /api/health 返回 200', async () => {
    const res = await request(app).get('/api/health');

    expect(res.status).toBe(200);
    expect(res.body.code).toBe(200);
    expect(res.body.message).toBe('ok');
  });
});

describe('用户注册 POST /api/user/register', () => {
  it('正常注册返回 201 和用户信息', async () => {
    const res = await request(app)
      .post('/api/user/register')
      .send({
        username: 'newuser',
        password: 'Test123456',
        nickname: '小明',
        gender: '男',
        age: 25,
        height: 175,
        weight: 70,
        goal: '增肌',
      });

    // 1. 验证 HTTP 响应
    expect(res.status).toBe(201);
    expect(res.body.code).toBe(201);
    expect(res.body.message).toBe('注册成功');

    // 2. 验证返回了用户 ID 和用户名（注册不自动登录，需单独登录）
    expect(res.body.data.id).toBeGreaterThan(0);
    expect(res.body.data.username).toBe('newuser');

    // 3. 验证数据库里真的有这条记录（这才叫集成测试！）
    const pool = getTestPool();
    const [rows] = await pool.query('SELECT * FROM users WHERE username = ?', ['newuser']);
    expect(rows.length).toBe(1);
    expect(rows[0].nickname).toBe('小明');
    // User.create() 只保存 username/password/nickname
    // goal/gender/age/height/weight 需要通过 PUT /api/user/profile 更新
    expect(rows[0].goal).toBe('保持健康'); // 数据库默认值
    // 密码应该是加密的，不能是明文
    expect(rows[0].password_hash).not.toBe('Test123456');
  });

  it('重复用户名返回 400', async () => {
    // 先注册一个
    await request(app).post('/api/user/register').send({
      username: 'dupuser',
      password: 'Test123456',
    });

    // 再用相同用户名注册
    const res = await request(app).post('/api/user/register').send({
      username: 'dupuser',
      password: 'Test123456',
    });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe(400);
  });

  it('缺少必填字段返回 400', async () => {
    const res = await request(app)
      .post('/api/user/register')
      .send({
        username: 'nopass',
        // 故意不传 password
      });

    expect(res.status).toBe(400);
  });
});

describe('用户登录 POST /api/user/login', () => {
  // 每个登录测试前，先注册一个用户
  const testUser = {
    username: 'logintest',
    password: 'Test123456',
  };

  beforeEach(async () => {
    await request(app).post('/api/user/register').send({
      ...testUser,
      nickname: '登录测试',
    });
  });

  it('正确密码登录返回 token', async () => {
    const res = await request(app).post('/api/user/login').send(testUser);

    expect(res.status).toBe(200);
    expect(res.body.code).toBe(200);
    expect(res.body.data.token).toBeDefined();
    expect(res.body.data.user.username).toBe('logintest');
  });

  it('错误密码登录返回 400', async () => {
    const res = await request(app).post('/api/user/login').send({
      username: 'logintest',
      password: 'WrongPassword',
    });

    // 登录失败统一返回 400（账号或密码错误）
    expect(res.status).toBe(400);
    expect(res.body.message).toBe('用户名或密码错误');
  });
});

describe('需要认证的接口', () => {
  let token;
  let userId;

  // 注意：外层 beforeEach 会清空数据库，所以这里也要用 beforeEach
  // 在每次测试前创建全新的测试用户
  beforeEach(async () => {
    const result = await createTestUser(app, {
      username: 'authtest',
      password: 'Test123456',
    });
    token = result.token;
    userId = result.userId;
  });

  it('GET /api/user/profile 带 token 返回用户信息', async () => {
    const res = await request(app)
      .get('/api/user/profile')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.username).toBe('authtest');
    expect(res.body.data.id).toBe(userId);
    // 敏感字段不应该返回
    expect(res.body.data.password_hash).toBeUndefined();
  });

  it('GET /api/user/profile 不带 token 返回 401', async () => {
    const res = await request(app).get('/api/user/profile');

    expect(res.status).toBe(401);
  });

  it('PUT /api/user/profile 更新个人信息', async () => {
    const res = await request(app)
      .put('/api/user/profile')
      .set('Authorization', `Bearer ${token}`)
      .send({
        nickname: '新昵称',
        weight: 68,
        goal: '减脂',
      });

    expect(res.status).toBe(200);

    // 验证数据库真的更新了
    const pool = getTestPool();
    const [rows] = await pool.query('SELECT * FROM users WHERE id = ?', [userId]);
    expect(rows[0].nickname).toBe('新昵称');
    expect(parseFloat(rows[0].weight)).toBe(68);
    expect(rows[0].goal).toBe('减脂');
  });

  it('PUT /api/user/password 修改密码后旧密码登录失败', async () => {
    // 修改密码
    const res = await request(app)
      .put('/api/user/password')
      .set('Authorization', `Bearer ${token}`)
      .send({
        old_password: 'Test123456',
        new_password: 'NewPass789',
      });

    expect(res.status).toBe(200);

    // 旧密码应该登不上
    const loginRes = await request(app).post('/api/user/login').send({
      username: 'authtest',
      password: 'Test123456',
    });
    expect(loginRes.status).toBe(400);

    // 新密码应该能登上
    const loginOk = await request(app).post('/api/user/login').send({
      username: 'authtest',
      password: 'NewPass789',
    });
    expect(loginOk.status).toBe(200);
  });
});
