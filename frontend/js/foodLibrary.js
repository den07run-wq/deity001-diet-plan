const FoodLibrary = {
  foods: [],
  currentCategory: '全部',
  searchKeyword: '',
  favoriteIds: new Set(),
};

FoodLibrary.init = function () {
  const searchInput = document.getElementById('food-search');
  searchInput.addEventListener('input', () => {
    this.searchKeyword = searchInput.value.trim();
    this.filterAndRender();
  });

  document.getElementById('btn-add-custom-food').addEventListener('click', () => this.showAddCustomFoodModal());
  this.renderCategories();
  this.loadFavoriteIds();
  this.loadFoods();
};

FoodLibrary.loadFavoriteIds = async function () {
  try {
    const res = await APP.api.get('/food/favorites/ids');
    if (res && res.code === 200 && res.data) {
      this.favoriteIds = new Set(res.data);
    }
  } catch (err) {
    console.error('加载收藏列表失败:', err);
  }
};

FoodLibrary.toggleFavorite = async function (foodId, starEl) {
  try {
    const res = await APP.api.post(`/food/${foodId}/favorite`);
    if (res && (res.code === 200 || res.code === 201)) {
      if (res.data && res.data.favorited) {
        this.favoriteIds.add(foodId);
      } else {
        this.favoriteIds.delete(foodId);
      }
      this.filterAndRender();
    }
  } catch (err) {
    APP.toast('操作失败', 'error');
  }
};

FoodLibrary.renderCategories = function () {
  const container = document.getElementById('category-tabs');
  let html = `<button class="category-tab ${this.currentCategory === '全部' ? 'active' : ''}" data-category="全部">全部</button>`;
  APP.categories.forEach((cat) => {
    html += `<button class="category-tab ${this.currentCategory === cat ? 'active' : ''}" data-category="${cat}">${APP.categoryIcons[cat] || ''} ${cat}</button>`;
  });
  container.innerHTML = html;

  container.querySelectorAll('.category-tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      this.currentCategory = tab.dataset.category;
      this.renderCategories();
      this.filterAndRender();
    });
  });
};

FoodLibrary.loadFoods = async function () {
  const container = document.getElementById('food-list');
  container.innerHTML = '<div class="loading">加载中</div>';

  try {
    const res = await APP.api.get('/food');
    if (res && res.code === 200) {
      this.foods = res.data || [];
      this.filterAndRender();
    }
  } catch (err) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">⚠️</div>
        <p>加载食材失败</p>
        <button class="btn btn-primary btn-sm" onclick="FoodLibrary.loadFoods()">重试</button>
      </div>
    `;
  }
};

FoodLibrary.filterAndRender = function () {
  const container = document.getElementById('food-list');
  let filtered = this.foods;

  if (this.currentCategory !== '全部') {
    filtered = filtered.filter((f) => f.category === this.currentCategory);
  }

  if (this.searchKeyword) {
    const keyword = this.searchKeyword.toLowerCase();
    filtered = filtered.filter((f) => f.name.toLowerCase().includes(keyword));
  }

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="empty-state" style="grid-column: 1 / -1;">
        <div class="empty-icon">📦</div>
        <p>没有找到匹配的食材</p>
      </div>
    `;
    return;
  }

  let html = '';
  filtered.forEach((food) => {
    const icon = APP.categoryIcons[food.category] || '📦';
    const isFav = this.favoriteIds.has(food.id);
    html += `
      <div class="food-card">
        <div class="food-header">
          <span class="food-icon" onclick="FoodLibrary.showFoodDetail(${food.id})">${icon}</span>
          <div style="flex:1;cursor:pointer" onclick="FoodLibrary.showFoodDetail(${food.id})">
            <div class="food-name">${APP.escapeHtml(food.name)}</div>
            <div class="food-category">${food.category} · ${food.calories_per_100g}kcal/100g</div>
          </div>
          <span class="fav-star${isFav ? ' active' : ''}" onclick="FoodLibrary.toggleFavorite(${food.id}, this)" title="${isFav ? '取消收藏' : '添加收藏'}">${isFav ? '★' : '☆'}</span>
        </div>
        <div class="food-nutrients" onclick="FoodLibrary.showFoodDetail(${food.id})" style="cursor:pointer">
          <div class="food-nutrient">蛋白质 <span class="num">${food.protein_per_100g || 0}g</span></div>
          <div class="food-nutrient">脂肪 <span class="num">${food.fat_per_100g || 0}g</span></div>
          <div class="food-nutrient">碳水 <span class="num">${food.carbs_per_100g || 0}g</span></div>
          <div class="food-nutrient">纤维 <span class="num">${food.fiber_per_100g || 0}g</span></div>
        </div>
        ${food.is_custom ? '<div class="food-actions"><span class="tag tag-info">自定义</span></div>' : ''}
      </div>
    `;
  });

  container.innerHTML = html;
};

