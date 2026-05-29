const MealRecord = {
  currentDate: APP.getToday(),
  records: [],
  foodList: [],
  staging: {},
};

MealRecord.init = function () {
  document.getElementById('btn-prev-day').addEventListener('click', () => this.navigateDate(-1));
  document.getElementById('btn-next-day').addEventListener('click', () => this.navigateDate(1));
  document.getElementById('current-record-date').textContent = APP.formatDateCN(this.currentDate);

  APP.mealTypes.forEach((m) => { this.staging[m.value] = []; });

  this.loadFoodList();
  this.loadFavorites();
  this.loadRecords();
};

MealRecord.navigateDate = function (offset) {
  this.currentDate = APP.getDateOffset(offset);
  document.getElementById('current-record-date').textContent = APP.formatDateCN(this.currentDate);
  APP.mealTypes.forEach((m) => { this.staging[m.value] = []; });
  this.loadRecords();
};

MealRecord.loadFoodList = async function () {
  try {
    const res = await APP.api.get('/food');
    if (res && res.code === 200) {
      this.foodList = res.data || [];
    }
  } catch (err) {
    console.error('加载食材列表失败:', err);
  }
};

MealRecord.loadFavorites = async function () {
  try {
    const res = await APP.api.get('/food/favorites');
    if (res && res.code === 200 && res.data) {
      this.favorites = res.data || [];
    } else {
      this.favorites = [];
    }
    this.renderFavorites();
  } catch (err) {
    this.favorites = [];
    this.renderFavorites();
  }
};

MealRecord.renderFavorites = function () {
  const panel = document.getElementById('fav-shortcut');
  const list = document.getElementById('fav-shortcut-list');
  const countEl = document.getElementById('fav-count');

  if (!this.favorites || this.favorites.length === 0) {
    panel.style.display = 'none';
    return;
  }

  panel.style.display = '';
  countEl.textContent = this.favorites.length + ' 项';

  let html = '';
  this.favorites.forEach((food) => {
    const icon = APP.categoryIcons[food.category] || '📦';
    html += `
      <span class="fav-chip" data-food-id="${food.id}" data-food-name="${APP.escapeHtml(food.name)}" data-calories="${food.calories_per_100g}">
        <span class="fav-chip-icon">${icon}</span>
        <span class="fav-chip-name">${APP.escapeHtml(food.name)}</span>
        <span class="fav-chip-kcal">${food.calories_per_100g}kcal</span>
      </span>
    `;
  });

  list.innerHTML = html;

  list.querySelectorAll('.fav-chip').forEach((chip) => {
    chip.addEventListener('click', () => {
      const foodId = parseInt(chip.dataset.foodId);
      const foodName = chip.dataset.foodName;
      const calories = chip.dataset.calories;
      MealRecord.showQuickAddModal(foodId, foodName, calories);
    });
  });
};

MealRecord.showQuickAddModal = function (foodId, foodName, calories) {
  const content = document.createElement('div');
  content.innerHTML = `
    <p class="mb-16">快速记录: <strong>${foodName}</strong> <span class="text-sm text-muted">(${calories}kcal/100g)</span></p>
    <div class="form-group">
      <label>数量 (克)</label>
      <input type="number" id="fav-quantity" class="form-control" value="100" step="0.1" min="1" autofocus>
    </div>
    <div class="form-group">
      <label>用餐时段</label>
      <select id="fav-meal-type" class="form-control">
        <option value="早餐">🌅 早餐</option>
        <option value="午餐">☀️ 午餐</option>
        <option value="晚餐">🌙 晚餐</option>
        <option value="加餐">🍎 加餐</option>
      </select>
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" onclick="APP.modal.close()">取消</button>
      <button class="btn btn-primary" id="btn-fav-confirm">加入记录</button>
    </div>
  `;

  const modal = APP.modal.show(content, { title: '⭐ 快速记录' });

  const qtyInput = modal.body.querySelector('#fav-quantity');
  setTimeout(() => qtyInput.select(), 100);

  modal.body.querySelector('#btn-fav-confirm').addEventListener('click', () => {
    const quantity = parseFloat(qtyInput.value);
    const mealType = modal.body.querySelector('#fav-meal-type').value;

    if (!quantity || quantity <= 0) {
      APP.toast('请输入有效的数量', 'warning');
      return;
    }

    MealRecord.staging[mealType].push({
      food_id: foodId,
      food_name: foodName,
      calories_per_100g: parseFloat(calories),
      quantity: quantity,
      note: '',
    });

    APP.modal.close();
    MealRecord.render();
    APP.toast(`已加入${mealType}暂存清单`, 'success');
  });
};

