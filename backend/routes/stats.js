import express from 'express'
import { getDb } from '../db.js'
import dayjs from 'dayjs'

const router = express.Router()

// 获取统计数据概览
router.get('/', async (req, res) => {
  try {
    const database = await getDb()
    const sessions = database.data.sessions || []

    // 计算统计
    const endedSessions = sessions.filter(s => s.status === 'ended')
    const totalTokens = endedSessions.reduce((sum, s) => sum + (s.tokens || 0), 0)
    const totalSessions = sessions.length
    const activeSessions = sessions.filter(s => s.status === 'active').length
    const today = dayjs().format('YYYY-MM-DD')
    const todayTokens = endedSessions
      .filter(s => dayjs(s.updatedAt).format('YYYY-MM-DD') === today)
      .reduce((sum, s) => sum + (s.tokens || 0), 0)

    // 按模型统计
    const byModelMap = {}
    endedSessions.forEach(s => {
      const model = s.model || 'unknown'
      if (!byModelMap[model]) {
        byModelMap[model] = { model, tokens: 0, sessions: 0 }
      }
      byModelMap[model].tokens += s.tokens || 0
      byModelMap[model].sessions += 1
    })
    const byModel = Object.values(byModelMap).sort((a, b) => b.tokens - a.tokens)

    // 按会话统计（最近20个）
    const bySession = [...sessions]
      .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
      .slice(0, 20)

    // 时间序列（最近7天）
    const timeSeries = []
    for (let i = 6; i >= 0; i--) {
      const date = dayjs().subtract(i, 'day').format('YYYY-MM-DD')
      const daySessions = endedSessions.filter(s => dayjs(s.updatedAt).format('YYYY-MM-DD') === date)
      timeSeries.push({
        date,
        tokens: daySessions.reduce((sum, s) => sum + (s.tokens || 0), 0)
      })
    }

    res.json({
      overview: {
        totalTokens,
        totalSessions,
        activeSessions,
        todayTokens
      },
      byModel,
      bySession,
      timeSeries
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// 获取时间序列图表数据（自定义范围）
router.get('/chart', async (req, res) => {
  try {
    const { start, end } = req.query
    const database = await getDb()
    const sessions = database.data.sessions || []
    const endedSessions = sessions.filter(s => s.status === 'ended')

    const startDate = dayjs(start)
    const endDate = dayjs(end)
    const timeSeries = []

    let current = startDate
    while (current.isBefore(endDate) || current.isSame(endDate)) {
      const date = current.format('YYYY-MM-DD')
      const daySessions = endedSessions.filter(s =>
        dayjs(s.updatedAt).format('YYYY-MM-DD') === date
      )
      timeSeries.push({
        date,
        tokens: daySessions.reduce((sum, s) => sum + (s.tokens || 0), 0)
      })
      current = current.add(1, 'day')
    }

    res.json(timeSeries)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

export default router