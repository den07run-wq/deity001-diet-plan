const http = require('http');

const BASE = 'http://localhost:8888/api';

let token = '';
let userId = '';
let foodId = 1;
let customFoodId = 0;
let planId = 0;
let planFoodId = 0;
let recordId = 0;

let passed = 0;
let failed = 0;

function request(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(BASE + path);
    const options = {
      method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
      },
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });

    req.on('error', (err) => reject(err));
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

function check(name, condition, detail) {
  if (condition) {
    console.log(`  ✅ ${name}${detail ? ': ' + detail : ''}`);
    passed++;
  } else {
    console.log(`  ❌ ${name}${detail ? ': ' + detail : ''}`);
    failed++;
  }
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function run() {
  console.log('═══════════════════════════════════════════');
  console.log('  饮食计划助手 - API 自动化测试');
  console.log('═══════════════════════════════════════════\n');

  const testUser = `test_${Date.now()}`;
  const testPassword = 'test123456';

  // ============================================
  console.log('📌 模块1: 系统健康检查');
  // ============================================
  {
    const { status, body } = await request('GET', '/health');
    check('健康检查返回200', status === 200);
    check('健康检查消息', body.message === '服务运行正常');
  }

  // ============================================
  console.log('\n📌 模块2: 用户注册与登录');
  // ============================================
  {
    const { status, body } = await request('POST', '/user/register', {
      username: testUser,
      password: testPassword,
      nickname: '测试用户',
    });
    check('注册(新用户)返回201', status === 201);
    check('注册返回用户名', body.data && body.data.username === testUser);

    const dupRes = await request('POST', '/user/register', {
      username: testUser,
      password: testPassword,
    });
    check('重复注册返回400', dupRes.status === 400);
    check('重复注册提示用户名已存在', dupRes.body.message.includes('用户名已存在'));

    const shortPwd = await request('POST', '/user/register', {
      username: 'no_one',
      password: '123',
    });
    check('密码过短返回400', shortPwd.status === 400);

    const emptyBody = await request('POST', '/user/register', {});
    check('空注册信息返回400', emptyBody.status === 400);
  }

  {
    const { status, body } = await request('POST', '/user/login', {
      username: testUser,
      password: testPassword,
    });
    check('登录成功返回200', status === 200);
    check('登录返回token', !!body.data && !!body.data.token);
    check('登录返回用户信息', !!body.data && !!body.data.user);

    token = body.data.token;
    userId = body.data.user.id;

    const wrongPwd = await request('POST', '/user/login', {
      username: testUser,
      password: 'wrong_password',
    });
    check('错误密码返回400', wrongPwd.status === 400);

    const noExist = await request('POST', '/user/login', {
      username: 'non_existent_user',
      password: '123456',
    });
    check('不存在用户返回400', noExist.status === 400);

    const noTokenReq = await new Promise((resolve) => {
      const url = new URL(BASE + '/user/profile');
      const req = http.get(url, (res) => {
        let data = '';
        res.on('data', (c) => (data += c));
        res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(data) }));
      });
    });
    check('无Token访问需认证接口返回401', noTokenReq.status === 401);
  }

  // ============================================
  console.log('\n📌 模块3: 用户信息管理');
  // ============================================
  {
    const { status, body } = await request('GET', '/user/profile');
    check('获取个人信息返回200', status === 200);
    check('个人信息包含用户名', body.data && body.data.username === testUser);

    const { status: s2, body: b2 } = await request('PUT', '/user/profile', {
      nickname: '新昵称',
      gender: '男',
      age: 25,
      height: 175,
      weight: 70,
      goal: '增肌',
      daily_calorie_target: 2500,
    });
    check('更新个人信息返回200', s2 === 200);
    check('更新后昵称变更', b2.data && b2.data.nickname === '新昵称');
    check('更新后目标变更', b2.data && b2.data.goal === '增肌');
    check('更新后热量目标变更', b2.data && b2.data.daily_calorie_target === 2500);

    const { status: s3 } = await request('PUT', '/user/profile', { gender: '未知' });
    check('非法性别返回400', s3 === 400);

    const { status: s4 } = await request('PUT', '/user/password', {
      old_password: testPassword,
      new_password: 'new_password_123',
    });
    check('修改密码成功返回200', s4 === 200);

    const { status: s5 } = await request('PUT', '/user/password', {
      old_password: testPassword,
      new_password: 'another',
    });
    check('旧密码错误返回400', s5 === 400);

    const { status: s6 } = await request('POST', '/user/login', {
      username: testUser,
      password: 'new_password_123',
    });
    check('用新密码登录成功', s6 === 200);
    token = s6.body.data.token;

    await request('PUT', '/user/password', {
      old_password: 'new_password_123',
      new_password: testPassword,
    });

    const { status: s7, body: b7 } = await request('POST', '/user/login', {
      username: testUser,
      password: testPassword,
    });
    check('密码恢复后登录成功', s7 === 200);
    token = b7.data.token;
  }

  // ============================================
  console.log('\n📌 模块4: 食材库 (公开接口)');
  // ============================================
  {
    const { status, body } = await request('GET', '/food?limit=5');
    check('食材列表返回200', status === 200);
    check('食材列表有数据', body.data && body.data.length > 0);

    const { status: s2, body: b2 } = await request('GET', '/food?category=主食&limit=3');
    check('按分类筛选返回200', s2 === 200);
    check('筛选结果均为主食', b2.data && b2.data.every((f) => f.category === '主食'));

    const { status: s3, body: b3 } = await request('GET', '/food?keyword=鸡胸');
    check('按关键词搜索返回200', s3 === 200);
    check('搜索结果包含鸡胸肉', b3.data && b3.data.some((f) => f.name === '鸡胸肉'));

    const { status: s4, body: b4 } = await request('GET', '/food/categories');
    check('食材分类列表返回200', s4 === 200);
    check('分类包含主食', b4.data && b4.data.some((c) => c.category === '主食'));

    foodId = body.data[0].id;
    const { status: s5, body: b5 } = await request('GET', `/food/${foodId}`);
    check('食材详情返回200', s5 === 200);
    check('食材详情ID匹配', b5.data && b5.data.id === foodId);

    const { status: s6 } = await request('GET', '/food/99999');
    check('不存在食材返回404', s6 === 404);
  }

  // ============================================
  console.log('\n📌 模块5: 自定义食材 (需认证)');
  // ============================================
  {
    const { status, body } = await request('POST', '/food/custom', {
      name: '测试自定义食材',
      category: '其他',
      calories_per_100g: 100,
      protein_per_100g: 5,
      fat_per_100g: 3,
      carbs_per_100g: 12,
    });
    check('创建自定义食材返回201', status === 201);
    check('返回食材ID', !!body.data && !!body.data.id);
    customFoodId = body.data.id;

    const { status: s2 } = await request('POST', '/food/custom', {
      name: '测试',
      category: '不存在分类',
      calories_per_100g: 100,
    });
    check('非法分类返回400', s2 === 400);

    const { status: s3, body: b3 } = await request('GET', `/food/${customFoodId}`);
    check('查询自定义食材成功', s3 === 200 && b3.data && b3.data.is_custom === 1);

    const { status: s4 } = await request('DELETE', `/food/custom/${customFoodId}`);
    check('删除自定义食材返回200', s4 === 200);

    const { status: s5 } = await request('DELETE', `/food/custom/${customFoodId}`);
    check('重复删除返回404', s5 === 404);
  }

  // ============================================
  console.log('\n📌 模块6: 饮食计划');
  // ============================================
  {
    const { status, body } = await request('GET', '/plan/templates');
    check('计划模板列表返回200', status === 200);
    check('模板为数组', Array.isArray(body.data));

    const { status: s1 } = await request('GET', '/plan');
    check('空计划列表返回200', s1 === 200);

    const today = new Date().toISOString().split('T')[0];
    const endDate = new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0];

    const { status: s2, body: b2 } = await request('POST', '/plan', {
      name: '测试减脂计划',
      goal: '减脂',
      start_date: today,
      end_date: endDate,
      daily_calories: 1800,
      daily_protein: 90,
      daily_fat: 45,
      daily_carbs: 225,
    });
    check('创建计划返回201', s2 === 201);
    check('返回计划ID', !!b2.data && !!b2.data.id);
    planId = b2.data.id;

    const { status: s3 } = await request('POST', '/plan', {
      name: '无效计划',
      goal: '不存在的目标',
      start_date: today,
      end_date: endDate,
    });
    check('无效目标返回400', s3 === 400);

    const { status: s4, body: b4 } = await request('GET', '/plan');
    check('计划列表有数据', s4 === 200 && b4.data && b4.data.length >= 1);

    const { status: s5, body: b5 } = await request('GET', `/plan/${planId}`);
    check('计划详情返回200', s5 === 200);
    check('计划名匹配', b5.data && b5.data.name === '测试减脂计划');

    const { status: s6, body: b6 } = await request('PUT', `/plan/${planId}`, {
      name: '更新后的减脂计划',
      status: '已完成',
    });
    check('更新计划返回200', s6 === 200);
    check('计划名已更新', b6.data && b6.data.name === '更新后的减脂计划');
    check('状态已更新', b6.data && b6.data.status === '已完成');

    await request('PUT', `/plan/${planId}`, { status: '进行中' });

    const { status: s7 } = await request('GET', '/plan/99999');
    check('不存在计划返回404', s7 === 404);
  }

  // ============================================
  console.log('\n📌 模块7: 计划食材管理');
  // ============================================
  {
    const { status, body } = await request('POST', `/plan/${planId}/food`, {
      food_id: 1,
      day_of_week: '周一',
      meal_type: '早餐',
      quantity: 150,
    });
    check('添加食材到计划返回201', status === 201);
    check('返回计划食材ID', !!body.data && !!body.data.id);
    planFoodId = body.data.id;

    await request('POST', `/plan/${planId}/food`, {
      food_id: 136,
      day_of_week: '周一',
      meal_type: '午餐',
      quantity: 200,
    });
    await request('POST', `/plan/${planId}/food`, {
      food_id: 200,
      day_of_week: '周一',
      meal_type: '晚餐',
      quantity: 100,
    });

    const { status: s2, body: b2 } = await request('GET', `/plan/${planId}/day/周一`);
    check('获取周一食材返回200', s2 === 200);
    check('周一有食材', b2.data && b2.data.length > 0);

    const { status: s3 } = await request('GET', `/plan/${planId}/day/星期八`);
    check('非法星期返回400', s3 === 400);

    const { status: s4 } = await request('POST', `/plan/${planId}/food`, {
      food_id: 1,
      day_of_week: '周一',
      meal_type: '不存在的餐次',
      quantity: 100,
    });
    check('非法餐次返回400', s4 === 400);

    const { status: s5 } = await request('PUT', `/plan/food/${planFoodId}`, {
      quantity: 300,
    });
    check('更新计划食材数量返回200', s5 === 200);

    const { status: s6 } = await request('DELETE', `/plan/food/${planFoodId}`);
    check('删除计划食材返回200', s6 === 200);

    const { status: s7 } = await request('DELETE', `/plan/food/${planFoodId}`);
    check('重复删除返回404', s7 === 404);
  }

  // ============================================
  console.log('\n📌 模块8: 饮食记录');
  // ============================================
  {
    const today = new Date().toISOString().split('T')[0];

    const { status: s0 } = await request('GET', `/record?date=${today}`);
    check('空记录查询返回200', s0 === 200);

    const { status, body } = await request('POST', '/record', {
      food_id: 136,
      record_date: today,
      meal_type: '午餐',
      quantity: 200,
      note: '测试记录',
    });
    check('创建饮食记录返回201', status === 201);
    check('返回记录ID', !!body.data && !!body.data.id);
    recordId = body.data.id;

    const { status: s2, body: b2 } = await request('POST', '/record', {
      food_id: 200,
      record_date: today,
      meal_type: '晚餐',
      quantity: 150,
    });
    check('创建第二条记录返回201', s2 === 201);

    const { status: s3, body: b3 } = await request('GET', `/record?date=${today}`);
    check('查询今日记录返回200', s3 === 200);
    check('今日记录至少2条', b3.data && b3.data.length >= 2);

    const { status: s4 } = await request('PUT', `/record/${recordId}`, {
      quantity: 250,
      note: '更新后的记录',
    });
    check('更新记录返回200', s4 === 200);

    const { status: s5 } = await request('GET', '/record/weekly?start=' + today);
    check('周记录查询返回200', s5 === 200);

    const { status: s6 } = await request('DELETE', `/record/${recordId}`);
    check('删除记录返回200', s6 === 200);

    const { status: s7 } = await request('DELETE', `/record/${recordId}`);
    check('重复删除返回404', s7 === 404);
  }

  // ============================================
  console.log('\n📌 模块9: 营养分析');
  // ============================================
  {
    const today = new Date().toISOString().split('T')[0];

    const { status, body } = await request('GET', `/nutrition/daily?date=${today}`);
    check('每日营养返回200', status === 200);
    check('包含总营养数据', !!body.data && !!body.data.totalNutrition);
    check('包含目标营养数据', !!body.data && !!body.data.targetNutrition);
    check('包含建议列表', Array.isArray(body.data && body.data.suggestions));

    const { status: s2 } = await request('GET', '/nutrition/weekly?start=' + today);
    check('每周营养返回200', s2 === 200);

    const { status: s3 } = await request('GET',
      '/nutrition/monthly?year=' + new Date().getFullYear() + '&month=' + (new Date().getMonth() + 1)
    );
    check('每月营养返回200', s3 === 200);

    const { status: s4 } = await request('GET', '/nutrition/daily');
    check('缺少日期参数返回400', s4 === 400);
  }

  // ============================================
  console.log('\n📌 模块10: 清理');
  // ============================================
  {
    const { status } = await request('DELETE', `/plan/${planId}`);
    check('删除计划返回200', status === 200);

    const { status: s2 } = await request('DELETE', `/plan/${planId}`);
    check('重复删除计划返回404', s2 === 404);
  }

  // ============================================
  console.log('\n═══════════════════════════════════════════');
  const total = passed + failed;
  console.log(`  测试结果: ${passed}/${total} 通过`);
  if (failed > 0) {
    console.log(`  ${failed} 个测试失败!`);
    process.exit(1);
  } else {
    console.log('  🎉 全部测试通过!');
  }
  console.log('═══════════════════════════════════════════');
}

run().catch((err) => {
  console.error('\n💥 测试执行异常:', err.message);
  process.exit(1);
});