const Nutrition = {
  currentView: 'daily',
  currentDate: APP.getToday(),
};

Nutrition.init = function () {
  document.querySelectorAll('.chart-tabs .tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      this.currentView = tab.dataset.view;
      document.querySelectorAll('.chart-tabs .tab').forEach((t) => t.classList.remove('active'));
      tab.classList.add('active');
      this.loadData();
    });
  });

  document.getElementById('btn-prev-nutrition').addEventListener('click', () => this.navigate(-1));
  document.getElementById('btn-next-nutrition').addEventListener('click', () => this.navigate(1));
  this.updateDateDisplay();
  this.loadData();
};

Nutrition.navigate = function (offset) {
  if (this.currentView === 'daily') {
    const d = new Date(this.currentDate);
    d.setDate(d.getDate() + offset);
    this.currentDate = APP.formatDate(d);
  } else if (this.currentView === 'weekly') {
    const d = new Date(this.currentDate);
    d.setDate(d.getDate() + offset * 7);
    this.currentDate = APP.formatDate(d);
  } else if (this.currentView === 'monthly') {
    const d = new Date(this.currentDate);
    d.setMonth(d.getMonth() + offset);
    this.currentDate = APP.formatDate(d);
  }
  this.updateDateDisplay();
  this.loadData();
};

Nutrition.updateDateDisplay = function () {
  const el = document.getElementById('nutrition-date-display');
  if (this.currentView === 'daily') {
    el.textContent = APP.formatDateCN(this.currentDate);
  } else if (this.currentView === 'weekly') {
    el.textContent = `第 ${APP.formatDateCN(this.currentDate)} 周`;
  } else if (this.currentView === 'monthly') {
    const d = new Date(this.currentDate);
    el.textContent = `${d.getFullYear()}年${d.getMonth() + 1}月`;
  }
};

