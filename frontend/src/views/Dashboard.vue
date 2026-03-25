<template>
  <div class="dashboard">
    <el-row :gutter="20">
      <el-col :span="6">
        <el-card class="stat-card" shadow="hover">
          <div class="stat-value">{{ formatNumber(stats.overview.totalTokens) }}</div>
          <div class="stat-label">总 Tokens 使用量</div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="stat-card" shadow="hover">
          <div class="stat-value">{{ stats.overview.totalSessions }}</div>
          <div class="stat-label">总会话数</div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="stat-card" shadow="hover">
          <div class="stat-value">{{ stats.overview.activeSessions }}</div>
          <div class="stat-label">活跃会话</div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="stat-card" shadow="hover">
          <div class="stat-value">{{ formatNumber(stats.overview.todayTokens) }}</div>
          <div class="stat-label">今日 Tokens</div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="20" style="margin-top: 20px;">
      <el-col :span="12">
        <el-card title="模型使用分布" shadow="hover">
          <div ref="modelChartRef" class="chart"></div>
        </el-card>
      </el-col>
      <el-col :span="12">
        <el-card title="最近7天用量趋势" shadow="hover">
          <div ref="trendChartRef" class="chart"></div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="20" style="margin-top: 20px;">
      <el-col :span="24">
        <el-card title="最近会话" shadow="hover">
          <el-table :data="recentSessions" stripe>
            <el-table-column prop="id" label="ID" width="80" />
            <el-table-column prop="model" label="模型" width="200" />
            <el-table-column prop="tokens" label="Tokens" width="120">
              <template #default="scope">
                {{ formatNumber(scope.row.tokens) }}
              </template>
            </el-table-column>
            <el-table-column prop="createdAt" label="创建时间">
              <template #default="scope">
                {{ formatDate(scope.row.createdAt) }}
              </template>
            </el-table-column>
            <el-table-column prop="status" label="状态" width="100">
              <template #default="scope">
                <el-tag :type="scope.row.status === 'active' ? 'success' : 'info'">
                  {{ scope.row.status === 'active' ? '活跃' : '已结束' }}
                </el-tag>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref, nextTick } from 'vue'
import { useStatsStore } from '@/stores/stats'
import * as echarts from 'echarts'

const statsStore = useStatsStore()
const { overview, byModel, bySession, timeSeries, fetchStats, fetchTimeSeries } = statsStore()

const recentSessions = computed(() => bySession.value.slice(0, 10))

const modelChartRef = ref(null)
const trendChartRef = ref(null)
let modelChart = null
let trendChart = null

onMounted(async () => {
  await fetchStats()
  await fetchTimeSeries()
  nextTick(() => {
    renderCharts()
    window.addEventListener('resize', handleResize)
  })
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  modelChart?.dispose()
  trendChart?.dispose()
})

async function refresh() {
  await Promise.all([fetchStats(), fetchTimeSeries()])
  nextTick(renderCharts)
}

function renderCharts() {
  renderModelChart()
  renderTrendChart()
}

function renderModelChart() {
  if (!modelChartRef.value) return
  if (!modelChart) {
    modelChart = echarts.init(modelChartRef.value)
  }

  modelChart.setOption({
    tooltip: {
      trigger: 'item',
      formatter: '{a} <br/>{b}: {c} ({d}%)'
    },
    legend: {
      bottom: 10
    },
    series: [
      {
        name: 'Tokens',
        type: 'pie',
        radius: '60%',
        data: byModel.value.map(m => ({
          value: m.tokens,
          name: m.model
        }))
      }
    ]
  })
}

function renderTrendChart() {
  if (!trendChartRef.value) return
  if (!trendChart) {
    trendChart = echarts.init(trendChartRef.value)
  }

  trendChart.setOption({
    tooltip: {
      trigger: 'axis'
    },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: timeSeries.value.map(d => d.date)
    },
    yAxis: {
      type: 'value',
      name: 'Tokens'
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true
    },
    series: [
      {
        name: 'Tokens',
        type: 'line',
        smooth: true,
        areaStyle: {
          opacity: 0.3
        },
        data: timeSeries.value.map(d => d.tokens)
      }
    ]
  })
}

function handleResize() {
  modelChart?.resize()
  trendChart?.resize()
}

const formatNumber = (num) => {
  if (num >= 1000000) return (num / 1000000).toFixed(2) + 'M'
  if (num >= 1000) return (num / 1000).toFixed(2) + 'K'
  return num.toLocaleString()
}

const formatDate = (dateStr) => {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleString('zh-CN')
}
</script>

<style scoped>
.chart {
  height: 300px;
}
</style>