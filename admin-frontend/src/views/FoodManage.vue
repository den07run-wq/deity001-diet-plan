<template>
  <el-card shadow="hover">
    <div class="search-bar">
      <el-input v-model="keyword" placeholder="搜索食材名称" clearable style="width:220px" @clear="fetchData" @keyup.enter="fetchData" />
      <el-select v-model="categoryFilter" placeholder="分类筛选" clearable style="width:150px;margin-left:12px" @change="fetchData">
        <el-option v-for="cat in categories" :key="cat" :label="cat" :value="cat" />
      </el-select>
      <el-button type="success" @click="fetchData" style="margin-left:12px">搜索</el-button>
      <el-button type="primary" @click="openDialog()" style="margin-left:auto">添加食材</el-button>
    </div>

    <el-table :data="list" v-loading="loading" stripe style="margin-top:16px">
      <el-table-column prop="id" label="ID" width="60" />
      <el-table-column prop="name" label="食材名称" width="140" />
      <el-table-column prop="category" label="分类" width="80" />
      <el-table-column prop="calories_per_100g" label="热量(kcal)" width="100" />
      <el-table-column prop="protein_per_100g" label="蛋白质(g)" width="90" />
      <el-table-column prop="fat_per_100g" label="脂肪(g)" width="80" />
      <el-table-column prop="carbs_per_100g" label="碳水(g)" width="80" />
      <el-table-column prop="fiber_per_100g" label="纤维(g)" width="80" />
      <el-table-column label="类型" width="80">
        <template #default="{ row }">
          <el-tag :type="row.is_custom ? 'warning' : 'info'" size="small">
            {{ row.is_custom ? '自定义' : '系统' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="160" fixed="right">
        <template #default="{ row }">
          <el-button type="primary" size="small" @click="openDialog(row)">编辑</el-button>
          <el-button type="danger" size="small" @click="handleDelete(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-pagination
      v-model:current-page="page" :page-size="pageSize" :total="total"
      layout="total, prev, pager, next" style="margin-top:16px;justify-content:flex-end"
      @current-change="fetchData"
    />
  </el-card>

  <!-- 添加/编辑食材弹窗 -->
  <el-dialog v-model="dialogVisible" :title="isEdit ? '编辑食材' : '添加食材'" width="520px" :close-on-click-modal="false">
    <el-form ref="formRef" :model="form" :rules="rules" label-width="100px">
      <el-form-item label="食材名称" prop="name">
        <el-input v-model="form.name" placeholder="如：鸡胸肉" />
      </el-form-item>
      <el-form-item label="分类" prop="category">
        <el-select v-model="form.category" placeholder="选择分类" style="width:100%">
          <el-option v-for="cat in categories" :key="cat" :label="cat" :value="cat" />
        </el-select>
      </el-form-item>
      <el-form-item label="热量(kcal)" prop="calories_per_100g">
        <el-input-number v-model="form.calories_per_100g" :min="0" :precision="1" style="width:100%" />
      </el-form-item>
      <el-form-item label="蛋白质(g)">
        <el-input-number v-model="form.protein_per_100g" :min="0" :precision="1" style="width:100%" />
      </el-form-item>
      <el-form-item label="脂肪(g)">
        <el-input-number v-model="form.fat_per_100g" :min="0" :precision="1" style="width:100%" />
      </el-form-item>
      <el-form-item label="碳水(g)">
        <el-input-number v-model="form.carbs_per_100g" :min="0" :precision="1" style="width:100%" />
      </el-form-item>
      <el-form-item label="纤维(g)">
        <el-input-number v-model="form.fiber_per_100g" :min="0" :precision="1" style="width:100%" />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="dialogVisible = false">取消</el-button>
      <el-button type="success" :loading="submitting" @click="handleSubmit">确定</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { getFoods, createFood, updateFood, deleteFood } from '@/api'
import { ElMessage, ElMessageBox } from 'element-plus'

const categories = ['主食', '肉类', '蛋奶', '豆类', '蔬菜', '水果', '零食', '饮品', '调味料', '其他']

const list = ref([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(10)
const loading = ref(false)
const keyword = ref('')
const categoryFilter = ref('')

const dialogVisible = ref(false)
const isEdit = ref(false)
const editId = ref(null)
const submitting = ref(false)
const formRef = ref(null)
const form = reactive({
  name: '', category: '', calories_per_100g: 0,
  protein_per_100g: 0, fat_per_100g: 0, carbs_per_100g: 0, fiber_per_100g: 0,
})
const rules = {
  name: [{ required: true, message: '请输入食材名称', trigger: 'blur' }],
  category: [{ required: true, message: '请选择分类', trigger: 'change' }],
  calories_per_100g: [{ required: true, message: '请输入热量', trigger: 'blur' }],
}

async function fetchData() {
  loading.value = true
  try {
    const res = await getFoods({
      keyword: keyword.value, category: categoryFilter.value,
      page: page.value, pageSize: pageSize.value,
    })
    list.value = res.data.list
    total.value = res.data.total
  } finally {
    loading.value = false
  }
}

function openDialog(row) {
  if (row) {
    isEdit.value = true
    editId.value = row.id
    Object.assign(form, {
      name: row.name, category: row.category, calories_per_100g: row.calories_per_100g,
      protein_per_100g: row.protein_per_100g, fat_per_100g: row.fat_per_100g,
      carbs_per_100g: row.carbs_per_100g, fiber_per_100g: row.fiber_per_100g,
    })
  } else {
    isEdit.value = false
    editId.value = null
    Object.assign(form, { name: '', category: '', calories_per_100g: 0, protein_per_100g: 0, fat_per_100g: 0, carbs_per_100g: 0, fiber_per_100g: 0 })
  }
  dialogVisible.value = true
}

async function handleSubmit() {
  const valid = await formRef.value.validate().catch(() => false)
  if (!valid) return
  submitting.value = true
  try {
    if (isEdit.value) {
      await updateFood(editId.value, form)
      ElMessage.success('食材更新成功')
    } else {
      await createFood(form)
      ElMessage.success('食材添加成功')
    }
    dialogVisible.value = false
    fetchData()
  } finally {
    submitting.value = false
  }
}

async function handleDelete(row) {
  await ElMessageBox.confirm(`确定要删除食材 "${row.name}" 吗？此操作不可恢复。`, '警告', { type: 'error' })
  await deleteFood(row.id)
  ElMessage.success('已删除')
  fetchData()
}

onMounted(fetchData)
</script>

<style scoped>
.search-bar { display: flex; align-items: center; flex-wrap: wrap; }
</style>