Nutrition.loadData = async function () {
  const chartContainer = document.getElementById('chart-area');
  const suggestionContainer = document.getElementById('suggestions-area');
  chartContainer.innerHTML = '<div class="loading">加载中</div>';
  suggestionContainer.innerHTML = '';

  try {
    let url;
    if (this.currentView === 'daily') {
      url = `/nutrition/daily?date=${this.currentDate}`;
    } else if (this.currentView === 'weekly') {
      url = `/nutrition/weekly?start=${this.currentDate}`;
    } else {
      const d = new Date(this.currentDate);
      url = `/nutrition/monthly?year=${d.getFullYear()}&month=${d.getMonth() + 1}`;
    }

    const res = await APP.api.get(url);
    if (res && res.code === 200) {
      this.renderChart(res.data);
      this.renderSuggestions(res.data);
    }
  } catch (err) {
    chartContainer.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">⚠️</div>
        <p>加载营养数据失败</p>
        <button class="btn btn-primary btn-sm" onclick="Nutrition.loadData()">重试</button>
      </div>
    `;
  }
};

Nutrition.renderChart = function (data) {
  const container = document.getElementById('chart-area');
  const target = data.targetNutrition || {};
  const targetCalories = parseFloat(target.calories) || 2000;
  const targetProtein = parseFloat(target.protein) || 60;
  const targetFat = parseFloat(target.fat) || 50;
  const targetCarbs = parseFloat(target.carbs) || 250;

  if (this.currentView === 'daily') {
    const total = data.totalNutrition || {};
    const actualCalories = parseFloat(total.calories) || 0;
    const actualProtein = parseFloat(total.protein) || 0;
    const actualFat = parseFloat(total.fat) || 0;
    const actualCarbs = parseFloat(total.carbs) || 0;

    container.innerHTML = `
      <div class="chart-container" style="margin-bottom:0;">
        <h3>📊 ${APP.formatDateCN(this.currentDate)} 营养摄入</h3>
        <div class="nutrient-row">
          <span class="nutrient-label">热量</span>
          <div class="nutrient-bar">
            <div class="progress-bar progress-bar-lg">
              <div class="progress-fill warning" style="width:${Math.min((actualCalories / targetCalories) * 100, 100)}%"></div>
            </div>
          </div>
          <span class="nutrient-value">
            <span class="current">${Math.round(actualCalories)}</span>
            <span class="target"> / ${Math.round(targetCalories)} kcal</span>
          </span>
        </div>
        <div class="nutrient-row">
          <span class="nutrient-label">蛋白质</span>
          <div class="nutrient-bar">
            <div class="progress-bar progress-bar-lg">
              <div class="progress-fill danger" style="width:${Math.min((actualProtein / targetProtein) * 100, 100)}%"></div>
            </div>
          </div>
          <span class="nutrient-value">
            <span class="current">${actualProtein.toFixed(1)}</span>
            <span class="target"> / ${targetProtein}g</span>
          </span>
        </div>
        <div class="nutrient-row">
          <span class="nutrient-label">脂肪</span>
          <div class="nutrient-bar">
            <div class="progress-bar progress-bar-lg">
              <div class="progress-fill warning" style="width:${Math.min((actualFat / targetFat) * 100, 100)}%"></div>
            </div>
          </div>
          <span class="nutrient-value">
            <span class="current">${actualFat.toFixed(1)}</span>
            <span class="target"> / ${targetFat}g</span>
          </span>
        </div>
        <div class="nutrient-row">
          <span class="nutrient-label">碳水</span>
          <div class="nutrient-bar">
            <div class="progress-bar progress-bar-lg">
              <div class="progress-fill info" style="width:${Math.min((actualCarbs / targetCarbs) * 100, 100)}%"></div>
            </div>
          </div>
          <span class="nutrient-value">
            <span class="current">${actualCarbs.toFixed(1)}</span>
            <span class="target"> / ${targetCarbs}g</span>
          </span>
        </div>
      </div>
    `;
  } else {
    this.renderBarChart(data, targetCalories, targetProtein, targetFat, targetCarbs);
  }
};

Nutrition.renderBarChart = function (data, targetCalories, targetProtein, targetFat, targetCarbs) {
  const container = document.getElementById('chart-area');
  const dailyData = data.dailyData || [];
  const periodLabel = this.currentView === 'weekly' ? '本周' : '本月';

  if (dailyData.length === 0) {
    container.innerHTML = `
      <div class="chart-container" style="margin-bottom:0;">
        <h3>📊 ${periodLabel}营养摄入趋势</h3>
        <div class="empty-state">
          <div class="empty-icon">📊</div>
          <p>暂无数据</p>
        </div>
      </div>
    `;
    return;
  }

  const maxCalories = Math.max(targetCalories, ...dailyData.map((d) => parseFloat(d.calories) || 0));

  let rowsHtml = '';
  dailyData.forEach((day, idx) => {
    const cal = parseFloat(day.calories) || 0;
    const protein = parseFloat(day.protein) || 0;
    const fat = parseFloat(day.fat) || 0;
    const carbs = parseFloat(day.carbs) || 0;
    const pct = Math.min((cal / targetCalories) * 100, 100);
    const color = cal > targetCalories * 1.1 ? 'danger' : cal > targetCalories * 0.8 ? 'warning' : 'primary';
    const label = day.date ? APP.formatDate(day.date).slice(5) : `Day ${idx + 1}`;

    rowsHtml += `
      <div class="nutrient-row">
        <span class="nutrient-label" style="width:60px; font-size:12px;">${label}</span>
        <div class="nutrient-bar">
          <div class="progress-bar progress-bar-lg">
            <div class="progress-fill ${color}" style="width:${pct}%"></div>
          </div>
        </div>
        <span class="nutrient-value">
          <span class="current">${Math.round(cal)}</span>
          <span class="target"> / ${Math.round(targetCalories)} kcal</span>
        </span>
      </div>
    `;
  });

  container.innerHTML = `
    <div class="chart-container" style="margin-bottom:0;">
      <h3>📊 ${periodLabel}热量摄入趋势</h3>
      ${rowsHtml}
    </div>
  `;
};

Nutrition.renderSuggestions = function (data) {
  const container = document.getElementById('suggestions-area');
  const suggestions = data.suggestions || [];

  if (suggestions.length === 0) {
    container.innerHTML = `
      <div class="card">
        <div class="card-header"><h3>💡 饮食建议</h3></div>
        <div class="card-body">
          <p class="text-muted">暂无特别建议，继续保持良好的饮食习惯！</p>
        </div>
      </div>
    `;
    return;
  }

  let html = '<div class="card"><div class="card-header"><h3>💡 饮食建议</h3></div><div class="card-body">';
  suggestions.forEach((s) => {
    const typeClass = s.type === 'warn' ? 'warn' : s.type === 'tip' ? 'tip' : '';
    html += `
      <div class="suggestion-card ${typeClass}">
        <p>${APP.escapeHtml(s.content || s.message || s)}</p>
      </div>
    `;
  });
  html += '</div></div>';

  container.innerHTML = html;
};