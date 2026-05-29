<template>
  <el-card shadow="hover">
    <el-table :data="list" v-loading="loading" stripe>
      <el-table-column prop="id" label="ID" width="70" />
      <el-table-column prop="admin_name" label="操作人" width="120" />
      <el-table-column label="操作类型" width="150">
        <template #default="{ row }">
          <el-tag size="small">{{ actionLabel(row.action) }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作目标" width="120">
        <template #default="{ row }">{{ targetLabel(row.target_type) }} </template>
      </el-table-column>
      <el-table-column prop="target_id" label="目标ID" width="80" />
      <el-table-column prop="created_at" label="操作时间" min-width="170">
        <template #default="{ row }">{{ row.created_at?.slice(0, 16).replace('T', ' ') }}</template>
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
import { getLogs } from '@/api'

const list = ref([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(10)
const loading = ref(false)

const actionMap = {
  disable_user: '禁用用户', enable_user: '启用用户', reset_password: '重置密码',
  create_food: '添加食材', update_food: '编辑食材', delete_food: '删除食材',
  create_announcement: '发布公告', update_announcement: '编辑公告', delete_announcement: '删除公告',
}
const targetMap = { user: '用户', food: '食材', system: '系统' }

function actionLabel(action) { return actionMap[action] || action }
function targetLabel(type) { return targetMap[type] || type }

async function fetchData() {
  loading.value = true
  try {
    const res = await getLogs({ page: page.value, pageSize: pageSize.value })
    list.value = res.data.list
    total.value = res.data.total
  } finally {
    loading.value = false
  }
}

onMounted(fetchData)
</script>
