const APP = {
  API_BASE: 'http://localhost:8888/api',
  TOKEN_KEY: 'diet_plan_token',
  USER_KEY: 'diet_plan_user',
};

APP.api = {
  async request(url, options = {}) {
    const token = localStorage.getItem(APP.TOKEN_KEY);
    const isFormData = options.body instanceof FormData;
    const headers = {
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    };

    try {
      const response = await fetch(`${APP.API_BASE}${url}`, {
        ...options,
        headers,
      });

      if (response.status === 401) {
        localStorage.removeItem(APP.TOKEN_KEY);
        localStorage.removeItem(APP.USER_KEY);
        window.location.href = 'login.html';
        return null;
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || '请求失败');
      }

      return data;
    } catch (error) {
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        APP.toast('网络连接失败，请检查服务器是否启动', 'error');
      }
      throw error;
    }
  },

  get(url) {
    return this.request(url, { method: 'GET' });
  },

  post(url, body) {
    return this.request(url, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },

  put(url, body) {
    return this.request(url, {
      method: 'PUT',
      body: JSON.stringify(body),
    });
  },

  delete(url) {
    return this.request(url, { method: 'DELETE' });
  },
};

APP.auth = {
  isLoggedIn() {
    return !!localStorage.getItem(APP.TOKEN_KEY);
  },

  getUser() {
    const user = localStorage.getItem(APP.USER_KEY);
    return user ? JSON.parse(user) : null;
  },

  setUser(user) {
    localStorage.setItem(APP.USER_KEY, JSON.stringify(user));
  },

  setToken(token) {
    localStorage.setItem(APP.TOKEN_KEY, token);
  },

  logout() {
    localStorage.removeItem(APP.TOKEN_KEY);
    localStorage.removeItem(APP.USER_KEY);
    window.location.href = 'login.html';
  },

  requireAuth() {
    if (!this.isLoggedIn()) {
      window.location.href = 'login.html';
      return false;
    }
    return true;
  },
};

APP.toast = (message, type = 'success') => {
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
};

APP.modal = {
  show(content, options = {}) {
    const existing = document.querySelector('.modal-overlay');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';

    const modal = document.createElement('div');
    modal.className = 'modal';

    if (options.title) {
      const title = document.createElement('h2');
      title.className = 'modal-title';
      title.textContent = options.title;
      modal.appendChild(title);
    }

    const body = document.createElement('div');
    body.className = 'modal-body';
    if (typeof content === 'string') {
      body.innerHTML = content;
    } else {
      body.appendChild(content);
    }
    modal.appendChild(body);

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        this.close();
      }
    });

    return { overlay, modal, body };
  },

  close() {
    const overlay = document.querySelector('.modal-overlay');
    if (overlay) {
      overlay.style.opacity = '0';
      overlay.style.transition = 'opacity 0.2s ease';
      setTimeout(() => overlay.remove(), 200);
    }
  },
};

APP.formatDate = (dateStr) => {
  const date = new Date(dateStr);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

APP.formatDateCN = (dateStr) => {
  const date = new Date(dateStr);
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
};

APP.getToday = () => {
  return APP.formatDate(new Date());
};

APP.getDateOffset = (offset) => {
  const date = new Date();
  date.setDate(date.getDate() + offset);
  return APP.formatDate(date);
};

APP.weekDays = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];

APP.mealTypes = [
  { value: '早餐', label: '早餐', icon: '🌅' },
  { value: '午餐', label: '午餐', icon: '☀️' },
  { value: '晚餐', label: '晚餐', icon: '🌙' },
  { value: '加餐', label: '加餐', icon: '🍎' },
];

APP.goals = [
  { value: '减脂', label: '减脂' },
  { value: '增肌', label: '增肌' },
  { value: '保持健康', label: '保持健康' },
  { value: '其他', label: '其他' },
];

APP.categories = [
  '主食', '肉类', '蛋奶', '豆类', '蔬菜', '水果',
  '零食', '饮品', '调味料', '其他',
];

APP.categoryIcons = {
  '主食': '🍚',
  '肉类': '🥩',
  '蛋奶': '🥚',
  '豆类': '🫘',
  '蔬菜': '🥬',
  '水果': '🍎',
  '零食': '🍪',
  '饮品': '🥤',
  '调味料': '🧂',
  '其他': '📦',
};

APP.goalColors = {
  '减脂': 'danger',
  '增肌': 'info',
  '保持健康': 'primary',
  '其他': 'warning',
};

APP.goalClasses = {
  '减脂': 'goal-loss',
  '增肌': 'goal-gain',
  '保持健康': 'goal-maintain',
  '其他': 'goal-other',
};

