jest.mock('../../config/db', () => ({
  query: jest.fn(),
  getConnection: jest.fn(),
}));

jest.mock('../../models/MealRecord', () => ({
  findByDate: jest.fn(),
  findById: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  getWeeklyRecords: jest.fn(),
  getMonthlyRecords: jest.fn(),
  getDailyTotal: jest.fn(),
}));

const MealRecord = require('../../models/MealRecord');
const mealRecordController = require('../../controllers/mealRecordController');

function mockRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

describe('MealRecord Controller', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getByDate', () => {
    it('缺少日期参数应返回400', async () => {
      const req = { userId: 1, query: {} };
      const res = mockRes();

      await mealRecordController.getByDate(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('应返回指定日期的记录', async () => {
      const mockRecords = [{ id: 1, food_name: '米饭', quantity: 200 }];
      MealRecord.findByDate.mockResolvedValue(mockRecords);
      const req = { userId: 1, query: { date: '2026-01-15' } };
      const res = mockRes();

      await mealRecordController.getByDate(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ code: 200, data: mockRecords })
      );
      expect(MealRecord.findByDate).toHaveBeenCalledWith(1, '2026-01-15');
    });
  });

  describe('create', () => {
    it('缺少必填字段应返回400', async () => {
      const req = { userId: 1, body: { food_id: 1 } };
      const res = mockRes();

      await mealRecordController.create(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('无效餐次类型应返回400', async () => {
      const req = {
        userId: 1,
        body: { food_id: 1, record_date: '2026-01-01', meal_type: '夜宵', quantity: 100 },
      };
      const res = mockRes();

      await mealRecordController.create(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('创建成功应返回201', async () => {
      MealRecord.create.mockResolvedValue(10);
      const req = {
        userId: 1,
        body: { food_id: 1, record_date: '2026-01-01', meal_type: '午餐', quantity: 200 },
      };
      const res = mockRes();

      await mealRecordController.create(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ data: { id: 10 } })
      );
    });
  });

  describe('update', () => {
    it('无效餐次类型应返回400', async () => {
      const req = {
        userId: 1, params: { id: '1' },
        body: { meal_type: '宵夜' },
      };
      const res = mockRes();

      await mealRecordController.update(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('更新成功应返回200', async () => {
      MealRecord.update.mockResolvedValue(true);
      const req = {
        userId: 1, params: { id: '1' },
        body: { quantity: 300, note: 'updated' },
      };
      const res = mockRes();

      await mealRecordController.update(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ code: 200, message: '更新成功' })
      );
    });

    it('无更新字段应返回400', async () => {
      MealRecord.update.mockResolvedValue(false);
      const req = { userId: 1, params: { id: '1' }, body: {} };
      const res = mockRes();

      await mealRecordController.update(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe('delete', () => {
    it('删除成功应返回200', async () => {
      MealRecord.delete.mockResolvedValue(true);
      const req = { userId: 1, params: { id: '1' } };
      const res = mockRes();

      await mealRecordController.delete(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ code: 200, message: '删除成功' })
      );
    });

    it('记录不存在应返回404', async () => {
      MealRecord.delete.mockResolvedValue(false);
      const req = { userId: 1, params: { id: '999' } };
      const res = mockRes();

      await mealRecordController.delete(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  describe('getWeekly', () => {
    it('缺少start参数应返回400', async () => {
      const req = { userId: 1, query: {} };
      const res = mockRes();

      await mealRecordController.getWeekly(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('应返回一周记录', async () => {
      MealRecord.getWeeklyRecords.mockResolvedValue([]);
      const req = { userId: 1, query: { start: '2026-01-01' } };
      const res = mockRes();

      await mealRecordController.getWeekly(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ code: 200 })
      );
    });
  });
});