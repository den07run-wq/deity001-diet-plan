const MealRecord = require('../models/MealRecord');
const pool = require('../config/db');

const mealRecordController = {
  async getByDate(req, res) {
    try {
      const { date } = req.query;
      if (!date) {
        return res.status(400).json({ code: 400, message: '请指定日期参数 date', data: null });
      }

      const records = await MealRecord.findByDate(req.userId, date);
      res.json({ code: 200, message: 'success', data: records });
    } catch (err) {
      console.error('获取饮食记录失败:', err);
      res.status(500).json({ code: 500, message: '服务器内部错误', data: null });
    }
  },

  async batchCreate(req, res) {
    try {
      const { records } = req.body;

      if (!Array.isArray(records) || records.length === 0) {
        return res.status(400).json({ code: 400, message: '请提供至少一条饮食记录', data: null });
      }

      const validMeals = ['早餐', '午餐', '晚餐', '加餐'];

      for (let i = 0; i < records.length; i++) {
        const r = records[i];
        if (!r.food_id || !r.record_date || !r.meal_type || !r.quantity) {
          return res.status(400).json({ code: 400, message: `第${i + 1}条记录：食材、日期、餐次和数量不能为空`, data: null });
        }
        if (!validMeals.includes(r.meal_type)) {
          return res.status(400).json({ code: 400, message: `第${i + 1}条记录：无效的餐次类型`, data: null });
        }
      }

      const insertRows = records.map((r) => ({
        user_id: req.userId,
        plan_id: r.plan_id || null,
        food_id: r.food_id,
        record_date: r.record_date,
        meal_type: r.meal_type,
        quantity: r.quantity,
        note: r.note || null,
      }));

      const count = await MealRecord.batchCreate(insertRows);
      res.status(201).json({ code: 201, message: `成功添加 ${count} 条记录`, data: { count } });
    } catch (err) {
      console.error('批量添加饮食记录失败:', err);
      res.status(500).json({ code: 500, message: '服务器内部错误', data: null });
    }
  },

  async create(req, res) {
    try {
      const { plan_id, food_id, record_date, meal_type, quantity, note } = req.body;

      if (!food_id || !record_date || !meal_type || !quantity) {
        return res.status(400).json({ code: 400, message: '食材、日期、餐次和数量不能为空', data: null });
      }

      const validMeals = ['早餐', '午餐', '晚餐', '加餐'];
      if (!validMeals.includes(meal_type)) {
        return res.status(400).json({ code: 400, message: '无效的餐次类型', data: null });
      }

      const id = await MealRecord.create({
        user_id: req.userId,
        plan_id,
        food_id,
        record_date,
        meal_type,
        quantity,
        note,
      });

      res.status(201).json({ code: 201, message: '记录添加成功', data: { id } });
    } catch (err) {
      console.error('添加饮食记录失败:', err);
      res.status(500).json({ code: 500, message: '服务器内部错误', data: null });
    }
  },

  async update(req, res) {
    try {
      const { quantity, meal_type, note } = req.body;

      if (meal_type && !['早餐', '午餐', '晚餐', '加餐'].includes(meal_type)) {
        return res.status(400).json({ code: 400, message: '无效的餐次类型', data: null });
      }

      const updated = await MealRecord.update(req.params.id, req.userId, { quantity, meal_type, note });
      if (!updated) {
        return res.status(400).json({ code: 400, message: '没有需要更新的字段', data: null });
      }

      res.json({ code: 200, message: '更新成功', data: null });
    } catch (err) {
      console.error('更新饮食记录失败:', err);
      res.status(500).json({ code: 500, message: '服务器内部错误', data: null });
    }
  },

  async delete(req, res) {
    try {
      const deleted = await MealRecord.delete(req.params.id, req.userId);
      if (!deleted) {
        return res.status(404).json({ code: 404, message: '记录不存在', data: null });
      }
      res.json({ code: 200, message: '删除成功', data: null });
    } catch (err) {
      console.error('删除饮食记录失败:', err);
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

      const records = await MealRecord.getWeeklyRecords(req.userId, start, endStr);
      res.json({ code: 200, message: 'success', data: records });
    } catch (err) {
      console.error('获取周记录失败:', err);
      res.status(500).json({ code: 500, message: '服务器内部错误', data: null });
    }
  },

  async getExportData(req, res) {
    try {
      const { start, end } = req.query;
      if (!start || !end) {
        return res.status(400).json({ code: 400, message: '请指定起始日期 start 和结束日期 end', data: null });
      }

      const startDate = start;
      const endDate = end;

      const [mealRows, waterRows, weightRows] = await Promise.all([
        MealRecord.getExportRecords(req.userId, startDate, endDate),
        pool.query(
          'SELECT record_date, COALESCE(SUM(amount_ml), 0) AS water_ml FROM water_logs WHERE user_id = ? AND record_date BETWEEN ? AND ? GROUP BY record_date ORDER BY record_date',
          [req.userId, startDate, endDate]
        ).then(([r]) => r),
        pool.query(
          'SELECT recorded_at, weight FROM weight_histories WHERE user_id = ? AND recorded_at BETWEEN ? AND ? ORDER BY recorded_at ASC',
          [req.userId, startDate, endDate]
        ).then(([r]) => r),
      ]);

      const dateMap = {};
      const s = new Date(startDate);
      const e = new Date(endDate);
      for (let d = new Date(s); d <= e; d.setDate(d.getDate() + 1)) {
        const ds = d.toISOString().slice(0, 10);
        dateMap[ds] = { date: ds, calories: 0, protein: 0, fat: 0, carbs: 0, water_ml: 0, weight_kg: null };
      }

      mealRows.forEach((r) => {
        const ds = new Date(r.record_date).toISOString().slice(0, 10);
        if (dateMap[ds]) {
          dateMap[ds].calories = Number(r.calories) || 0;
          dateMap[ds].protein = Number(r.protein) || 0;
          dateMap[ds].fat = Number(r.fat) || 0;
          dateMap[ds].carbs = Number(r.carbs) || 0;
        }
      });

      waterRows.forEach((r) => {
        const ds = new Date(r.record_date).toISOString().slice(0, 10);
        if (dateMap[ds]) {
          dateMap[ds].water_ml = Number(r.water_ml) || 0;
        }
      });

      const weightByDate = {};
      weightRows.forEach((r) => {
        const ds = new Date(r.recorded_at).toISOString().slice(0, 10);
        weightByDate[ds] = Number(r.weight);
      });
      Object.keys(dateMap).forEach((ds) => {
        if (weightByDate[ds] !== undefined) {
          dateMap[ds].weight_kg = weightByDate[ds];
        }
      });

      const sortedDates = Object.keys(dateMap).sort();
      let lastWeight = null;
      sortedDates.forEach((ds) => {
        if (dateMap[ds].weight_kg !== null) {
          lastWeight = dateMap[ds].weight_kg;
        } else {
          dateMap[ds].weight_kg = lastWeight;
        }
      });

      const result = sortedDates.map((ds) => dateMap[ds]);

      res.json({ code: 200, message: 'success', data: result });
    } catch (err) {
      console.error('导出数据失败:', err);
      res.status(500).json({ code: 500, message: '导出数据失败，请稍后重试', data: null });
    }
  },
};

module.exports = mealRecordController;