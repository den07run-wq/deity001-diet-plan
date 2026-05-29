<template>
  <div class="dashboard">
    <el-row :gutter="20" class="stat-cards">
      <el-col :span="6">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-value">{{ data.totalUsers }}</div>
          <div class="stat-label">总用户数</div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-value">{{ data.todayNew }}</div>
          <div class="stat-label">今日新增</div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-value">{{ data.todayActive }}</div>
          <div class="stat-label">今日活跃用户</div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-value">{{ data.todayRecords }}</div>
          <div class="stat-label">今日饮食记录</div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="20" style="margin-top:20px">
      <el-col :span="12">
        <el-card shadow="hover">
          <template #header>用户增长趋势（近30天）</template>
          <v-chart :option="userGrowthOption" style="height:320px" autoresize />
        </el-card>
      </el-col>
      <el-col :span="12">
        <el-card shadow="hover">
          <template #header>食材分类分布</template>
          <v-chart :option="categoryOption" style="height:320px" autoresize />
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="20" style="margin-top:20px">
      <el-col :span="12">
        <el-card shadow="hover">
          <template #header>最受欢迎食材 Top 10（近30天）</template>
          <el-table :data="data.topFoods || []" size="small" max-height="340">
            <el-table-column type="index" label="#" width="50" />
            <el-table-column prop="name" label="食材名称" />
            <el-table-column prop="category" label="分类" width="80" />
            <el-table-column prop="record_count" label="记录次数" width="90" />
          </el-table>
        </el-card>
      </el-col>
      <el-col :span="12">
        <el-card shadow="hover">
          <template #header>系统概况</template>
          <el-descriptions :column="1" border>
            <el-descriptions-item label="总用户数">{{ data.totalUsers }}</el-descriptions-item>
            <el-descriptions-item label="今日新增用户">{{ data.todayNew }}</el-descriptions-item>
            <el-descriptions-item label="今日活跃用户">{{ data.todayActive }}</el-descriptions-item>
            <el-descriptions-item label="今日饮食记录">{{ data.todayRecords }}</el-descriptions-item>
            <el-descriptions-item label="用户平均目标热量">{{ data.avgCalorieTarget }} kcal/天</el-descriptions-item>
          </el-descriptions>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { getDashboard } from '@/api'
import VChart from 'vue-echarts'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { BarChart, LineChart, PieChart } from 'echarts/charts'
import { GridComponent, TooltipComponent, LegendComponent, TitleComponent } from 'echarts/components'

use([CanvasRenderer, BarChart, LineChart, PieChart, GridComponent, TooltipComponent, LegendComponent, TitleComponent])

const data = ref({})

const userGrowthOption = computed(() => ({
  tooltip: { trigger: 'axis' },
  xAxis: { type: 'category', data: (data.value.userGrowth || []).map((d) => d.date) },
  yAxis: { type: 'value' },
  series: [{ name: '新增用户', type: 'line', data: (data.value.userGrowth || []).map((d) => d.count), smooth: true, itemStyle: { color: '#67C23A' } }],
}))

const categoryOption = computed(() => ({
  tooltip: { trigger: 'item' },
  series: [{
    type: 'pie', radius: ['40%', '70%'],
    data: (data.value.categoryStats || []).map((d) => ({ name: d.category, value: d.count })),
    emphasis: { itemStyle: { shadowBlur: 10, shadowOffsetX: 0, shadowColor: 'rgba(0, 0, 0, 0.5)' } },
  }],
}))

onMounted(async () => {
  const res = await getDashboard()
  data.value = res.data
})
</script>

<style scoped>
.stat-card { text-align: center; }
.stat-value { font-size: 32px; font-weight: bold; color: #67C23A; }
.stat-label { font-size: 14px; color: #999; margin-top: 8px; }
</style>