MealRecord.loadRecords = async function () {
  const container = document.getElementById('meal-sections');
  container.innerHTML = '<div class="loading">加载中</div>';

  try {
    const res = await APP.api.get(`/record?date=${this.currentDate}`);
    if (res && res.code === 200) {
      this.records = res.data || [];
      this.render();
    }
  } catch (err) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">⚠️</div>
        <p>加载饮食记录失败</p>
        <button class="btn btn-primary btn-sm" onclick="MealRecord.loadRecords()">重试</button>
      </div>
    `;
  }
};

MealRecord.getFoodById = function (foodId) {
  return this.foodList.find((f) => f.id == foodId) || null;
};

MealRecord.renderStagingItems = function (mealType) {
  const items = this.staging[mealType] || [];
  if (items.length === 0) return '<div class="staging-empty">暂未添加食材</div>';

  let html = '';
  items.forEach((item, idx) => {
    const cal = ((item.calories_per_100g || 0) * item.quantity / 100).toFixed(0);
    html += `
      <span class="staging-tag">
        <span class="staging-tag-name">${APP.escapeHtml(item.food_name)}</span>
        <span class="staging-tag-detail">${item.quantity}g · ${cal}kcal</span>
        <span class="staging-tag-del" data-meal="${mealType}" data-idx="${idx}" title="移除">×</span>
      </span>
    `;
  });
  return `<div class="staging-tags">${html}</div>`;
};

MealRecord.refreshStagingUI = function (mealType) {
  const stagingArea = document.getElementById('staging-' + mealType);
  if (stagingArea) {
    stagingArea.innerHTML = this.renderStagingItems(mealType);
    stagingArea.querySelectorAll('.staging-tag-del').forEach((btn) => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.dataset.idx);
        this.staging[mealType].splice(idx, 1);
        this.refreshStagingUI(mealType);
        this.updateConfirmButton(mealType);
      });
    });
  }
  this.updateConfirmButton(mealType);
};

MealRecord.updateConfirmButton = function (mealType) {
  const btn = document.getElementById('confirm-' + mealType);
  if (!btn) return;
  const count = (this.staging[mealType] || []).length;
  btn.textContent = count > 0 ? `确认记录本餐 (${count} 项)` : '确认记录本餐';
  btn.disabled = count === 0;
};

MealRecord.render = function () {
  const container = document.getElementById('meal-sections');
  const records = this.records;

  const grouped = {};
  records.forEach((r) => {
    const meal = r.meal_type || '其他';
    if (!grouped[meal]) grouped[meal] = [];
    grouped[meal].push(r);
  });

  let html = '';
  let totalCalories = 0;
  let totalProtein = 0;
  let totalFat = 0;
  let totalCarbs = 0;

  APP.mealTypes.forEach((meal) => {
    const items = grouped[meal.value] || [];
    let mealCalories = 0;

    html += `
      <div class="meal-section">
        <div class="meal-header">
          <div class="meal-title">
            <span class="meal-icon">${meal.icon}</span>
            ${meal.label}
          </div>
          <span class="meal-subtotal">${items.length} 项</span>
        </div>
        <div class="meal-body">
    `;

    if (items.length === 0) {
      html += `<p class="text-sm text-muted">暂无记录</p>`;
    } else {
      items.forEach((item) => {
        const foodName = item.food_name || (item.FoodItem ? item.FoodItem.name : '未知食材');
        const quantity = parseFloat(item.quantity) || 0;
        const calPer100g = item.calories_per_100g || (item.FoodItem ? item.FoodItem.calories_per_100g : 0);
        const proteinPer100g = item.protein_per_100g || (item.FoodItem ? item.FoodItem.protein_per_100g : 0);
        const fatPer100g = item.fat_per_100g || (item.FoodItem ? item.FoodItem.fat_per_100g : 0);
        const carbsPer100g = item.carbs_per_100g || (item.FoodItem ? item.FoodItem.carbs_per_100g : 0);

        const cal = (calPer100g * quantity) / 100;
        const protein = (proteinPer100g * quantity) / 100;
        const fat = (fatPer100g * quantity) / 100;
        const carbs = (carbsPer100g * quantity) / 100;

        mealCalories += cal;
        totalCalories += cal;
        totalProtein += protein;
        totalFat += fat;
        totalCarbs += carbs;

        html += `
          <div class="meal-record-item">
            <div class="item-info">
              <div class="item-name">${APP.escapeHtml(foodName)}</div>
              <div class="item-detail">${quantity}g · 蛋白质${protein.toFixed(1)}g 脂肪${fat.toFixed(1)}g 碳水${carbs.toFixed(1)}g</div>
            </div>
            <div class="item-calories">${Math.round(cal)} kcal</div>
            <div class="item-actions">
              <button onclick="MealRecord.showEditModal(${item.id})">✏️</button>
              <button class="btn-delete" onclick="MealRecord.confirmDelete(${item.id})">🗑️</button>
            </div>
          </div>
        `;
      });
    }

    html += `
          <!-- 暂存清单 -->
          <div class="staging-area" id="staging-${meal.value}" style="margin-top:12px;">
            ${this.renderStagingItems(meal.value)}
          </div>

          <!-- 添加表单 -->
          <div class="meal-add-form" style="margin-top:10px;">
            <div class="form-group" style="position:relative;">
              <div class="searchable-select" data-meal="${meal.value}">
                <div class="ss-trigger form-control" tabindex="0">
                  <span class="ss-text ss-placeholder-text">选择食材</span>
                  <span class="ss-arrow">▾</span>
                </div>
                <div class="ss-dropdown" style="display:none">
                  <div class="ss-search-box">
                    <input type="text" class="ss-search-input" placeholder="输入名称搜索食材..." autocomplete="off">
                  </div>
                  <ul class="ss-options">
                    ${this.foodList.map((f) => `<li class="ss-option" data-value="${f.id}" data-calories="${f.calories_per_100g}" data-name="${APP.escapeHtml(f.name)}">${APP.escapeHtml(f.name)} <span class="ss-kcal">${f.calories_per_100g}kcal</span></li>`).join('')}
                  </ul>
                  <div class="ss-empty" style="display:none">无匹配食材</div>
                </div>
              </div>
            </div>
            <div class="form-group">
              <input type="number" class="form-control meal-quantity-input" data-meal="${meal.value}" placeholder="克数" value="100" step="0.1" min="0" style="width:100px;">
            </div>
            <div class="form-group">
              <input type="text" class="form-control meal-note-input" data-meal="${meal.value}" placeholder="备注(选填)" style="width:120px;">
            </div>
            <button class="btn btn-sm btn-primary meal-add-btn" data-meal="${meal.value}">添加</button>
          </div>

          <!-- 确认按钮 -->
          <button class="btn btn-success meal-confirm-btn" id="confirm-${meal.value}" data-meal="${meal.value}" style="margin-top:8px;width:100%" disabled>确认记录本餐</button>
        </div>
      </div>
    `;
  });

  container.innerHTML = html;

  const totalElement = document.getElementById('meal-total-summary');
  totalElement.innerHTML = `
    <h3>📊 今日总计</h3>
    <div class="total-row"><span>热量</span><span>${Math.round(totalCalories)} kcal</span></div>
    <div class="total-row"><span>蛋白质</span><span>${totalProtein.toFixed(1)} g</span></div>
    <div class="total-row"><span>脂肪</span><span>${totalFat.toFixed(1)} g</span></div>
    <div class="total-row"><span>碳水</span><span>${totalCarbs.toFixed(1)} g</span></div>
    <div class="total-row emphasis"><span>总热量</span><span>${Math.round(totalCalories)} kcal</span></div>
  `;

  // 暂存标签删除事件
  container.querySelectorAll('.staging-tag-del').forEach((btn) => {
    btn.addEventListener('click', () => {
      const mealType = btn.dataset.meal;
      const idx = parseInt(btn.dataset.idx);
      this.staging[mealType].splice(idx, 1);
      this.refreshStagingUI(mealType);
    });
  });

  // 确认按钮 - 更新初始状态
  APP.mealTypes.forEach((meal) => {
    this.updateConfirmButton(meal.value);
  });

  // 添加按钮 - 推入暂存
  container.querySelectorAll('.meal-add-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const mealType = btn.dataset.meal;
      const wrapper = container.querySelector(`.searchable-select[data-meal="${mealType}"]`);
      const quantityInput = container.querySelector(`.meal-quantity-input[data-meal="${mealType}"]`);
      const noteInput = container.querySelector(`.meal-note-input[data-meal="${mealType}"]`);

      const foodId = wrapper ? wrapper.dataset.selected : '';
      const quantity = parseFloat(quantityInput.value);
      const note = noteInput.value.trim();

      if (!foodId) { APP.toast('请选择食材', 'warning'); return; }
      if (!quantity || quantity <= 0) { APP.toast('请输入有效数量', 'warning'); return; }

      const food = MealRecord.getFoodById(parseInt(foodId));
      if (!food) { APP.toast('食材数据异常', 'error'); return; }

      MealRecord.staging[mealType].push({
        food_id: parseInt(foodId),
        food_name: food.name,
        calories_per_100g: food.calories_per_100g,
        quantity: quantity,
        note: note || '',
      });

      MealRecord.refreshStagingUI(mealType);

      wrapper.dataset.selected = '';
      const st = wrapper.querySelector('.ss-text');
      st.textContent = '选择食材';
      st.classList.add('ss-placeholder-text');
      quantityInput.value = '100';
      noteInput.value = '';
    });
  });

  // 确认按钮 - 批量提交
  container.querySelectorAll('.meal-confirm-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const mealType = btn.dataset.meal;
      const items = MealRecord.staging[mealType] || [];
      if (items.length === 0) { APP.toast('暂存清单为空', 'warning'); return; }

      const records = items.map((item) => ({
        food_id: item.food_id,
        record_date: MealRecord.currentDate,
        meal_type: mealType,
        quantity: item.quantity,
        note: item.note || undefined,
      }));

      try {
        const res = await APP.api.post('/record/batch', { records });
        if (res && (res.code === 200 || res.code === 201)) {
          APP.cache.markReportStale();
          APP.toast(res.message || '记录已保存');
          MealRecord.staging[mealType] = [];
          MealRecord.refreshStagingUI(mealType);
          await MealRecord.loadRecords();
        }
      } catch (err) {
        APP.toast(err.message, 'error');
      }
    });
  });

  this.initSearchableSelects(container);
};

MealRecord.initSearchableSelects = function (container) {
  container.querySelectorAll('.searchable-select').forEach((wrapper) => {
    const trigger = wrapper.querySelector('.ss-trigger');
    const dropdown = wrapper.querySelector('.ss-dropdown');
    const searchInput = wrapper.querySelector('.ss-search-input');
    const optionsList = wrapper.querySelector('.ss-options');
    const emptyMsg = wrapper.querySelector('.ss-empty');
    const displayText = wrapper.querySelector('.ss-text');
    const allOptions = Array.from(optionsList.querySelectorAll('.ss-option'));

    function filterOptions(keyword) {
      const kw = keyword.toLowerCase();
      let visibleCount = 0;
      allOptions.forEach((opt) => {
        const name = (opt.dataset.name || '').toLowerCase();
        if (name.includes(kw)) {
          opt.style.display = '';
          visibleCount++;
        } else {
          opt.style.display = 'none';
        }
      });
      emptyMsg.style.display = visibleCount === 0 ? '' : 'none';
    }

    function openDropdown() {
      closeAllDropdowns(wrapper);
      dropdown.style.display = '';
      searchInput.value = '';
      filterOptions('');
      setTimeout(() => searchInput.focus(), 50);
    }

    function closeDropdown() {
      dropdown.style.display = 'none';
    }

    function selectOption(opt) {
      const foodId = opt.dataset.value;
      const foodName = opt.dataset.name;
      const calories = opt.dataset.calories;
      wrapper.dataset.selected = foodId;
      displayText.textContent = foodName + ' (' + calories + 'kcal/100g)';
      displayText.classList.remove('ss-placeholder-text');
      closeDropdown();
    }

    trigger.addEventListener('click', (e) => {
      e.stopPropagation();
      if (dropdown.style.display === 'none') {
        openDropdown();
      } else {
        closeDropdown();
      }
    });

    trigger.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openDropdown();
      }
    });

    searchInput.addEventListener('input', () => {
      filterOptions(searchInput.value);
    });

    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        closeDropdown();
        trigger.focus();
        return;
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        const visible = Array.from(optionsList.querySelectorAll('.ss-option')).filter((o) => o.style.display !== 'none');
        if (visible.length > 0) visible[0].focus();
      }
    });

    searchInput.addEventListener('click', (e) => {
      e.stopPropagation();
    });

    optionsList.addEventListener('click', (e) => {
      const opt = e.target.closest('.ss-option');
      if (opt && opt.style.display !== 'none') {
        selectOption(opt);
      }
    });

    optionsList.addEventListener('keydown', (e) => {
      const current = document.activeElement;
      if (!current || !current.classList.contains('ss-option')) return;
      const visible = Array.from(optionsList.querySelectorAll('.ss-option')).filter((o) => o.style.display !== 'none');
      const idx = visible.indexOf(current);

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (idx < visible.length - 1) visible[idx + 1].focus();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (idx > 0) visible[idx - 1].focus();
        else searchInput.focus();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        selectOption(current);
      } else if (e.key === 'Escape') {
        closeDropdown();
        trigger.focus();
      }
    });

    wrapper.addEventListener('click', (e) => {
      e.stopPropagation();
    });
  });
};

function closeAllDropdowns(except) {
  document.querySelectorAll('.searchable-select .ss-dropdown').forEach((dd) => {
    if (except && dd.closest('.searchable-select') === except) return;
    dd.style.display = 'none';
  });
}

document.addEventListener('click', () => {
  closeAllDropdowns();
});

MealRecord.showEditModal = function (recordId) {
  const record = this.records.find((r) => r.id === recordId);
  if (!record) return;

  const foodName = record.food_name || (record.FoodItem ? record.FoodItem.name : '未知食材');

  const content = document.createElement('div');
  content.innerHTML = `
    <p class="mb-16">正在编辑: <strong>${APP.escapeHtml(foodName)}</strong></p>
    <div class="form-group">
      <label>数量 (克)</label>
      <input type="number" id="edit-quantity" class="form-control" value="${record.quantity}" step="0.1" min="0">
    </div>
    <div class="form-group">
      <label>备注</label>
      <input type="text" id="edit-note" class="form-control" value="${APP.escapeHtml(record.note || '')}" placeholder="备注(选填)">
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" onclick="APP.modal.close()">取消</button>
      <button class="btn btn-primary" id="btn-update-record">保存修改</button>
    </div>
  `;

  const modal = APP.modal.show(content, { title: '编辑饮食记录' });

  modal.body.querySelector('#btn-update-record').addEventListener('click', async () => {
    const quantity = parseFloat(modal.body.querySelector('#edit-quantity').value);
    const note = modal.body.querySelector('#edit-note').value.trim();

    try {
      const res = await APP.api.put(`/record/${recordId}`, { quantity, note: note || undefined });
      if (res && res.code === 200) {
        APP.cache.markReportStale();
        APP.toast('记录已更新');
        APP.modal.close();
        await MealRecord.loadRecords();
      }
    } catch (err) {
      APP.toast(err.message, 'error');
    }
  });
};

MealRecord.confirmDelete = function (recordId) {
  const content = document.createElement('div');
  content.innerHTML = `
    <p>确定要删除这条饮食记录吗？</p>
    <div class="modal-footer">
      <button class="btn btn-secondary" onclick="APP.modal.close()">取消</button>
      <button class="btn btn-danger" id="btn-confirm-delete">确认删除</button>
    </div>
  `;

  const modal = APP.modal.show(content, { title: '确认删除' });

  modal.body.querySelector('#btn-confirm-delete').addEventListener('click', async () => {
    try {
      const res = await APP.api.delete(`/record/${recordId}`);
      if (res && res.code === 200) {
        APP.cache.markReportStale();
        APP.toast('记录已删除');
        APP.modal.close();
        await MealRecord.loadRecords();
      }
    } catch (err) {
      APP.toast(err.message, 'error');
    }
  });
};
