jest.mock('../../config/db', () => ({
  query: jest.fn(),
}));

const pool = require('../../config/db');
const User = require('../../models/User');

describe('User Model', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('findByUsername', () => {
    it('应返回匹配的用户', async () => {
      const mockUser = { id: 1, username: 'test', password_hash: 'hash123' };
      pool.query.mockResolvedValue([[mockUser]]);

      const user = await User.findByUsername('test');

      expect(user).toEqual(mockUser);
      expect(pool.query).toHaveBeenCalledWith(
        'SELECT * FROM users WHERE username = ?',
        ['test']
      );
    });

    it('用户不存在时应返回null', async () => {
      pool.query.mockResolvedValue([[]]);

      const user = await User.findByUsername('nonexistent');

      expect(user).toBeNull();
    });
  });

  describe('findById', () => {
    it('应返回不包含密码字段的用户信息', async () => {
      const mockUser = { id: 1, username: 'test', nickname: '昵称' };
      pool.query.mockResolvedValue([[mockUser]]);

      const user = await User.findById(1);

      expect(user).toEqual(mockUser);
      const sql = pool.query.mock.calls[0][0];
      expect(sql).not.toContain('password_hash');
    });

    it('用户不存在时应返回null', async () => {
      pool.query.mockResolvedValue([[]]);

      const user = await User.findById(999);

      expect(user).toBeNull();
    });
  });

  describe('create', () => {
    it('应创建新用户并返回insertId', async () => {
      pool.query.mockResolvedValue([{ insertId: 5 }]);

      const id = await User.create({
        username: 'newuser',
        password_hash: 'hashed',
        nickname: '新用户',
      });

      expect(id).toBe(5);
      expect(pool.query).toHaveBeenCalledWith(
        'INSERT INTO users (username, password_hash, nickname) VALUES (?, ?, ?)',
        ['newuser', 'hashed', '新用户']
      );
    });

    it('未提供nickname时应使用username作为默认值', async () => {
      pool.query.mockResolvedValue([{ insertId: 10 }]);

      await User.create({
        username: 'user1',
        password_hash: 'hash',
      });

      expect(pool.query).toHaveBeenCalledWith(
        'INSERT INTO users (username, password_hash, nickname) VALUES (?, ?, ?)',
        ['user1', 'hash', 'user1']
      );
    });
  });

  describe('update', () => {
    it('应更新允许的字段', async () => {
      pool.query.mockResolvedValue([{}]);

      const result = await User.update(1, {
        nickname: '新昵称',
        gender: '男',
        age: 25,
        height: 175,
        weight: 70,
        goal: '减脂',
        daily_calorie_target: 2000,
      });

      expect(result).toBe(true);
      expect(pool.query).toHaveBeenCalledTimes(1);
    });

    it('应忽略不允许的字段', async () => {
      const result = await User.update(1, {
        username: 'hacked',
        password_hash: 'bad',
      });

      expect(result).toBe(false);
      expect(pool.query).not.toHaveBeenCalled();
    });

    it('部分字段更新应只更新提供的字段', async () => {
      pool.query.mockResolvedValue([{}]);

      await User.update(1, { nickname: '新名' });

      const sql = pool.query.mock.calls[0][0];
      expect(sql).toContain('nickname = ?');
      expect(sql).not.toContain('gender');
    });

    it('所有字段为undefined时应返回false', async () => {
      const result = await User.update(1, {});

      expect(result).toBe(false);
      expect(pool.query).not.toHaveBeenCalled();
    });
  });

  describe('updatePassword', () => {
    it('应更新密码哈希', async () => {
      pool.query.mockResolvedValue([{}]);

      const result = await User.updatePassword(1, 'new_hash');

      expect(result).toBe(true);
      expect(pool.query).toHaveBeenCalledWith(
        'UPDATE users SET password_hash = ? WHERE id = ?',
        ['new_hash', 1]
      );
    });
  });
});