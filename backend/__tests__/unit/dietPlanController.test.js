jest.mock('../../config/db', () => ({
  query: jest.fn(),
  getConnection: jest.fn(),
}));

jest.mock('../../models/DietPlan', () => ({
  findByUserId: jest.fn(),
  findById: jest.fn(),
  findByIdWithFoods: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  getDayFoods: jest.fn(),
  addFood: jest.fn(),
  updatePlanFood: jest.fn(),
  removePlanFood: jest.fn(),
  getTemplates: jest.fn(),
}));

const DietPlan = require('../../models/DietPlan');
const dietPlanController = require('../../controllers/dietPlanController');

function mockRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

describe('DietPlan Controller', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('list', () => {
    it('应返回用户的计划列表', async () => {
      const mockPlans = [{ id: 1, name: '减脂计划' }];
      DietPlan.findByUserId.mockResolvedValue(mockPlans);
      const req = { userId: 1 };
      const res = mockRes();

      await dietPlanController.list(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ code: 200, data: mockPlans })
      );
    });
  });

  describe('create', () => {
    it('缺少必填字段应返回400', async () => {
      const req = { userId: 1, body: { name: 'test' } };
      const res = mockRes();

      await dietPlanController.create(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('无效目标应返回400', async () => {
      const req = {
        userId: 1,
        body: { name: 'test', goal: '无效目标', start_date: '2026-01-01', end_date: '2026-01-31' },
      };
      const res = mockRes();

      await dietPlanController.create(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: '无效的计划目标' })
      );
    });

    it('创建成功应返回201', async () => {
      DietPlan.create.mockResolvedValue(5);
      const req = {
        userId: 1,
        body: { name: '减脂计划', goal: '减脂', start_date: '2026-01-01', end_date: '2026-01-31' },
      };
      const res = mockRes();

      await dietPlanController.create(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ data: { id: 5 } })
      );
    });
  });

  describe('detail', () => {
    it('计划存在应返回详情', async () => {
      DietPlan.findByIdWithFoods.mockResolvedValue({ id: 1, name: 'test' });
      const req = { userId: 1, params: { id: '1' } };
      const res = mockRes();

      await dietPlanController.detail(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ code: 200 })
      );
    });

    it('计划不存在应返回404', async () => {
      DietPlan.findByIdWithFoods.mockResolvedValue(null);
      const req = { userId: 1, params: { id: '999' } };
      const res = mockRes();

      await dietPlanController.detail(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  describe('update', () => {
    it('无效目标应返回400', async () => {
      const req = { userId: 1, params: { id: '1' }, body: { goal: 'bad' } };
      const res = mockRes();

      await dietPlanController.update(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('无效状态应返回400', async () => {
      const req = { userId: 1, params: { id: '1' }, body: { status: '未知状态' } };
      const res = mockRes();

      await dietPlanController.update(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('更新成功应返回200', async () => {
      DietPlan.update.mockResolvedValue(true);
      DietPlan.findByIdWithFoods.mockResolvedValue({ id: 1, name: 'updated' });
      const req = { userId: 1, params: { id: '1' }, body: { name: 'updated' } };
      const res = mockRes();

      await dietPlanController.update(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ code: 200, message: '更新成功' })
      );
    });
  });

  describe('delete', () => {
    it('删除成功应返回200', async () => {
      DietPlan.delete.mockResolvedValue(true);
      const req = { userId: 1, params: { id: '1' } };
      const res = mockRes();

      await dietPlanController.delete(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ code: 200, message: '删除成功' })
      );
    });

    it('计划不存在应返回404', async () => {
      DietPlan.delete.mockResolvedValue(false);
      const req = { userId: 1, params: { id: '999' } };
      const res = mockRes();

      await dietPlanController.delete(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  describe('addFood', () => {
    it('计划不存在应返回404', async () => {
      DietPlan.findById.mockResolvedValue(null);
      const req = {
        userId: 1, params: { id: '999' },
        body: { food_id: 1, day_of_week: '周一', meal_type: '早餐', quantity: 100 },
      };
      const res = mockRes();

      await dietPlanController.addFood(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('缺少字段应返回400', async () => {
      DietPlan.findById.mockResolvedValue({ id: 1 });
      const req = {
        userId: 1, params: { id: '1' },
        body: { food_id: 1 },
      };
      const res = mockRes();

      await dietPlanController.addFood(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('无效星期应返回400', async () => {
      DietPlan.findById.mockResolvedValue({ id: 1 });
      const req = {
        userId: 1, params: { id: '1' },
        body: { food_id: 1, day_of_week: '星期八', meal_type: '早餐', quantity: 100 },
      };
      const res = mockRes();

      await dietPlanController.addFood(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('无效餐次应返回400', async () => {
      DietPlan.findById.mockResolvedValue({ id: 1 });
      const req = {
        userId: 1, params: { id: '1' },
        body: { food_id: 1, day_of_week: '周一', meal_type: '夜宵', quantity: 100 },
      };
      const res = mockRes();

      await dietPlanController.addFood(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('添加成功应返回201', async () => {
      DietPlan.findById.mockResolvedValue({ id: 1 });
      DietPlan.addFood.mockResolvedValue(20);
      const req = {
        userId: 1, params: { id: '1' },
        body: { food_id: 1, day_of_week: '周一', meal_type: '早餐', quantity: 100 },
      };
      const res = mockRes();

      await dietPlanController.addFood(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
    });
  });

  describe('updatePlanFood', () => {
    it('数量不大于0应返回400', async () => {
      const req = { params: { planFoodId: '1' }, body: { quantity: 0 } };
      const res = mockRes();

      await dietPlanController.updatePlanFood(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe('removePlanFood', () => {
    it('不存在应返回404', async () => {
      DietPlan.removePlanFood.mockResolvedValue(false);
      const req = { params: { planFoodId: '999' } };
      const res = mockRes();

      await dietPlanController.removePlanFood(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  describe('getTemplates', () => {
    it('应返回模板列表', async () => {
      DietPlan.getTemplates.mockResolvedValue([{ id: 1, name: '模板1' }]);
      const req = {};
      const res = mockRes();

      await dietPlanController.getTemplates(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ code: 200 })
      );
    });
  });
});