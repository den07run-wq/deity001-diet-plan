jest.mock('../../config/db', () => ({
  query: jest.fn(),
}));

jest.mock('../../models/FoodItem', () => ({
  findAll: jest.fn(),
  findById: jest.fn(),
  getCategories: jest.fn(),
  create: jest.fn(),
  deleteCustom: jest.fn(),
}));

const FoodItem = require('../../models/FoodItem');
const foodItemController = require('../../controllers/foodItemController');

function mockRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

describe('FoodItem Controller', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('list', () => {
    it('应返回食材列表', async () => {
      const mockFoods = [
        { id: 1, name: '鸡胸肉', category: '肉类' },
        { id: 2, name: '米饭', category: '主食' },
      ];
      FoodItem.findAll.mockResolvedValue(mockFoods);
      const req = { query: {} };
      const res = mockRes();

      await foodItemController.list(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ code: 200, data: mockFoods })
      );
    });

    it('应传递过滤参数给模型层', async () => {
      FoodItem.findAll.mockResolvedValue([]);
      const req = { query: { category: '肉类', keyword: '鸡', limit: '10', offset: '0' } };
      const res = mockRes();

      await foodItemController.list(req, res);

      expect(FoodItem.findAll).toHaveBeenCalledWith({
        category: '肉类', keyword: '鸡', limit: '10', offset: '0',
      });
    });

    it('数据库异常应返回500', async () => {
      FoodItem.findAll.mockRejectedValue(new Error('DB error'));
      const req = { query: {} };
      const res = mockRes();

      await foodItemController.list(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('detail', () => {
    it('食材存在应返回详情', async () => {
      FoodItem.findById.mockResolvedValue({ id: 1, name: '鸡胸肉' });
      const req = { params: { id: '1' } };
      const res = mockRes();

      await foodItemController.detail(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ code: 200, data: { id: 1, name: '鸡胸肉' } })
      );
    });

    it('食材不存在应返回404', async () => {
      FoodItem.findById.mockResolvedValue(null);
      const req = { params: { id: '999' } };
      const res = mockRes();

      await foodItemController.detail(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  describe('categories', () => {
    it('应返回分类列表', async () => {
      FoodItem.getCategories.mockResolvedValue(['主食', '肉类', '蔬菜']);
      const req = {};
      const res = mockRes();

      await foodItemController.categories(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ code: 200, data: ['主食', '肉类', '蔬菜'] })
      );
    });
  });

  describe('createCustom', () => {
    it('缺少必填字段应返回400', async () => {
      const req = { userId: 1, body: { name: 'test' } };
      const res = mockRes();

      await foodItemController.createCustom(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('非法分类应返回400', async () => {
      const req = {
        userId: 1,
        body: { name: 'test', category: '不存在的分类', calories_per_100g: 100 },
      };
      const res = mockRes();

      await foodItemController.createCustom(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: '无效的食材分类' })
      );
    });

    it('创建成功应返回201', async () => {
      FoodItem.create.mockResolvedValue(100);
      const req = {
        userId: 1,
        body: { name: '自定义食材', category: '其他', calories_per_100g: 100 },
      };
      const res = mockRes();

      await foodItemController.createCustom(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ data: { id: 100 } })
      );
    });
  });

  describe('deleteCustom', () => {
    it('删除成功应返回200', async () => {
      FoodItem.deleteCustom.mockResolvedValue(true);
      const req = { userId: 1, params: { id: '10' } };
      const res = mockRes();

      await foodItemController.deleteCustom(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ code: 200, message: '删除成功' })
      );
    });

    it('食材不存在或无权删除应返回404', async () => {
      FoodItem.deleteCustom.mockResolvedValue(false);
      const req = { userId: 1, params: { id: '999' } };
      const res = mockRes();

      await foodItemController.deleteCustom(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });
});