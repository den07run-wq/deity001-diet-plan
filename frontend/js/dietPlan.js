const DietPlan = {
  plans: [],
  currentPlanId: null,
  selectedDay: null,
};

DietPlan.init = async function () {
  document.getElementById('btn-create-plan').addEventListener('click', () => this.showCreateModal());
  document.getElementById('btn-templates').addEventListener('click', () => this.loadTemplates());
  await this.loadPlans();
};

DietPlan.loadPlans = async function () {
  const container = document.getElementById('plan-list');
  container.innerHTML = '<div class="loading">加载中</div>';

  try {
    const res = await APP.api.get('/plan');
    if (res && res.code === 200) {
      this.plans = res.data || [];
      this.renderPlanList();
    }
  } catch (err) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">⚠️</div>
        <p>加载失败: ${APP.escapeHtml(err.message)}</p>
        <button class="btn btn-primary btn-sm" onclick="DietPlan.loadPlans()">重试</button>
      </div>
    `;
  }
};

DietPlan.renderPlanList = function () {
  const container = document.getElementById('plan-list');
  const weekContainer = document.getElementById('week-view-container');

  if (this.plans.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📋</div>
        <p>还没有饮食计划</p>
        <button class="btn btn-primary" onclick="DietPlan.showCreateModal()">创建第一个计划</button>
      </div>
    `;
    weekContainer.innerHTML = '';
    return;
  }

  let html = '';
  this.plans.forEach((plan) => {
    const startDate = APP.formatDate(plan.start_date);
    const endDate = APP.formatDate(plan.end_date);
    const goalTag = APP.goalColors[plan.goal] || 'primary';
    const statusTag = plan.status === '进行中' ? 'success' : plan.status === '已完成' ? 'info' : 'warning';

    html += `
      <div class="plan-card ${APP.goalClasses[plan.goal] || ''}">
        <div class="plan-header">
          <div>
            <div class="plan-name">${APP.escapeHtml(plan.name)}</div>
            <div class="plan-meta">目标: ${plan.goal} · ${startDate} ~ ${endDate}</div>
          </div>
          <div>
            <span class="tag tag-${goalTag}">${plan.goal}</span>
            <span class="tag tag-${statusTag}" style="margin-left:4px">${plan.status}</span>
          </div>
        </div>
        <div class="plan-nutrients">
          <div class="plan-nutrient">
            <div class="value">${plan.daily_calories || '--'}</div>
            <div class="label">热量(kcal)</div>
          </div>
          <div class="plan-nutrient">
            <div class="value">${plan.daily_protein || '--'}g</div>
            <div class="label">蛋白质</div>
          </div>
          <div class="plan-nutrient">
            <div class="value">${plan.daily_fat || '--'}g</div>
            <div class="label">脂肪</div>
          </div>
          <div class="plan-nutrient">
            <div class="value">${plan.daily_carbs || '--'}g</div>
            <div class="label">碳水</div>
          </div>
        </div>
        <div class="plan-actions">
          <button class="btn btn-sm btn-primary" onclick="DietPlan.loadWeekView(${plan.id})">周视图</button>
          <button class="btn btn-sm btn-secondary" onclick="DietPlan.showEditModal(${plan.id})">编辑</button>
          <button class="btn btn-sm btn-danger" onclick="DietPlan.confirmDelete(${plan.id})">删除</button>
        </div>
      </div>
    `;
  });

  container.innerHTML = html;
};

