const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { generateToken } = require('../middleware/auth');

const userController = {
  async register(req, res) {
    try {
      const { username, password, nickname } = req.body;

      if (!username || !password) {
        return res.status(400).json({ code: 400, message: '用户名和密码不能为空', data: null });
      }

      if (password.length < 6) {
        return res.status(400).json({ code: 400, message: '密码至少6位', data: null });
      }

      const existingUser = await User.findByUsername(username);
      if (existingUser) {
        return res.status(400).json({ code: 400, message: '用户名已存在', data: null });
      }

      const password_hash = await bcrypt.hash(password, 10);
      const userId = await User.create({ username, password_hash, nickname });

      res.status(201).json({
        code: 201,
        message: '注册成功',
        data: { id: userId, username },
      });
    } catch (err) {
      console.error('注册失败:', err);
      res.status(500).json({ code: 500, message: '服务器内部错误', data: null });
    }
  },

  async login(req, res) {
    try {
      const { username, password } = req.body;

      if (!username || !password) {
        return res.status(400).json({ code: 400, message: '用户名和密码不能为空', data: null });
      }

      const user = await User.findByUsername(username);
      if (!user) {
        return res.status(400).json({ code: 400, message: '用户名或密码错误', data: null });
      }

      const isMatch = await bcrypt.compare(password, user.password_hash);
      if (!isMatch) {
        return res.status(400).json({ code: 400, message: '用户名或密码错误', data: null });
      }

      const token = generateToken(user.id);

      res.json({
        code: 200,
        message: '登录成功',
        data: {
          token,
          user: {
            id: user.id,
            username: user.username,
            nickname: user.nickname,
            gender: user.gender,
            age: user.age,
            height: user.height,
            weight: user.weight,
            goal: user.goal,
            daily_calorie_target: user.daily_calorie_target,
            role: user.role,
          },
        },
      });
    } catch (err) {
      console.error('登录失败:', err);
      res.status(500).json({ code: 500, message: '服务器内部错误', data: null });
    }
  },

  async getProfile(req, res) {
    try {
      const user = await User.findById(req.userId);
      if (!user) {
        return res.status(404).json({ code: 404, message: '用户不存在', data: null });
      }

      res.json({ code: 200, message: 'success', data: user });
    } catch (err) {
      console.error('获取用户信息失败:', err);
      res.status(500).json({ code: 500, message: '服务器内部错误', data: null });
    }
  },

  async updateProfile(req, res) {
    try {
      const { nickname, gender, age, height, weight, goal, daily_calorie_target } = req.body;

      if (gender && !['男', '女'].includes(gender)) {
        return res.status(400).json({ code: 400, message: '性别仅支持"男"或"女"', data: null });
      }
      if (goal && !['减脂', '增肌', '保持健康', '其他'].includes(goal)) {
        return res.status(400).json({ code: 400, message: '无效的健康目标', data: null });
      }

      const updated = await User.update(req.userId, {
        nickname, gender, age, height, weight, goal, daily_calorie_target,
      });

      if (!updated) {
        return res.status(400).json({ code: 400, message: '没有需要更新的字段', data: null });
      }

      const user = await User.findById(req.userId);
      res.json({ code: 200, message: '更新成功', data: user });
    } catch (err) {
      console.error('更新用户信息失败:', err);
      res.status(500).json({ code: 500, message: '服务器内部错误', data: null });
    }
  },

  async updatePassword(req, res) {
    try {
      const { old_password, new_password } = req.body;

      if (!old_password || !new_password) {
        return res.status(400).json({ code: 400, message: '旧密码和新密码不能为空', data: null });
      }

      if (new_password.length < 6) {
        return res.status(400).json({ code: 400, message: '新密码至少6位', data: null });
      }

      const user = await User.findByUsername(req.userId);
      const currentUser = await User.findById(req.userId);
      if (!currentUser) {
        return res.status(404).json({ code: 404, message: '用户不存在', data: null });
      }

      const fullUser = await User.findByUsername(currentUser.username);
      const isMatch = await bcrypt.compare(old_password, fullUser.password_hash);
      if (!isMatch) {
        return res.status(400).json({ code: 400, message: '旧密码错误', data: null });
      }

      const password_hash = await bcrypt.hash(new_password, 10);
      await User.updatePassword(req.userId, password_hash);

      res.json({ code: 200, message: '密码修改成功', data: null });
    } catch (err) {
      console.error('修改密码失败:', err);
      res.status(500).json({ code: 500, message: '服务器内部错误', data: null });
    }
  },
};

module.exports = userController;