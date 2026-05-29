const MealRecord = require('../models/MealRecord');
const DietPlan = require('../models/DietPlan');
const User = require('../models/User');

const nutritionController = {
  async getDaily(req, res) {
    try {
      const { date } = req.query;
      if (!date) {
        return res.status(400).json({ code: 400, message: '请指定日期参数 date', data: null });
      }

      const totalNutrition = await MealRecord.getDailyTotal(req.userId, date);
      const user = await User.findById(req.userId);

      const targetNutrition = {
        calories: user.daily_calorie_target || 2000,
        protein: 60,
        fat: 50,
        carbs: 250,
      };

      const plans = await DietPlan.findByUserId(req.userId);
      const activePlan = plans.find((p) => p.status === '进行中');
      if (activePlan) {
        targetNutrition.calories = activePlan.daily_calories || targetNutrition.calories;
        targetNutrition.protein = parseFloat(activePlan.daily_protein) || targetNutrition.protein;
        targetNutrition.fat = parseFloat(activePlan.daily_fat) || targetNutrition.fat;
        targetNutrition.carbs = parseFloat(activePlan.daily_carbs) || targetNutrition.carbs;
      }

      const suggestions = generateSuggestions(totalNutrition, targetNutrition);

      res.json({
        code: 200,
        message: 'success',
        data: { totalNutrition, targetNutrition, suggestions },
      });
    } catch (err) {
      console.error('获取每日营养数据失败:', err);
      res.status(500).json({ code: 500, message: '服务器内部错误', data: null });
    }
  },

  async getWeekly(req, res) {
    try {
      const { start } = req.query;
      if (!start) {
        return res.status(400).json({ code: 400, message: '请指定起始日期参数 start', data: null });
      }

      const startDate = new Date(start);
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 6);
      const endStr = endDate.toISOString().split('T')[0];

      const dailyData = await MealRecord.getWeeklyRecords(req.userId, start, endStr);

      const user = await User.findById(req.userId);
      const targetNutrition = {
        calories: user.daily_calorie_target || 2000,
        protein: 60,
        fat: 50,
        carbs: 250,
      };

      res.json({
        code: 200,
        message: 'success',
        data: { dailyData, targetNutrition, suggestions: [] },
      });
    } catch (err) {
      console.error('获取每周营养数据失败:', err);
      res.status(500).json({ code: 500, message: '服务器内部错误', data: null });
    }
  },

  async getMonthly(req, res) {
    try {
      const { year, month } = req.query;
      if (!year || !month) {
        return res.status(400).json({ code: 400, message: '请指定年份(year)和月份(month)参数', data: null });
      }

      const dailyData = await MealRecord.getMonthlyRecords(req.userId, Number(year), Number(month));

      const user = await User.findById(req.userId);
      const targetNutrition = {
        calories: user.daily_calorie_target || 2000,
        protein: 60,
        fat: 50,
        carbs: 250,
      };

      res.json({
        code: 200,
        message: 'success',
        data: { dailyData, targetNutrition, suggestions: [] },
      });
    } catch (err) {
      console.error('获取月度营养数据失败:', err);
      res.status(500).json({ code: 500, message: '服务器内部错误', data: null });
    }
  },
};

function generateSuggestions(total, target) {
  const suggestions = [];
  const calPct = parseFloat(total.calories || 0) / parseFloat(target.calories || 2000);
  const proteinPct = parseFloat(total.protein || 0) / parseFloat(target.protein || 60);
  const fatPct = parseFloat(total.fat || 0) / parseFloat(target.fat || 50);
  const carbsPct = parseFloat(total.carbs || 0) / parseFloat(target.carbs || 250);

  if (calPct > 1.2) {
    suggestions.push({ type: 'warn', content: '今日热量摄入超出目标20%以上，建议减少高热量食物摄入。' });
  } else if (calPct < 0.5) {
    suggestions.push({ type: 'warn', content: '今日热量摄入不足目标50%，建议增加餐食分量，防止营养不良。' });
  }

  if (proteinPct < 0.7) {
    suggestions.push({ type: 'tip', content: '蛋白质摄入偏低，建议增加肉、蛋、奶、豆类摄入。' });
  }

  if (fatPct > 1.3) {
    suggestions.push({ type: 'warn', content: '脂肪摄入超标，建议减少油炸食品和高脂肉类。' });
  }

  if (carbsPct < 0.5) {
    suggestions.push({ type: 'tip', content: '碳水摄入不足，建议适当增加主食摄入。' });
  }

  if (suggestions.length === 0) {
    suggestions.push({ type: 'tip', content: '今日营养摄入均衡，继续保持！' });
  }

  return suggestions;
}

module.exports = nutritionController;