DietPlan.showCreateModal = function () {
  const content = document.createElement('div');
  content.innerHTML = `
    <div class="form-group">
      <label>计划名称</label>
      <input type="text" id="create-plan-name" class="form-control" placeholder="例如: 减脂计划A">
    </div>
    <div class="form-group">
      <label>计划目标</label>
      <select id="create-plan-goal" class="form-control">
        ${APP.goals.map((g) => `<option value="${g.value}">${g.label}</option>`).join('')}
      </select>
    </div>
    <div class="grid-2">
      <div class="form-group">
        <label>开始日期</label>
        <input type="date" id="create-start-date" class="form-control" value="${APP.getToday()}">
      </div>
      <div class="form-group">
        <label>结束日期</label>
        <input type="date" id="create-end-date" class="form-control" value="${APP.getDateOffset(30)}">
      </div>
    </div>
    <div class="form-group">
      <label>每日目标热量 (kcal)</label>
      <input type="number" id="create-calories" class="form-control" placeholder="例如: 1800" value="2000">
    </div>
    <div class="grid-3">
      <div class="form-group">
        <label>蛋白质 (g)</label>
        <input type="number" id="create-protein" class="form-control" placeholder="g" value="80" step="0.1">
      </div>
      <div class="form-group">
        <label>脂肪 (g)</label>
        <input type="number" id="create-fat" class="form-control" placeholder="g" value="50" step="0.1">
      </div>
      <div class="form-group">
        <label>碳水 (g)</label>
        <input type="number" id="create-carbs" class="form-control" placeholder="g" value="250" step="0.1">
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" onclick="APP.modal.close()">取消</button>
      <button class="btn btn-primary" id="btn-save-plan">保存计划</button>
    </div>
  `;

  const modal = APP.modal.show(content, { title: '创建饮食计划' });

  modal.body.querySelector('#btn-save-plan').addEventListener('click', async () => {
    const name = modal.body.querySelector('#create-plan-name').value.trim();
    const goal = modal.body.querySelector('#create-plan-goal').value;
    const startDate = modal.body.querySelector('#create-start-date').value;
    const endDate = modal.body.querySelector('#create-end-date').value;
    const calories = parseFloat(modal.body.querySelector('#create-calories').value);
    const protein = parseFloat(modal.body.querySelector('#create-protein').value);
    const fat = parseFloat(modal.body.querySelector('#create-fat').value);
    const carbs = parseFloat(modal.body.querySelector('#create-carbs').value);

    if (!name) { APP.toast('请输入计划名称', 'warning'); return; }
    if (!startDate || !endDate) { APP.toast('请选择日期', 'warning'); return; }

    try {
      const res = await APP.api.post('/plan', {
        name, goal, start_date: startDate, end_date: endDate,
        daily_calories: calories, daily_protein: protein, daily_fat: fat, daily_carbs: carbs,
      });
      if (res && res.code === 201) {
        APP.cache.markReportStale();
        APP.toast('计划创建成功');
        APP.modal.close();
        await DietPlan.loadPlans();
      }
    } catch (err) {
      APP.toast(err.message, 'error');
    }
  });
};

