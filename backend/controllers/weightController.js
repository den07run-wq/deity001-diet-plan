const Weight = require('../models/Weight');

const weightController = {
  async record(req, res) {
    try {
      const { weight, date } = req.body;

      if (!weight || isNaN(weight) || weight <= 0 || weight > 500) {
        return res.status(400).json({ code: 400, message: '请输入有效的体重数值（0-500 kg）', data: null });
      }

      const recordDate = date || new Date().toISOString().slice(0, 10);

      await Weight.create(req.userId, Number(weight), recordDate);

      res.status(201).json({
        code: 201,
        message: '体重记录成功',
        data: { weight: Number(weight), recorded_at: recordDate },
      });
    } catch (err) {
      console.error('记录体重失败:', err);
      res.status(500).json({ code: 500, message: '记录体重失败', data: null });
    }
  },

  async getTrend(req, res) {
    try {
      const days = parseInt(req.query.days) || 30;
      const rows = await Weight.getTrend(req.userId, Math.min(days, 365));

      res.status(200).json({
        code: 200,
        message: '获取体重趋势成功',
        data: rows,
      });
    } catch (err) {
      console.error('获取体重趋势失败:', err);
      res.status(500).json({ code: 500, message: '获取体重趋势失败', data: null });
    }
  },
};

module.exports = weightController;
