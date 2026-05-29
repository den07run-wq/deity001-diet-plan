<template>
  <el-card shadow="hover">
    <div class="search-bar">
      <el-input v-model="keyword" placeholder="搜索用户名/昵称" clearable style="width:220px" @clear="fetchData" @keyup.enter="fetchData" />
      <el-select v-model="roleFilter" placeholder="角色筛选" clearable style="width:140px;margin-left:12px" @change="fetchData">
        <el-option label="普通用户" :value="0" />
        <el-option label="管理员" :value="1" />
      </el-select>
      <el-select v-model="statusFilter" placeholder="状态筛选" clearable style="width:140px;margin-left:12px" @change="fetchData">
        <el-option label="启用" :value="1" />
        <el-option label="禁用" :value="0" />
      </el-select>
      <el-button type="success" @click="fetchData" style="margin-left:12px">搜索</el-button>
    </div>

    <el-table :data="list" v-loading="loading" stripe style="margin-top:16px">
      <el-table-column prop="id" label="ID" width="70" />
      <el-table-column prop="username" label="用户名" width="120" />
      <el-table-column prop="nickname" label="昵称" width="120" />
      <el-table-column prop="gender" label="性别" width="60" />
      <el-table-column prop="age" label="年龄" width="60" />
      <el-table-column prop="goal" label="健康目标" width="100" />
      <el-table-column label="角色" width="90">
        <template #default="{ row }">
          <el-tag :type="row.role === 1 ? 'danger' : 'info'" size="small">
            {{ row.role === 1 ? '管理员' : '普通用户' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="状态" width="80">
        <template #default="{ row }">
          <el-tag :type="row.status === 1 ? 'success' : 'danger'" size="small">
            {{ row.status === 1 ? '启用' : '禁用' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="created_at" label="注册时间" width="170">
        <template #default="{ row }">{{ row.created_at?.slice(0, 16).replace('T', ' ') }}</template>
      </el-table-column>
      <el-table-column label="操作" min-width="180" fixed="right">
        <template #default="{ row }">
          <el-button type="warning" size="small" @click="resetPwd(row)">重置密码</el-button>
          <el-button v-if="row.status === 1" type="danger" size="small" @click="toggleStatus(row, 0)">禁用</el-button>
          <el-button v-else type="success" size="small" @click="toggleStatus(row, 1)">启用</el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-pagination
      v-model:current-page="page" :page-size="pageSize" :total="total"
      layout="total, prev, pager, next" style="margin-top:16px;justify-content:flex-end"
      @current-change="fetchData"
    />
  </el-card>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { getUsers, updateUserStatus, resetUserPassword } from '@/api'
import { ElMessage, ElMessageBox } from 'element-plus'

const list = ref([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(10)
const loading = ref(false)
const keyword = ref('')
const roleFilter = ref('')
const statusFilter = ref('')

async function fetchData() {
  loading.value = true
  try {
    const res = await getUsers({
      keyword: keyword.value, role: roleFilter.value, status: statusFilter.value,
      page: page.value, pageSize: pageSize.value,
    })
    list.value = res.data.list
    total.value = res.data.total
  } finally {
    loading.value = false
  }
}

async function toggleStatus(row, status) {
  const action = status === 0 ? '禁用' : '启用'
  await ElMessageBox.confirm(`确定要${action}用户 "${row.nickname || row.username}" 吗？`, '提示', { type: 'warning' })
  await updateUserStatus(row.id, status)
  ElMessage.success(`已${action}`)
  fetchData()
}

async function resetPwd(row) {
  await ElMessageBox.confirm(`确定要重置 "${row.nickname || row.username}" 的密码为 123456 吗？`, '提示', { type: 'warning' })
  await resetUserPassword(row.id)
  ElMessage.success('密码已重置')
}

onMounted(fetchData)
</script>

<style scoped>
.search-bar { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; }
</style>