DietPlan.showEditModal = function (planId) {
  const plan = this.plans.find((p) => p.id === planId);
  if (!plan) return;

  const content = document.createElement('div');
  content.innerHTML = `
    <div class="form-group">
      <label>计划名称</label>
      <input type="text" id="edit-plan-name" class="form-control" value="${APP.escapeHtml(plan.name)}">
    </div>
    <div class="form-group">
      <label>计划目标</label>
      <select id="edit-plan-goal" class="form-control">
        ${APP.goals.map((g) => `<option value="${g.value}" ${g.value === plan.goal ? 'selected' : ''}>${g.label}</option>`).join('')}
      </select>
    </div>
    <div class="grid-2">
      <div class="form-group">
        <label>开始日期</label>
        <input type="date" id="edit-start-date" class="form-control" value="${APP.formatDate(plan.start_date)}">
      </div>
      <div class="form-group">
        <label>结束日期</label>
        <input type="date" id="edit-end-date" class="form-control" value="${APP.formatDate(plan.end_date)}">
      </div>
    </div>
    <div class="form-group">
      <label>每日目标热量 (kcal)</label>
      <input type="number" id="edit-calories" class="form-control" value="${plan.daily_calories || 2000}">
    </div>
    <div class="grid-3">
      <div class="form-group">
        <label>蛋白质 (g)</label>
        <input type="number" id="edit-protein" class="form-control" value="${plan.daily_protein || 80}" step="0.1">
      </div>
      <div class="form-group">
        <label>脂肪 (g)</label>
        <input type="number" id="edit-fat" class="form-control" value="${plan.daily_fat || 50}" step="0.1">
      </div>
      <div class="form-group">
        <label>碳水 (g)</label>
        <input type="number" id="edit-carbs" class="form-control" value="${plan.daily_carbs || 250}" step="0.1">
      </div>
    </div>
    <div class="form-group">
      <label>计划状态</label>
      <select id="edit-status" class="form-control">
        <option value="进行中" ${plan.status === '进行中' ? 'selected' : ''}>进行中</option>
        <option value="已完成" ${plan.status === '已完成' ? 'selected' : ''}>已完成</option>
        <option value="已取消" ${plan.status === '已取消' ? 'selected' : ''}>已取消</option>
      </select>
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" onclick="APP.modal.close()">取消</button>
      <button class="btn btn-primary" id="btn-update-plan">保存修改</button>
    </div>
  `;

  const modal = APP.modal.show(content, { title: '编辑饮食计划' });

  modal.body.querySelector('#btn-update-plan').addEventListener('click', async () => {
    const name = modal.body.querySelector('#edit-plan-name').value.trim();
    const goal = modal.body.querySelector('#edit-plan-goal').value;
    const startDate = modal.body.querySelector('#edit-start-date').value;
    const endDate = modal.body.querySelector('#edit-end-date').value;
    const calories = parseFloat(modal.body.querySelector('#edit-calories').value);
    const protein = parseFloat(modal.body.querySelector('#edit-protein').value);
    const fat = parseFloat(modal.body.querySelector('#edit-fat').value);
    const carbs = parseFloat(modal.body.querySelector('#edit-carbs').value);
    const status = modal.body.querySelector('#edit-status').value;

    try {
      const res = await APP.api.put(`/plan/${planId}`, {
        name, goal, start_date: startDate, end_date: endDate,
        daily_calories: calories, daily_protein: protein, daily_fat: fat, daily_carbs: carbs,
        status,
      });
      if (res && res.code === 200) {
        APP.cache.markReportStale();
        APP.toast('计划已更新');
        APP.modal.close();
        await DietPlan.loadPlans();
      }
    } catch (err) {
      APP.toast(err.message, 'error');
    }
  });
};

DietPlan.confirmDelete = function (planId) {
  const plan = this.plans.find((p) => p.id === planId);
  if (!plan) return;

  const content = document.createElement('div');
  content.innerHTML = `
    <p>确定要删除计划「${APP.escapeHtml(plan.name)}」吗？</p>
    <p class="text-sm text-muted mt-8">此操作不可撤销，计划中所有食材安排也将被删除。</p>
    <div class="modal-footer">
      <button class="btn btn-secondary" onclick="APP.modal.close()">取消</button>
      <button class="btn btn-danger" id="btn-confirm-delete">确认删除</button>
    </div>
  `;

  const modal = APP.modal.show(content, { title: '确认删除' });

  modal.body.querySelector('#btn-confirm-delete').addEventListener('click', async () => {
    try {
      const res = await APP.api.delete(`/plan/${planId}`);
      if (res && res.code === 200) {
        APP.cache.markReportStale();
        APP.toast('计划已删除');
        APP.modal.close();
        document.getElementById('week-view-container').innerHTML = '';
        await DietPlan.loadPlans();
      }
    } catch (err) {
      APP.toast(err.message, 'error');
    }
  });
};

DietPlan.loadWeekView = async function (planId) {
  this.currentPlanId = planId;
  const container = document.getElementById('week-view-container');
  container.innerHTML = '<div class="loading">加载中</div>';

  try {
    const res = await APP.api.get(`/plan/${planId}`);
    if (res && res.code === 200) {
      this.renderWeekView(res.data);
    }
  } catch (err) {
    container.innerHTML = `
      <div class="empty-state">
        <p>加载周视图失败</p>
        <button class="btn btn-primary btn-sm" onclick="DietPlan.loadWeekView(${planId})">重试</button>
      </div>
    `;
  }
};

