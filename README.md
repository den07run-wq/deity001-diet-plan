# 🥗 饮食计划助手

一个功能完整的健康饮食管理平台，帮助用户记录每日饮食、追踪营养摄入、获取 AI 饮食建议。

## 项目结构

```
deity001/
├── backend/           # Express.js 后端
│   ├── app.js         # 入口，端口 8888
│   ├── routes/        # 路由层
│   ├── controllers/   # 控制器（含 AI 逻辑）
│   ├── models/        # 数据模型（原生 SQL）
│   ├── middleware/     # JWT 认证中间件
│   └── __tests__/     # Jest 测试
├── frontend/          # 原生前端（HTML/CSS/JS）
│   ├── index.html     # 首页仪表盘
│   ├── js/            # 页面逻辑（main.js + 各页面 JS）
│   └── css/           # 样式（style.css / diet.css / auth.css）
├── admin-frontend/    # Vue3 管理后台
│   ├── src/views/     # 管理页面（用户管理、食材管理等）
│   └── src/stores/    # Pinia 状态管理
└── database/          # 数据库初始化 & 迁移 SQL
```

## 技术栈

| 模块 | 技术 | 端口 |
|------|------|------|
| 后端 | Express.js + MySQL (mysql2/promise) | 8888 |
| 前端 | 原生 HTML/CSS/JS，Chart.js 图表 | 由后端托管 |
| 管理后台 | Vue 3 + Vite + Element Plus + Pinia | 5173 |

## 功能特性

- **首页仪表盘** — 今日营养概览、饮食记录、饮水追踪、系统公告
- **AI 智能定制** — 基于身体数据 + 口味偏好，AI 生成一周饮食计划
- **饮食计划** — 创建/编辑/删除计划，周视图表格管理
- **食材库** — 200+ 预设食材，按分类浏览，收藏常用食材
- **饮食记录** — 按天记录三餐+加餐，搜索式食材选择器，暂存清单
- **数据周报** — 一周营养趋势折线图 + AI 点评，智能缓存避免重复加载
- **营养报告** — 日/周/月维度营养分析
- **个人中心** — 身体数据管理、体重追踪折线图、密码修改
- **管理后台** — 用户管理、食材管理、公告发布、操作日志

## 快速开始

### 环境要求

- Node.js ≥ 16
- MySQL ≥ 5.7

### 1. 创建数据库

```sql
CREATE DATABASE diet_plan DEFAULT CHARACTER SET utf8mb4;
```

然后导入初始数据：

```bash
mysql -u root -p diet_plan < database/init.sql
```

### 2. 配置环境变量

在 `backend/` 下创建 `.env`：

```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=你的密码
DB_NAME=diet_plan
JWT_SECRET=随机密钥
AI_API_KEY=你的AI_API_KEY（可选，没有则使用本地降级方案）
```

### 3. 启动后端

```bash
cd backend
npm install
node app.js          # 或 npm run dev（nodemon 热重载）
```

后端启动后访问 `http://localhost:8888`。

### 4. 启动管理后台（可选）

```bash
cd admin-frontend
npm install
npx vite
```

管理后台访问 `http://localhost:5173`。

## 运行测试

```bash
cd backend
npm test                              # 全部测试
npx jest --testPathPattern=api.test   # 仅集成测试
```

## 数据库表结构

| 表名 | 说明 |
|------|------|
| `users` | 用户账户 |
| `food_items` | 食材库（200+ 预设） |
| `diet_plans` | 饮食计划 |
| `plan_foods` | 计划中的食材安排 |
| `meal_records` | 饮食记录 |
| `weight_history` | 体重历史 |
| `water_logs` | 饮水记录 |
| `favorite_foods` | 用户收藏的食材 |
| `announcements` | 系统公告 |
| `system_config` | 系统配置 |
| `admin_logs` | 管理员操作日志 |

## 设计风格

治愈系轻食生活风 — 牛油果绿主色调，暖奶白背景，柔和阴影，毛玻璃顶栏与侧边栏，精致微动效。

## License

MIT
