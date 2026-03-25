import { defineStore } from 'pinia'
import { ref } from 'vue'
import dayjs from 'dayjs'
import { getStats, getUsageChart } from '@/api/stats'

export const useStatsStore = defineStore('stats', () => {
  const overview = ref({
    totalTokens: 0,
    totalSessions: 0,
    activeSessions: 0,
    todayTokens: 0
  })

  const byModel = ref([])
  const bySession = ref([])
  const timeSeries = ref([])

  const isLoading = ref(false)
  const error = ref(null)
  const dateRange = ref({
    start: dayjs().subtract(7, 'day').format('YYYY-MM-DD'),
    end: dayjs().format('YYYY-MM-DD')
  })

  async function fetchStats() {
    isLoading.value = true
    error.value = null
    try {
      const data = await getStats()
      overview.value = data.overview
      byModel.value = data.byModel
      bySession.value = data.bySession
    } catch (err) {
      error.value = err.message
    } finally {
      isLoading.value = false
    }
  }

  async function fetchTimeSeries() {
    try {
      const data = await getUsageChart({
        start: dateRange.value.start,
        end: dateRange.value.end
      })
      timeSeries.value = data
    } catch (err) {
      error.value = err.message
    }
  }

  return {
    overview,
    byModel,
    bySession,
    timeSeries,
    isLoading,
    error,
    dateRange,
    fetchStats,
    fetchTimeSeries
  }
})