DietPlan.renderWeekView = function (plan) {
  const container = document.getElementById('week-view-container');
  const planFoods = plan.planFoods || [];

  const dayMap = {};
  planFoods.forEach((pf) => {
    if (!dayMap[pf.day_of_week]) dayMap[pf.day_of_week] = {};
    if (!dayMap[pf.day_of_week][pf.meal_type]) dayMap[pf.day_of_week][pf.meal_type] = [];
    dayMap[pf.day_of_week][pf.meal_type].push(pf);
  });

  let html = '<h3 style="margin-bottom: 16px;">📅 周视图</h3>';
  html += '<table class="week-table"><thead><tr><th></th>';
  APP.weekDays.forEach((day) => {
    html += `<th>${day}</th>`;
  });
  html += '</tr></thead><tbody>';

  APP.mealTypes.forEach((meal) => {
    html += '<tr>';
    html += `<td style="font-weight:600; background:var(--bg);">${meal.icon} ${meal.label}</td>`;
    APP.weekDays.forEach((day) => {
      const items = dayMap[day] ? dayMap[day][meal.value] : null;
      if (items && items.length > 0) {
        html += `<td class="has-food" onclick="DietPlan.showDayMeal('${day}', '${meal.value}', ${plan.id})">✓ (${items.length})</td>`;
      } else {
        html += `<td class="empty" onclick="DietPlan.showDayMeal('${day}', '${meal.value}', ${plan.id})">—</td>`;
      }
    });
    html += '</tr>';
  });

  html += '</tbody></table>';

  html += `
    <div style="margin-top: 16px;">
      <button class="btn btn-sm btn-primary" onclick="DietPlan.showAddFoodModal(${plan.id})">+ 添加食材到计划</button>
    </div>
  `;

  container.innerHTML = html;
};

DietPlan.showDayMeal = function (day, mealType, planId) {
  const plan = this.plans.find((p) => p.id === planId);
  if (!plan) return;

  APP.api.get(`/plan/${planId}/day/${day}`).then((res) => {
    if (!res || res.code !== 200) return;

    const foods = res.data || [];
    const mealFoods = foods.filter((f) => f.meal_type === mealType);

    const content = document.createElement('div');
    if (mealFoods.length === 0) {
      content.innerHTML = `
        <div class="empty-state">
          <p>${day} ${mealType} 暂无安排</p>
          <button class="btn btn-primary btn-sm" onclick="APP.modal.close(); DietPlan.showAddFoodModal(${planId}, '${day}', '${mealType}')">添加食材</button>
        </div>
      `;
    } else {
      let listHtml = '';
      mealFoods.forEach((pf) => {
        const foodName = pf.FoodItem ? pf.FoodItem.name : `食材 #${pf.food_id}`;
        listHtml += `
          <div class="meal-record-item">
            <div class="item-info">
              <div class="item-name">${APP.escapeHtml(foodName)}</div>
              <div class="item-detail">${pf.quantity}g</div>
            </div>
            <div class="item-actions">
              <button class="btn-delete" onclick="DietPlan.removePlanFood(${pf.id})">🗑️</button>
            </div>
          </div>
        `;
      });
      content.innerHTML = `
        ${listHtml}
        <div style="margin-top:12px;">
          <button class="btn btn-sm btn-primary" onclick="APP.modal.close(); DietPlan.showAddFoodModal(${planId}, '${day}', '${mealType}')">+ 添加食材</button>
        </div>
      `;
    }

    APP.modal.show(content, { title: `${day} ${mealType}` });
  });
};