FoodLibrary.showFoodDetail = function (foodId) {
  const food = this.foods.find((f) => f.id === foodId);
  if (!food) return;

  const icon = APP.categoryIcons[food.category] || '📦';

  const content = document.createElement('div');
  content.innerHTML = `
    <div style="text-align:center; margin-bottom: 20px;">
      <span style="font-size: 48px;">${icon}</span>
      <h2 style="font-size: 20px; margin-top: 8px;">${APP.escapeHtml(food.name)}</h2>
      <span class="tag tag-primary">${food.category}</span>
    </div>
    <div class="stats-grid" style="margin-bottom: 0;">
      <div class="stat-card">
        <div class="stat-icon calorie">🔥</div>
        <div class="stat-info">
          <div class="stat-value">${food.calories_per_100g}</div>
          <div class="stat-label">热量(kcal/100g)</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon protein">🥩</div>
        <div class="stat-info">
          <div class="stat-value">${food.protein_per_100g || 0}g</div>
          <div class="stat-label">蛋白质</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon fat">🧈</div>
        <div class="stat-info">
          <div class="stat-value">${food.fat_per_100g || 0}g</div>
          <div class="stat-label">脂肪</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon carbs">🍚</div>
        <div class="stat-info">
          <div class="stat-value">${food.carbs_per_100g || 0}g</div>
          <div class="stat-label">碳水</div>
        </div>
      </div>
    </div>
    ${food.fiber_per_100g ? `<p class="text-sm text-muted" style="margin-top:12px;">膳食纤维: ${food.fiber_per_100g}g/100g</p>` : ''}
  `;

  const modal = APP.modal.show(content, { title: '食材详情' });
};

FoodLibrary.showAddCustomFoodModal = function () {
  const content = document.createElement('div');
  content.innerHTML = `
    <div class="form-group">
      <label>食材名称</label>
      <input type="text" id="custom-food-name" class="form-control" placeholder="例如: 牛油果">
    </div>
    <div class="form-group">
      <label>分类</label>
      <select id="custom-food-category" class="form-control">
        ${APP.categories.map((c) => `<option value="${c}">${APP.categoryIcons[c] || ''} ${c}</option>`).join('')}
      </select>
    </div>
    <div class="form-group">
      <label>热量 (kcal/100g)</label>
      <input type="number" id="custom-food-calories" class="form-control" placeholder="例如: 160" step="0.1">
    </div>
    <div class="grid-2">
      <div class="form-group">
        <label>蛋白质 (g/100g)</label>
        <input type="number" id="custom-food-protein" class="form-control" placeholder="0" step="0.1">
      </div>
      <div class="form-group">
        <label>脂肪 (g/100g)</label>
        <input type="number" id="custom-food-fat" class="form-control" placeholder="0" step="0.1">
      </div>
      <div class="form-group">
        <label>碳水 (g/100g)</label>
        <input type="number" id="custom-food-carbs" class="form-control" placeholder="0" step="0.1">
      </div>
      <div class="form-group">
        <label>膳食纤维 (g/100g)</label>
        <input type="number" id="custom-food-fiber" class="form-control" placeholder="0" step="0.1">
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" onclick="APP.modal.close()">取消</button>
      <button class="btn btn-primary" id="btn-save-custom-food">保存食材</button>
    </div>
  `;

  const modal = APP.modal.show(content, { title: '添加自定义食材' });

  modal.body.querySelector('#btn-save-custom-food').addEventListener('click', async function () {
    if (this.disabled) return;
    const btn = this;

    const name = modal.body.querySelector('#custom-food-name').value.trim();
    const category = modal.body.querySelector('#custom-food-category').value;
    const calories = parseFloat(modal.body.querySelector('#custom-food-calories').value);
    const protein = parseFloat(modal.body.querySelector('#custom-food-protein').value) || 0;
    const fat = parseFloat(modal.body.querySelector('#custom-food-fat').value) || 0;
    const carbs = parseFloat(modal.body.querySelector('#custom-food-carbs').value) || 0;
    const fiber = parseFloat(modal.body.querySelector('#custom-food-fiber').value) || 0;

    if (!name) { APP.toast('请输入食材名称', 'warning'); return; }
    if (!calories) { APP.toast('请输入热量', 'warning'); return; }

    btn.disabled = true;
    btn.textContent = '保存中...';
    try {
      const res = await APP.api.post('/food/custom', {
        name, category,
        calories_per_100g: calories,
        protein_per_100g: protein,
        fat_per_100g: fat,
        carbs_per_100g: carbs,
        fiber_per_100g: fiber,
      });
      if (res && (res.code === 200 || res.code === 201)) {
        APP.toast('自定义食材已添加');
        APP.modal.close();
        await FoodLibrary.loadFoods();
      }
    } catch (err) {
      APP.toast(err.message, 'error');
    } finally {
      btn.disabled = false;
      btn.textContent = '保存食材';
    }
  });
};