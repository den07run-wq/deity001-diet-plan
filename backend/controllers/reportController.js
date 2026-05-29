const MealRecord = require('../models/MealRecord');
const Weight = require('../models/Weight');
const User = require('../models/User');
const { callAI } = require('./aiController');

const REPORT_SYSTEM_PROMPT = `你是一位资深营养师。请根据用户过去7天的饮食和体重数据，给出一段150字左右的周报总结。
要求：
1. 语气亲切、专业、鼓励性，像朋友一样
2. 先肯定用户做得好的地方
3. 指出1个最需要改善的问题
4. 给出1-2条具体可执行的改善建议（比如具体吃什么食物）
5. 严格控制在150字以内
6. 不要使用markdown格式，纯文本输出`;

async function getWeekly(req, res) {
  try {
    const today = new Date();
    const endDate = today.toISOString().slice(0, 10);
    const start = new Date(today);
    start.setDate(start.getDate() - 6);
    const startDate = start.toISOString().slice(0, 10);

    const [dailyData, user, weightTrend] = await Promise.all([
      MealRecord.getWeeklyRecords(req.userId, startDate, endDate),
      User.findById(req.userId),
      Weight.getTrend(req.userId, 7),
    ]);

    const targetCalories = user?.daily_calorie_target || 2000;

    // 构建完整7天的数据（含无记录的天数）
    const dateMap = {};
    for (let i = 0; i < 7; i++) {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      const dateStr = d.toISOString().slice(0, 10);
      dateMap[dateStr] = { date: dateStr, calories: 0, protein: 0, fat: 0, carbs: 0 };
    }

    dailyData.forEach((row) => {
      const dateStr = new Date(row.record_date).toISOString().slice(0, 10);
      if (dateMap[dateStr]) {
        dateMap[dateStr] = {
          date: dateStr,
          calories: Math.round(parseFloat(row.calories) || 0),
          protein: Math.round(parseFloat(row.protein) || 0),
          fat: Math.round(parseFloat(row.fat) || 0),
          carbs: Math.round(parseFloat(row.carbs) || 0),
        };
      }
    });

    const filledDailyData = Object.values(dateMap);

    // 统计计算
    const daysWithRecords = dailyData.length || 1;
    const avgCalories = Math.round(
      filledDailyData.reduce((s, d) => s + d.calories, 0) / daysWithRecords
    );
    const avgProtein = Math.round(
      filledDailyData.reduce((s, d) => s + d.protein, 0) / daysWithRecords
    );
    const avgFat = Math.round(
      filledDailyData.reduce((s, d) => s + d.fat, 0) / daysWithRecords
    );
    const avgCarbs = Math.round(
      filledDailyData.reduce((s, d) => s + d.carbs, 0) / daysWithRecords
    );

    // 三大营养素热量占比（蛋白质4kcal/g, 脂肪9kcal/g, 碳水4kcal/g）
    const proteinKcal = avgProtein * 4;
    const fatKcal = avgFat * 9;
    const carbsKcal = avgCarbs * 4;
    const totalKcal = proteinKcal + fatKcal + carbsKcal || 1;
    const proteinPct = Math.round((proteinKcal / totalKcal) * 100);
    const fatPct = Math.round((fatKcal / totalKcal) * 100);
    const carbsPct = Math.round((carbsKcal / totalKcal) * 100);

    // 体重趋势
    const formattedWeightTrend = weightTrend.map((w) => ({
      date: new Date(w.recorded_at).toISOString().slice(0, 10),
      weight: parseFloat(w.weight),
    }));

    let weightChange = null;
    let weightDirection = '';
    if (formattedWeightTrend.length >= 2) {
      const first = formattedWeightTrend[0].weight;
      const last = formattedWeightTrend[formattedWeightTrend.length - 1].weight;
      weightChange = Math.round((last - first) * 10) / 10;
      if (weightChange > 0.1) weightDirection = '上升';
      else if (weightChange < -0.1) weightDirection = '下降';
      else weightDirection = '持平';
    }

    // AI 点评
    let aiSuggestion = '';
    const aiKeyConfigured = process.env.AI_API_KEY;
    if (aiKeyConfigured) {
      try {
        const userMessage = [
          `过去7天（${startDate} ~ ${endDate}）饮食数据：`,
          `- 平均每日热量摄入：${avgCalories} kcal（目标：${targetCalories} kcal）`,
          `- 三大营养素供能比例：蛋白质 ${proteinPct}%、脂肪 ${fatPct}%、碳水 ${carbsPct}%`,
          weightDirection
            ? `- 体重变化：${weightDirection}了 ${Math.abs(weightChange)} kg`
            : '- 本周暂无体重记录',
          '',
          '请给出周报总结和改进建议。',
        ].join('\n');

        aiSuggestion = await callAI(REPORT_SYSTEM_PROMPT, userMessage, null, 600);
      } catch (aiErr) {
        console.error('AI 周报生成失败:', aiErr.message);
        aiSuggestion = generateFallbackSuggestion(
          avgCalories, targetCalories, proteinPct, fatPct, carbsPct
        );
      }
    } else {
      aiSuggestion = generateFallbackSuggestion(
        avgCalories, targetCalories, proteinPct, fatPct, carbsPct
      );
    }

    res.json({
      code: 200,
      data: {
        dateRange: { start: startDate, end: endDate },
        dailyData: filledDailyData,
        summary: {
          avgCalories,
          targetCalories,
          avgProtein,
          avgFat,
          avgCarbs,
          proteinPct,
          fatPct,
          carbsPct,
        },
        weight: {
          trend: formattedWeightTrend,
          change: weightChange,
          direction: weightDirection,
        },
        aiSuggestion,
      },
    });
  } catch (err) {
    console.error('周报生成失败:', err);
    res.status(500).json({ code: 500, message: '周报生成失败，请稍后重试' });
  }
}

function generateFallbackSuggestion(avgCalories, targetCalories, proteinPct, fatPct, carbsPct) {
  const parts = [];

  if (avgCalories > targetCalories * 1.1) {
    parts.push('本周热量摄入略高于目标');
    parts.push('建议下周适当减少高油高糖食物');
  } else if (avgCalories < targetCalories * 0.8) {
    parts.push('本周热量摄入偏低');
    parts.push('建议增加优质主食和蛋白质的摄入量');
  } else {
    parts.push('本周热量控制得不错');
    parts.push('继续保持当前的饮食节奏');
  }

  if (proteinPct < 15) {
    parts.push('蛋白质摄入比例偏低，建议多吃鸡胸肉、鸡蛋、鱼虾等');
  } else if (fatPct > 35) {
    parts.push('脂肪摄入比例偏高，建议减少油炸食品和肥肉');
  }

  return parts.join('，') + '。';
}

module.exports = { getWeekly };