DietPlan.showAddFoodModal = async function (planId, presetDay, presetMeal) {
  const content = document.createElement('div');

  let foodOptions = '<option value="">请选择食材</option>';
  try {
    const res = await APP.api.get('/food');
    if (res && res.code === 200) {
      (res.data || []).forEach((food) => {
        foodOptions += `<option value="${food.id}">${APP.escapeHtml(food.name)} (${food.calories_per_100g}kcal/100g)</option>`;
      });
    }
  } catch (e) {
    foodOptions = '<option value="">加载食材失败</option>';
  }

  content.innerHTML = `
    <div class="form-group">
      <label>星期</label>
      <select id="add-food-day" class="form-control">
        ${APP.weekDays.map((d) => `<option value="${d}" ${d === presetDay ? 'selected' : ''}>${d}</option>`).join('')}
      </select>
    </div>
    <div class="form-group">
      <label>餐次</label>
      <select id="add-food-meal" class="form-control">
        ${APP.mealTypes.map((m) => `<option value="${m.value}" ${m.value === presetMeal ? 'selected' : ''}>${m.icon} ${m.label}</option>`).join('')}
      </select>
    </div>
    <div class="form-group">
      <label>食材</label>
      <select id="add-food-id" class="form-control">
        ${foodOptions}
      </select>
    </div>
    <div class="form-group">
      <label>数量 (克)</label>
      <input type="number" id="add-food-quantity" class="form-control" placeholder="例如: 100" value="100" step="0.1" min="0">
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" onclick="APP.modal.close()">取消</button>
      <button class="btn btn-primary" id="btn-add-food">添加</button>
    </div>
  `;

  const modal = APP.modal.show(content, { title: '添加食材到计划' });

  modal.body.querySelector('#btn-add-food').addEventListener('click', async () => {
    const dayOfWeek = modal.body.querySelector('#add-food-day').value;
    const mealType = modal.body.querySelector('#add-food-meal').value;
    const foodId = modal.body.querySelector('#add-food-id').value;
    const quantity = parseFloat(modal.body.querySelector('#add-food-quantity').value);

    if (!foodId) { APP.toast('请选择食材', 'warning'); return; }
    if (!quantity || quantity <= 0) { APP.toast('请输入有效数量', 'warning'); return; }

    try {
      const res = await APP.api.post(`/plan/${planId}/food`, {
        food_id: parseInt(foodId),
        day_of_week: dayOfWeek,
        meal_type: mealType,
        quantity,
      });
      if (res && (res.code === 200 || res.code === 201)) {
        APP.cache.markReportStale();
        APP.toast('食材已添加');
        APP.modal.close();
        DietPlan.loadWeekView(planId);
      }
    } catch (err) {
      APP.toast(err.message, 'error');
    }
  });
};

DietPlan.removePlanFood = async function (planFoodId) {
  if (!confirm('确定要移除此食材吗？')) return;

  try {
    const res = await APP.api.delete(`/plan/food/${planFoodId}`);
    if (res && res.code === 200) {
      APP.cache.markReportStale();
      APP.toast('已移除');
      APP.modal.close();
      if (DietPlan.currentPlanId) {
        DietPlan.loadWeekView(DietPlan.currentPlanId);
      }
    }
  } catch (err) {
    APP.toast(err.message, 'error');
  }
};

DietPlan.loadTemplates = async function () {
  try {
    const res = await APP.api.get('/plan/templates');
    if (!res || res.code !== 200 || !res.data || res.data.length === 0) {
      APP.toast('暂无预设计划模板', 'info');
      return;
    }

    const content = document.createElement('div');
    let listHtml = '';
    res.data.forEach((tpl) => {
      listHtml += `
        <div class="plan-card" style="margin-bottom:12px;">
          <div class="plan-header">
            <div class="plan-name">${APP.escapeHtml(tpl.name)}</div>
            <span class="tag tag-${APP.goalColors[tpl.goal] || 'primary'}">${tpl.goal}</span>
          </div>
          <div class="plan-nutrients">
            <div class="plan-nutrient"><div class="value">${tpl.daily_calories || '--'}</div><div class="label">热量</div></div>
            <div class="plan-nutrient"><div class="value">${tpl.daily_protein || '--'}g</div><div class="label">蛋白质</div></div>
            <div class="plan-nutrient"><div class="value">${tpl.daily_fat || '--'}g</div><div class="label">脂肪</div></div>
            <div class="plan-nutrient"><div class="value">${tpl.daily_carbs || '--'}g</div><div class="label">碳水</div></div>
          </div>
          <div class="plan-actions">
            <button class="btn btn-sm btn-primary" onclick="DietPlan.applyTemplate(${tpl.id})">使用此模板</button>
          </div>
        </div>
      `;
    });
    content.innerHTML = listHtml;
    APP.modal.show(content, { title: '计划模板' });
  } catch (err) {
    APP.toast(err.message, 'error');
  }
};

DietPlan.applyTemplate = async function (templateId) {
  try {
    const res = await APP.api.post(`/plan`, { template_id: templateId });
    if (res && res.code === 201) {
      APP.cache.markReportStale();
      APP.toast('已从模板创建计划');
      APP.modal.close();
      await DietPlan.loadPlans();
    }
  } catch (err) {
    APP.toast(err.message, 'error');
  }
};