const DietPlan = require('../models/DietPlan');

const dietPlanController = {
  async list(req, res) {
    try {
      const plans = await DietPlan.findByUserId(req.userId);
      res.json({ code: 200, message: 'success', data: plans });
    } catch (err) {
      console.error('获取计划列表失败:', err);
      res.status(500).json({ code: 500, message: '服务器内部错误', data: null });
    }
  },

  async create(req, res) {
    try {
      const { name, goal, start_date, end_date, daily_calories, daily_protein, daily_fat, daily_carbs, template_id } = req.body;

      if (!name || !goal || !start_date || !end_date) {
        return res.status(400).json({ code: 400, message: '计划名称、目标、起止日期不能为空', data: null });
      }

      const validGoals = ['减脂', '增肌', '保持健康', '其他'];
      if (!validGoals.includes(goal)) {
        return res.status(400).json({ code: 400, message: '无效的计划目标', data: null });
      }

      const id = await DietPlan.create({
        user_id: req.userId,
        name, goal, start_date, end_date,
        daily_calories: daily_calories || 2000,
        daily_protein, daily_fat, daily_carbs,
      });

      res.status(201).json({ code: 201, message: '计划创建成功', data: { id } });
    } catch (err) {
      console.error('创建计划失败:', err);
      res.status(500).json({ code: 500, message: '服务器内部错误', data: null });
    }
  },

  async detail(req, res) {
    try {
      const plan = await DietPlan.findByIdWithFoods(req.params.id, req.userId);
      if (!plan) {
        return res.status(404).json({ code: 404, message: '计划不存在', data: null });
      }
      res.json({ code: 200, message: 'success', data: plan });
    } catch (err) {
      console.error('获取计划详情失败:', err);
      res.status(500).json({ code: 500, message: '服务器内部错误', data: null });
    }
  },

  async update(req, res) {
    try {
      const { name, goal, start_date, end_date, daily_calories, daily_protein, daily_fat, daily_carbs, status } = req.body;

      if (goal && !['减脂', '增肌', '保持健康', '其他'].includes(goal)) {
        return res.status(400).json({ code: 400, message: '无效的计划目标', data: null });
      }
      if (status && !['进行中', '已完成', '已取消'].includes(status)) {
        return res.status(400).json({ code: 400, message: '无效的计划状态', data: null });
      }

      const updated = await DietPlan.update(req.params.id, req.userId, {
        name, goal, start_date, end_date, daily_calories, daily_protein, daily_fat, daily_carbs, status,
      });

      if (!updated) {
        return res.status(400).json({ code: 400, message: '没有需要更新的字段', data: null });
      }

      const plan = await DietPlan.findByIdWithFoods(req.params.id, req.userId);
      res.json({ code: 200, message: '更新成功', data: plan });
    } catch (err) {
      console.error('更新计划失败:', err);
      res.status(500).json({ code: 500, message: '服务器内部错误', data: null });
    }
  },

  async delete(req, res) {
    try {
      const deleted = await DietPlan.delete(req.params.id, req.userId);
      if (!deleted) {
        return res.status(404).json({ code: 404, message: '计划不存在', data: null });
      }
      res.json({ code: 200, message: '删除成功', data: null });
    } catch (err) {
      console.error('删除计划失败:', err);
      res.status(500).json({ code: 500, message: '服务器内部错误', data: null });
    }
  },

  async getDayFoods(req, res) {
    try {
      const { id, day } = req.params;
      const validDays = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
      if (!validDays.includes(day)) {
        return res.status(400).json({ code: 400, message: '无效的星期', data: null });
      }

      const foods = await DietPlan.getDayFoods(id, req.userId, day);
      if (foods === null) {
        return res.status(404).json({ code: 404, message: '计划不存在', data: null });
      }

      res.json({ code: 200, message: 'success', data: foods });
    } catch (err) {
      console.error('获取计划日食材失败:', err);
      res.status(500).json({ code: 500, message: '服务器内部错误', data: null });
    }
  },

  async addFood(req, res) {
    try {
      const plan = await DietPlan.findById(req.params.id, req.userId);
      if (!plan) {
        return res.status(404).json({ code: 404, message: '计划不存在', data: null });
      }

      const { food_id, day_of_week, meal_type, quantity } = req.body;

      if (!food_id || !day_of_week || !meal_type || !quantity) {
        return res.status(400).json({ code: 400, message: '食材ID、星期、餐次和数量不能为空', data: null });
      }

      const validDays = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
      const validMeals = ['早餐', '午餐', '晚餐', '加餐'];
      if (!validDays.includes(day_of_week)) {
        return res.status(400).json({ code: 400, message: '无效的星期', data: null });
      }
      if (!validMeals.includes(meal_type)) {
        return res.status(400).json({ code: 400, message: '无效的餐次类型', data: null });
      }

      const id = await DietPlan.addFood({
        plan_id: req.params.id,
        food_id,
        day_of_week,
        meal_type,
        quantity,
      });

      res.status(201).json({ code: 201, message: '食材已添加到计划', data: { id } });
    } catch (err) {
      console.error('添加计划食材失败:', err);
      res.status(500).json({ code: 500, message: '服务器内部错误', data: null });
    }
  },

  async updatePlanFood(req, res) {
    try {
      const { quantity } = req.body;
      if (!quantity || quantity <= 0) {
        return res.status(400).json({ code: 400, message: '数量必须大于0', data: null });
      }

      await DietPlan.updatePlanFood(req.params.planFoodId, { quantity });
      res.json({ code: 200, message: '更新成功', data: null });
    } catch (err) {
      console.error('更新计划食材失败:', err);
      res.status(500).json({ code: 500, message: '服务器内部错误', data: null });
    }
  },

  async removePlanFood(req, res) {
    try {
      const deleted = await DietPlan.removePlanFood(req.params.planFoodId);
      if (!deleted) {
        return res.status(404).json({ code: 404, message: '计划食材不存在', data: null });
      }
      res.json({ code: 200, message: '移除成功', data: null });
    } catch (err) {
      console.error('移除计划食材失败:', err);
      res.status(500).json({ code: 500, message: '服务器内部错误', data: null });
    }
  },

  async getTemplates(req, res) {
    try {
      const templates = await DietPlan.getTemplates();
      res.json({ code: 200, message: 'success', data: templates });
    } catch (err) {
      console.error('获取计划模板失败:', err);
      res.status(500).json({ code: 500, message: '服务器内部错误', data: null });
    }
  },
};

module.exports = dietPlanController;