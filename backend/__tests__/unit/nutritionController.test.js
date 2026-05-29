jest.mock('../../config/db', () => ({
  query: jest.fn(),
}));

jest.mock('../../models/MealRecord', () => ({
  getDailyTotal: jest.fn(),
  getWeeklyRecords: jest.fn(),
  getMonthlyRecords: jest.fn(),
}));

jest.mock('../../models/DietPlan', () => ({
  findByUserId: jest.fn(),
}));

jest.mock('../../models/User', () => ({
  findById: jest.fn(),
}));

const MealRecord = require('../../models/MealRecord');
const DietPlan = require('../../models/DietPlan');
const User = require('../../models/User');
const nutritionController = require('../../controllers/nutritionController');

function mockRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

describe('Nutrition Controller', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getDaily', () => {
    it('缺少date参数应返回400', async () => {
      const req = { userId: 1, query: {} };
      const res = mockRes();

      await nutritionController.getDaily(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('应返回每日营养数据', async () => {
      MealRecord.getDailyTotal.mockResolvedValue({
        calories: 1800, protein: 70, fat: 45, carbs: 220,
      });
      User.findById.mockResolvedValue({ daily_calorie_target: 2000 });
      DietPlan.findByUserId.mockResolvedValue([]);
      const req = { userId: 1, query: { date: '2026-01-01' } };
      const res = mockRes();

      await nutritionController.getDaily(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 200,
          data: expect.objectContaining({
            totalNutrition: expect.any(Object),
            targetNutrition: expect.any(Object),
            suggestions: expect.any(Array),
          }),
        })
      );
    });

    it('有进行中的计划时应使用计划的目标值', async () => {
      MealRecord.getDailyTotal.mockResolvedValue({
        calories: 1800, protein: 70, fat: 45, carbs: 220,
      });
      User.findById.mockResolvedValue({ daily_calorie_target: 2000 });
      DietPlan.findByUserId.mockResolvedValue([
        { id: 1, status: '进行中', daily_calories: 2200, daily_protein: 100, daily_fat: 60, daily_carbs: 280 },
      ]);
      const req = { userId: 1, query: { date: '2026-01-01' } };
      const res = mockRes();

      await nutritionController.getDaily(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 200,
          data: expect.objectContaining({
            targetNutrition: expect.objectContaining({
              calories: 2200,
              protein: 100,
              fat: 60,
              carbs: 280,
            }),
          }),
        })
      );
    });
  });

  describe('getWeekly', () => {
    it('缺少start参数应返回400', async () => {
      const req = { userId: 1, query: {} };
      const res = mockRes();

      await nutritionController.getWeekly(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe('getMonthly', () => {
    it('缺少year或month参数应返回400', async () => {
      const req = { userId: 1, query: { year: '2026' } };
      const res = mockRes();

      await nutritionController.getMonthly(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('应返回月度营养数据', async () => {
      MealRecord.getMonthlyRecords.mockResolvedValue([]);
      User.findById.mockResolvedValue({ daily_calorie_target: 2000 });
      const req = { userId: 1, query: { year: '2026', month: '1' } };
      const res = mockRes();

      await nutritionController.getMonthly(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ code: 200 })
      );
    });
  });
});