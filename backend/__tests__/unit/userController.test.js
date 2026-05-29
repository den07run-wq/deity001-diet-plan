jest.mock('../../config/db', () => ({
  query: jest.fn(),
}));

jest.mock('../../models/User', () => ({
  findByUsername: jest.fn(),
  findById: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  updatePassword: jest.fn(),
}));

jest.mock('bcryptjs', () => ({
  hash: jest.fn().mockResolvedValue('hashed_password'),
  compare: jest.fn(),
}));

jest.mock('../../middleware/auth', () => ({
  generateToken: jest.fn().mockReturnValue('mock_token_123'),
  authMiddleware: jest.fn((req, res, next) => next()),
  JWT_SECRET: 'test_secret',
}));

const bcrypt = require('bcryptjs');
const User = require('../../models/User');
const userController = require('../../controllers/userController');

function mockRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

describe('User Controller', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('缺少username应返回400', async () => {
      const req = { body: { password: '123456' } };
      const res = mockRes();

      await userController.register(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ code: 400 })
      );
    });

    it('缺少password应返回400', async () => {
      const req = { body: { username: 'test' } };
      const res = mockRes();

      await userController.register(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('密码少于6位应返回400', async () => {
      const req = { body: { username: 'test', password: '123' } };
      const res = mockRes();

      await userController.register(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: '密码至少6位' })
      );
    });

    it('用户名已存在应返回400', async () => {
      User.findByUsername.mockResolvedValue({ id: 1 });
      const req = { body: { username: 'existing', password: '123456' } };
      const res = mockRes();

      await userController.register(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: '用户名已存在' })
      );
    });

    it('注册成功应返回201和用户信息', async () => {
      User.findByUsername.mockResolvedValue(null);
      User.create.mockResolvedValue(10);
      const req = { body: { username: 'newuser', password: '123456', nickname: '新用户' } };
      const res = mockRes();

      await userController.register(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 201,
          message: '注册成功',
          data: { id: 10, username: 'newuser' },
        })
      );
      expect(bcrypt.hash).toHaveBeenCalledWith('123456', 10);
    });

    it('注册异常应返回500', async () => {
      User.findByUsername.mockRejectedValue(new Error('DB error'));
      const req = { body: { username: 'test', password: '123456' } };
      const res = mockRes();

      await userController.register(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('login', () => {
    it('缺少username应返回400', async () => {
      const req = { body: { password: '123456' } };
      const res = mockRes();

      await userController.login(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('用户不存在应返回400', async () => {
      User.findByUsername.mockResolvedValue(null);
      const req = { body: { username: 'no', password: '123456' } };
      const res = mockRes();

      await userController.login(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: '用户名或密码错误' })
      );
    });

    it('密码不匹配应返回400', async () => {
      User.findByUsername.mockResolvedValue({ id: 1, password_hash: 'hash' });
      bcrypt.compare.mockResolvedValue(false);
      const req = { body: { username: 'test', password: 'wrong' } };
      const res = mockRes();

      await userController.login(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('登录成功应返回token和用户信息', async () => {
      const mockUser = {
        id: 1, username: 'test', nickname: '昵称',
        gender: '男', age: 25, height: 175, weight: 70,
        goal: '减脂', daily_calorie_target: 2000,
      };
      User.findByUsername.mockResolvedValue({ ...mockUser, password_hash: 'hash' });
      bcrypt.compare.mockResolvedValue(true);
      const req = { body: { username: 'test', password: '123456' } };
      const res = mockRes();

      await userController.login(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 200,
          message: '登录成功',
          data: expect.objectContaining({
            token: 'mock_token_123',
            user: expect.objectContaining({ id: 1 }),
          }),
        })
      );
    });
  });

  describe('getProfile', () => {
    it('用户存在应返回用户信息', async () => {
      User.findById.mockResolvedValue({ id: 1, username: 'test' });
      const req = { userId: 1 };
      const res = mockRes();

      await userController.getProfile(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ code: 200, data: { id: 1, username: 'test' } })
      );
    });

    it('用户不存在应返回404', async () => {
      User.findById.mockResolvedValue(null);
      const req = { userId: 999 };
      const res = mockRes();

      await userController.getProfile(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  describe('updateProfile', () => {
    it('非法性别应返回400', async () => {
      const req = { userId: 1, body: { gender: '未知' } };
      const res = mockRes();

      await userController.updateProfile(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('非法目标应返回400', async () => {
      const req = { userId: 1, body: { goal: '不存在的目标' } };
      const res = mockRes();

      await userController.updateProfile(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('合法更新应返回200和更新后的用户信息', async () => {
      User.update.mockResolvedValue(true);
      User.findById.mockResolvedValue({ id: 1, nickname: '新昵称' });
      const req = { userId: 1, body: { nickname: '新昵称', gender: '男' } };
      const res = mockRes();

      await userController.updateProfile(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ code: 200, message: '更新成功' })
      );
    });

    it('无有效字段应返回400', async () => {
      User.update.mockResolvedValue(false);
      const req = { userId: 1, body: {} };
      const res = mockRes();

      await userController.updateProfile(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe('updatePassword', () => {
    it('新旧密码为空应返回400', async () => {
      const req = { userId: 1, body: { old_password: '', new_password: '' } };
      const res = mockRes();

      await userController.updatePassword(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('新密码少于6位应返回400', async () => {
      const req = { userId: 1, body: { old_password: 'old', new_password: '123' } };
      const res = mockRes();

      await userController.updatePassword(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('用户不存在应返回404', async () => {
      User.findById.mockResolvedValue(null);
      const req = { userId: 999, body: { old_password: 'old', new_password: 'new123' } };
      const res = mockRes();

      await userController.updatePassword(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('旧密码错误应返回400', async () => {
      User.findById.mockResolvedValue({ id: 1, username: 'test' });
      User.findByUsername.mockResolvedValue({ id: 1, password_hash: 'hash' });
      bcrypt.compare.mockResolvedValue(false);
      const req = { userId: 1, body: { old_password: 'wrong', new_password: 'new123' } };
      const res = mockRes();

      await userController.updatePassword(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: '旧密码错误' })
      );
    });

    it('密码修改成功应返回200', async () => {
      User.findById.mockResolvedValue({ id: 1, username: 'test' });
      User.findByUsername.mockResolvedValue({ id: 1, password_hash: 'old_hash' });
      bcrypt.compare.mockResolvedValue(true);
      User.updatePassword.mockResolvedValue(true);
      const req = { userId: 1, body: { old_password: 'old', new_password: 'new123' } };
      const res = mockRes();

      await userController.updatePassword(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ code: 200, message: '密码修改成功' })
      );
    });
  });
});