APP.cache = {
  REPORT_KEY: 'weekly_report_cache',
  REPORT_STALE_KEY: 'weekly_report_stale',

  get(key) {
    try {
      const raw = sessionStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },

  set(key, data) {
    try {
      sessionStorage.setItem(key, JSON.stringify(data));
    } catch {
      // sessionStorage full or unavailable — silently ignore
    }
  },

  remove(key) {
    sessionStorage.removeItem(key);
  },

  markReportStale() {
    sessionStorage.setItem(this.REPORT_STALE_KEY, '1');
  },

  isReportStale() {
    return sessionStorage.getItem(this.REPORT_STALE_KEY) === '1';
  },

  clearReportStale() {
    sessionStorage.removeItem(this.REPORT_STALE_KEY);
  },
};

APP.escapeHtml = (str) => {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
};

APP.renderHeader = (container) => {
  const user = APP.auth.getUser();
  if (!user) {
    window.location.href = 'login.html';
    return;
  }

  const avatar = (user.nickname || user.username || '用')[0].toUpperCase();
  const goal = user.goal || '未设置';
  const goalClass = APP.goalClasses[goal] || 'goal-none';

  container.innerHTML = `
    <div class="logo">
      <span class="logo-icon">🥗</span>
      饮食计划助手
    </div>
    <div class="header-right">
      <div class="user-info" id="user-info-trigger">
        <div class="user-avatar">${avatar}</div>
        <span>${APP.escapeHtml(user.nickname || user.username)}</span>
        <span class="dropdown-arrow">▾</span>
        <div class="user-dropdown">
          <div class="dropdown-section">
            <div class="dropdown-goal-row">
              <span class="dropdown-goal-label">健康目标</span>
              <span class="dropdown-goal-value ${goalClass}">${APP.escapeHtml(goal)}</span>
            </div>
            <a class="dropdown-profile-link" href="profile.html">
              <span>👤</span> 个人中心
            </a>
          </div>
          <div class="dropdown-section dropdown-ai-tip" id="dropdown-ai-tip">
            <div class="ai-tip-header">💡 今日建议</div>
            <div class="ai-tip-content">保持均衡饮食，记得记录今天的饮食哦～</div>
          </div>
          <div class="dropdown-section dropdown-logout-section">
            <button class="dropdown-logout-btn" onclick="APP.auth.logout()">退出登录</button>
          </div>
        </div>
      </div>
    </div>
  `;

  APP.initUserDropdown();

  // Try to fetch real AI suggestion
  APP.fetchAiTip();
};

APP.initUserDropdown = () => {
  const trigger = document.getElementById('user-info-trigger');
  if (!trigger) return;

  trigger.addEventListener('click', (e) => {
    e.stopPropagation();
    trigger.classList.toggle('open');
  });

  document.addEventListener('click', (e) => {
    if (!trigger.contains(e.target)) {
      trigger.classList.remove('open');
    }
  });
};

APP.fetchAiTip = () => {
  const tipEl = document.querySelector('#dropdown-ai-tip .ai-tip-content');
  if (!tipEl) return;

  const user = APP.auth.getUser();
  const goal = user.goal || '保持健康';
  const defaults = {
    '减脂': '控制碳水摄入的同时，别忘了保证蛋白质充足，每餐都要有优质蛋白哦～',
    '增肌': '训练后30分钟内记得补充蛋白质和碳水，今天再加一份鸡胸肉吧！',
    '保持健康': '保持均衡饮食，记得记录今天的饮食哦～',
    '其他': '注意营养均衡，多吃蔬菜水果，保持好心情～',
  };
  tipEl.textContent = defaults[goal] || defaults['保持健康'];
};

APP.renderSidebar = (container, currentPage) => {
  const navItems = [
    { page: 'index', label: '首页仪表盘', icon: '📊', href: 'index.html' },
    { page: 'ai-plan', label: 'AI 智能定制', icon: '🤖', href: 'ai-plan.html' },
    { page: 'diet-plan', label: '饮食计划', icon: '📋', href: 'diet-plan.html' },
    { page: 'food-library', label: '食材库', icon: '📦', href: 'food-library.html' },
    { page: 'meal-record', label: '饮食记录', icon: '📝', href: 'meal-record.html' },
    { page: 'nutrition-report', label: '营养报告', icon: '📈', href: 'nutrition-report.html' },
    { page: 'weekly-report', label: '数据周报', icon: '📋', href: 'weekly-report.html' },
    { page: 'profile', label: '个人中心', icon: '👤', href: 'profile.html' },
  ];

  let html = '<div class="nav-section"><div class="nav-section-title">主菜单</div>';
  navItems.forEach((item) => {
    html += `
      <a href="${item.href}" class="nav-item ${currentPage === item.page ? 'active' : ''}">
        <span class="nav-icon">${item.icon}</span>
        <span>${item.label}</span>
      </a>
    `;
  });
  html += '</div>';

  container.innerHTML = html;
};

APP.initPage = (currentPage) => {
  if (!APP.auth.requireAuth()) return;

  const header = document.getElementById('app-header');
  const sidebar = document.getElementById('app-sidebar');

  if (header) APP.renderHeader(header);
  if (sidebar) APP.renderSidebar(sidebar, currentPage);
};