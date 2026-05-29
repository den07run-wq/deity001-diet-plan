jest.mock('../../config/db', () => ({
  query: jest.fn(),
}));

const pool = require('../../config/db');
const FoodItem = require('../../models/FoodItem');

describe('FoodItem Model', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('无条件时应返回所有食材', async () => {
      const mockItems = [{ id: 1, name: '鸡胸肉' }];
      pool.query.mockResolvedValue([mockItems]);

      const result = await FoodItem.findAll({});

      expect(result).toEqual(mockItems);
    });

    it('按分类筛选时应添加WHERE条件', async () => {
      pool.query.mockResolvedValue([[]]);

      await FoodItem.findAll({ category: '肉类' });

      const sql = pool.query.mock.calls[0][0];
      expect(sql).toContain('category = ?');
    });

    it('按关键词搜索时应用LIKE条件', async () => {
      pool.query.mockResolvedValue([[]]);

      await FoodItem.findAll({ keyword: '鸡' });

      const sql = pool.query.mock.calls[0][0];
      expect(sql).toContain('LIKE');
    });
  });

  describe('findById', () => {
    it('应返回匹配的食材', async () => {
      const mockFood = { id: 1, name: '米饭' };
      pool.query.mockResolvedValue([[mockFood]]);

      const result = await FoodItem.findById(1);

      expect(result).toEqual(mockFood);
    });
  });

  describe('getCategories', () => {
    it('应返回分类名称列表', async () => {
      pool.query.mockResolvedValue([
        [{ category: '主食' }, { category: '肉类' }, { category: '蔬菜' }],
      ]);

      const result = await FoodItem.getCategories();

      expect(result).toEqual(['主食', '肉类', '蔬菜']);
    });
  });

  describe('create', () => {
    it('应创建自定义食材并设置is_custom=1', async () => {
      pool.query.mockResolvedValueOnce([[]]); // findByName: name not exists
      pool.query.mockResolvedValueOnce([{ insertId: 50 }]);

      const result = await FoodItem.create({
        name: '测试', category: '其他', calories_per_100g: 100,
        protein_per_100g: 5, created_by: 1,
      });

      expect(result).toBe(50);
      const sql = pool.query.mock.calls[1][0];
      expect(sql).toContain('is_custom');
    });
  });

  describe('deleteCustom', () => {
    it('只能删除自己创建的自定义食材', async () => {
      pool.query.mockResolvedValue([{ affectedRows: 0 }]);

      const result = await FoodItem.deleteCustom(10, 2);

      expect(result).toBe(false);
    });
  });
});