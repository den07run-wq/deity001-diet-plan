const jwt = require('jsonwebtoken');
const { generateToken, authMiddleware, JWT_SECRET } = require('../../middleware/auth');

describe('Auth Middleware', () => {
  describe('generateToken', () => {
    it('应生成有效的JWT token', () => {
      const token = generateToken(1);
      expect(token).toBeTruthy();
      expect(typeof token).toBe('string');
    });

    it('生成的token应包含userId', () => {
      const token = generateToken(42);
      const decoded = jwt.verify(token, JWT_SECRET);
      expect(decoded.userId).toBe(42);
    });

    it('生成的token应有过期时间', () => {
      const token = generateToken(1);
      const decoded = jwt.verify(token, JWT_SECRET);
      expect(decoded.exp).toBeDefined();
      expect(decoded.exp).toBeGreaterThan(Math.floor(Date.now() / 1000));
    });

    it('不同userId应生成不同的token', () => {
      const token1 = generateToken(1);
      const token2 = generateToken(2);
      expect(token1).not.toBe(token2);
    });
  });

  describe('authMiddleware', () => {
    let req, res, next;

    beforeEach(() => {
      req = { headers: {} };
      res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
      };
      next = jest.fn();
    });

    it('无Authorization头时应返回401', () => {
      authMiddleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        code: 401,
        message: '未登录或Token已过期',
        data: null,
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('Authorization头不以Bearer开头时应返回401', () => {
      req.headers.authorization = 'Basic xyz';

      authMiddleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
    });

    it('有效token应调用next并在req上设置userId', () => {
      const token = generateToken(99);
      req.headers.authorization = `Bearer ${token}`;

      authMiddleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.userId).toBe(99);
    });

    it('无效token应返回401', () => {
      req.headers.authorization = 'Bearer invalid_token_here';

      authMiddleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        code: 401,
        message: 'Token无效或已过期',
        data: null,
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('过期token应返回401', () => {
      const expiredToken = jwt.sign({ userId: 1 }, JWT_SECRET, { expiresIn: '0s' });
      req.headers.authorization = `Bearer ${expiredToken}`;

      authMiddleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
    });

    it('Authorization头为空字符串时应返回401', () => {
      req.headers.authorization = '';

      authMiddleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
    });
  });
});