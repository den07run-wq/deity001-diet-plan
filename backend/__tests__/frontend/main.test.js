/**
 * @jest-environment jsdom
 */

const fs = require('fs');
const path = require('path');

const mainJs = fs.readFileSync(
  path.join(__dirname, '..', '..', '..', 'frontend', 'js', 'main.js'),
  'utf-8'
);

beforeEach(() => {
  localStorage.clear();
  document.body.innerHTML = '';
});

describe('APP - 前端工具函数', () => {
  beforeAll(() => {
    const script = document.createElement('script');
    script.textContent = mainJs;
    document.body.appendChild(script);
  });

  describe('APP.auth', () => {
    it('isLoggedIn: 无token时应返回false', () => {
      expect(APP.auth.isLoggedIn()).toBe(false);
    });

    it('isLoggedIn: 有token时应返回true', () => {
      localStorage.setItem('diet_plan_token', 'test_token');
      expect(APP.auth.isLoggedIn()).toBe(true);
    });

    it('getUser: 无用户数据时应返回null', () => {
      expect(APP.auth.getUser()).toBeNull();
    });

    it('getUser: 有用户数据时应返回解析后的对象', () => {
      const user = { id: 1, username: 'test', nickname: '昵称' };
      localStorage.setItem('diet_plan_user', JSON.stringify(user));
      expect(APP.auth.getUser()).toEqual(user);
    });

    it('getUser: 无效JSON应抛出异常', () => {
      localStorage.setItem('diet_plan_user', 'invalid json');
      expect(() => APP.auth.getUser()).toThrow();
    });

    it('setUser: 应正确存储用户数据', () => {
      const user = { id: 1, username: 'test' };
      APP.auth.setUser(user);
      expect(localStorage.getItem('diet_plan_user')).toBe(JSON.stringify(user));
    });

    it('setToken: 应正确存储token', () => {
      APP.auth.setToken('my_token');
      expect(localStorage.getItem('diet_plan_token')).toBe('my_token');
    });

    it('logout: 应清除所有存储', () => {
      localStorage.setItem('diet_plan_token', 'token');
      localStorage.setItem('diet_plan_user', '{}');
      localStorage.setItem('other_key', 'keep');

      APP.auth.logout();

      expect(localStorage.getItem('diet_plan_token')).toBeNull();
      expect(localStorage.getItem('diet_plan_user')).toBeNull();
    });
  });

  describe('APP.formatDate', () => {
    it('应正确格式化日期字符串', () => {
      expect(APP.formatDate('2026-01-15')).toBe('2026-01-15');
    });

    it('应正确处理Date对象', () => {
      const date = new Date(2026, 0, 15); // 2026-01-15
      expect(APP.formatDate(date)).toBe('2026-01-15');
    });

    it('应正确处理单数月份和日期（补零）', () => {
      const date = new Date(2026, 0, 5); // 2026-01-05
      expect(APP.formatDate(date)).toBe('2026-01-05');
    });
  });

  describe('APP.formatDateCN', () => {
    it('应返回中文格式日期', () => {
      expect(APP.formatDateCN('2026-01-15')).toBe('2026年1月15日');
    });
  });

  describe('APP.getToday', () => {
    it('应返回YYYY-MM-DD格式的今天日期', () => {
      const today = APP.getToday();
      expect(today).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });

  describe('APP.getDateOffset', () => {
    it('正偏移应返回未来日期', () => {
      const result = APP.getDateOffset(1);
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('负偏移应返回过去日期', () => {
      const result = APP.getDateOffset(-1);
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });

  describe('APP.escapeHtml', () => {
    it('应转义HTML特殊字符', () => {
      expect(APP.escapeHtml('<script>alert("xss")</script>'))
        .toBe('&lt;script&gt;alert("xss")&lt;/script&gt;');
    });

    it('普通文本不变', () => {
      expect(APP.escapeHtml('hello world')).toBe('hello world');
    });

    it('应转义&符号', () => {
      expect(APP.escapeHtml('a & b')).toBe('a &amp; b');
    });
  });

  describe('APP.toast', () => {
    it('应在body中创建toast元素', () => {
      APP.toast('测试消息', 'success');
      const toast = document.querySelector('.toast');
      expect(toast).not.toBeNull();
      expect(toast.textContent).toBe('测试消息');
      expect(toast.className).toContain('toast-success');
    });

    it('多个toast时应替换已存在的toast', () => {
      APP.toast('第一条', 'success');
      APP.toast('第二条', 'error');
      const toasts = document.querySelectorAll('.toast');
      expect(toasts.length).toBe(1);
      expect(toasts[0].textContent).toBe('第二条');
    });
  });

  describe('APP.modal', () => {
    it('show应创建modal元素', () => {
      const result = APP.modal.show('内容', { title: '标题' });
      const overlay = document.querySelector('.modal-overlay');
      expect(overlay).not.toBeNull();

      const title = overlay.querySelector('.modal-title');
      expect(title).not.toBeNull();
      expect(title.textContent).toBe('标题');

      const body = overlay.querySelector('.modal-body');
      expect(body.textContent).toBe('内容');
    });

    it('close应移除modal', () => {
      APP.modal.show('test');
      expect(document.querySelector('.modal-overlay')).not.toBeNull();

      APP.modal.close();
    });

    it('重复show应替换旧modal', () => {
      APP.modal.show('first');
      APP.modal.show('second');
      const modals = document.querySelectorAll('.modal-overlay');
      expect(modals.length).toBe(1);
    });
  });

  describe('APP 常量', () => {
    it('API_BASE应正确设置', () => {
      expect(APP.API_BASE).toBe('http://localhost:8888/api');
    });

    it('weekDays应包含正确的星期', () => {
      expect(APP.weekDays).toEqual(['周一', '周二', '周三', '周四', '周五', '周六', '周日']);
    });

    it('mealTypes应有4个餐次', () => {
      expect(APP.mealTypes.length).toBe(4);
      expect(APP.mealTypes[0].value).toBe('早餐');
      expect(APP.mealTypes[3].value).toBe('加餐');
    });

    it('goals应有4个目标', () => {
      expect(APP.goals).toHaveLength(4);
    });

    it('categories应有10个分类', () => {
      expect(APP.categories).toHaveLength(10);
    });

    it('categoryIcons应有对应图标的映射', () => {
      expect(APP.categoryIcons['主食']).toBe('🍚');
      expect(APP.categoryIcons['肉类']).toBe('🥩');
    });

    it('goalColors应有正确颜色映射', () => {
      expect(APP.goalColors['减脂']).toBe('danger');
      expect(APP.goalColors['增肌']).toBe('info');
    });
  });

  describe('APP.renderSidebar', () => {
    it('应渲染导航菜单', () => {
      const container = document.createElement('div');
      APP.renderSidebar(container, 'index');

      const navItems = container.querySelectorAll('.nav-item');
      expect(navItems.length).toBeGreaterThan(0);
    });
  });
});