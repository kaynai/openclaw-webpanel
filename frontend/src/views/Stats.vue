<template>
  <div class="stats-container">
    <el-card shadow="never">
      <template #header>
        <div class="card-header">
          <span>Tokens 用量统计</span>
          <div>
            <el-date-picker
              v-model="dateRange"
              type="daterange"
              range-separator="至"
              start-placeholder="开始日期"
              end-placeholder="结束日期"
              @change="onDateRangeChange"
            />
            <el-button type="primary" size="small" @click="refresh" :loading="loading" style="margin-left: 10px;">
              刷新
            </el-button>
          </div>
        </div>
      </template>

      <el-row :gutter="20">
        <el-col :span="6">
          <el-card class="stat-card" shadow="hover">
            <div class="stat-value">{{ formatNumber(stats.overview.totalTokens) }}</div>
            <div class="stat-label">总 Tokens</div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card class="stat-card" shadow="hover">
            <div class="stat-value">{{ formatNumber(stats.overview.todayTokens) }}</div>
            <div class="stat-label">今日 Tokens</div>
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
      </el-row>

      <el-row :gutter="20" style="margin-top: 20px;">
        <el-col :span="12">
          <el-card title="按模型分布" shadow="hover">
            <div ref="modelChartRef" class="chart"></div>
          </el-card>
        </el-col>
        <el-col :span="12">
          <el-card title="按会话排名" shadow="hover">
            <div ref="sessionChartRef" class="chart"></div>
          </el-card>
        </el-col>
      </el-row>

      <el-row :gutter="20" style="margin-top: 20px;">
        <el-col :span="24">
          <el-card title="时间趋势图" shadow="hover">
            <div ref="trendChartRef" class="chart-large"></div>
          </el-card>
        </el-col>
      </el-row>

      <el-row :gutter="20" style="margin-top: 20px;">
        <el-col :span="24">
          <el-card title="详细数据" shadow="hover">
            <el-table :data="stats.byModel" stripe>
              <el-table-column prop="model" label="模型" />
              <el-table-column prop="tokens" label="Tokens">
                <template #default="scope">
                  {{ formatNumber(scope.row.tokens) }}
                </template>
              </el-table-column>
              <el-table-column prop="percentage" label="占比">
                <template #default="scope">
                  {{ (scope.row.percentage * 100).toFixed(2) }}%
                </template>
              </el-table-column>
              <el-table-column prop="sessions" label="会话数" />
            </el-table>
          </el-card>
        </el-col>
      </el-row>
    </el-card>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue'
import * as echarts from 'echarts'
import { useStatsStore } from '@/stores/stats'

const statsStore = useStatsStore()
const { overview, byModel, bySession, timeSeries, dateRange, fetchStats, fetchTimeSeries } = statsStore()

const loading = ref(false)
const modelChartRef = ref(null)
const sessionChartRef = ref(null)
const trendChartRef = ref(null)
let modelChart = null
let sessionChart = null
let trendChart = null

const onDateRangeChange = async () => {
  await fetchTimeSeries()
  renderCharts()
}

const refresh = async () => {
  loading.value = true
  try {
    await Promise.all([fetchStats(), fetchTimeSeries()])
    await nextTick()
    renderCharts()
  } finally {
    loading.value = false
  }
}

const formatNumber = (num) => {
  if (num >= 1000000) return (num / 1000000).toFixed(2) + 'M'
  if (num >= 1000) return (num / 1000).toFixed(2) + 'K'
  return num.toLocaleString()
}

function renderCharts() {
  renderModelChart()
  renderSessionChart()
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

function renderSessionChart() {
  if (!sessionChartRef.value) return
  if (!sessionChart) {
    sessionChart = echarts.init(sessionChartRef.value)
  }

  sessionChart.setOption({
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'shadow'
      }
    },
    xAxis: {
      type: 'category',
      data: bySession.value.slice(0, 10).map(s => s.id.substring(0, 8))
    },
    yAxis: {
      type: 'value',
      name: 'Tokens'
    },
    series: [
      {
        data: bySession.value.slice(0, 10).map(s => s.tokens),
        type: 'bar',
        itemStyle: {
          color: '#409eff'
        }
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
  sessionChart?.resize()
  trendChart?.resize()
}

onMounted(async () => {
  await refresh()
  nextTick(() => {
    renderCharts()
    window.addEventListener('resize', handleResize)
  })
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  modelChart?.dispose()
  sessionChart?.dispose()
  trendChart?.dispose()
})
</script>

<style scoped>
.chart {
  height: 300px;
}

.chart-large {
  height: 400px;
}
</style>