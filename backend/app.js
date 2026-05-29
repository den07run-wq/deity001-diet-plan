require('dotenv').config({ path: __dirname + '/.env' });
const express = require('express');
const cors = require('cors');
const path = require('path');

const userRoutes = require('./routes/user');
const foodItemRoutes = require('./routes/foodItem');
const dietPlanRoutes = require('./routes/dietPlan');
const mealRecordRoutes = require('./routes/mealRecord');
const nutritionRoutes = require('./routes/nutrition');
const adminRoutes = require('./routes/admin');
const announcementRoutes = require('./routes/announcement');
const aiRoutes = require('./routes/ai');
const weightRoutes = require('./routes/weight');
const waterRoutes = require('./routes/water');
const reportRoutes = require('./routes/report');

const app = express();
const PORT = 8888; // 【已修改】避开所有冲突，直接锁死 8888 端口

app.use(cors());
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true }));

app.use(express.static(path.join(__dirname, '..', 'frontend')));

app.get('/api/health', (req, res) => {
  res.json({ code: 200, message: '服务运行正常', data: { uptime: process.uptime() } });
});

app.use('/api/user', userRoutes);
app.use('/api/food', foodItemRoutes);
app.use('/api/plan', dietPlanRoutes);
app.use('/api/record', mealRecordRoutes);
app.use('/api/nutrition', nutritionRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/announcements', announcementRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/weight', weightRoutes);
app.use('/api/water', waterRoutes);
app.use('/api/reports', reportRoutes);

app.use((err, req, res, next) => {
  console.error('未捕获的错误:', err);
  res.status(500).json({ code: 500, message: '服务器内部错误', data: null });
});

// 【已修改】更清晰的启动打印提示
app.listen(PORT, () => {
  console.log(`\n==================================================`);
  console.log(`🚀 饮食计划助手后端服务已成功启动！`);
  console.log(`📡 后端 API 基准地址: http://localhost:${PORT}/api`);
  console.log(`==================================================\n`);
});