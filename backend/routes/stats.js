import express from 'express'
import db from '../db.js'

const router = express.Router()

// 获取统计数据概览
router.get('/', async (req, res) => {
  try {
    // 总 tokens
    const totalTokens = await db.get('SELECT SUM(tokens) as total FROM sessions WHERE status = "ended"')
    const total = totalTokens.total || 0

    // 总会话数
    const totalSessions = await db.get('SELECT COUNT(*) as count FROM sessions')
    const sessionsCount = totalSessions.count

    // 活跃会话
    const activeSessions = await db.get('SELECT COUNT(*) as count FROM sessions WHERE status = "active"')
    const active = activeSessions.count

    // 今日 tokens
    const today = new Date().toISOString().slice(0, 10)
    const todayTokens = await db.get(
      'SELECT SUM(tokens) as total FROM sessions WHERE status = "ended" AND DATE(updated_at) = ?',
      [today]
    )
    const todayTotal = todayTokens.total || 0

    // 按模型统计
    const byModel = await db.all(
      `SELECT model, SUM(tokens) as tokens, COUNT(*) as sessions
       FROM sessions WHERE status = "ended"
       GROUP BY model ORDER BY tokens DESC`
    )

    // 按会话统计（最近10个）
    const bySession = await db.all(
      `SELECT * FROM sessions WHERE status = "ended"
       ORDER BY updated_at DESC LIMIT 20`
    )

    res.json({
      overview: {
        totalTokens: total,
        totalSessions: sessionsCount,
        activeSessions: active,
        todayTokens: todayTotal
      },
      byModel,
      bySession
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// 获取时间序列图表数据
router.get('/chart', async (req, res) => {
  try {
    const { start, end } = req.query
    const sql = `
      SELECT DATE(updated_at) as date, SUM(tokens) as tokens
      FROM sessions
      WHERE status = "ended" AND DATE(updated_at) BETWEEN ? AND ?
      GROUP BY DATE(updated_at)
      ORDER BY date
    `
    const rows = await db.all(sql, [start, end])
    res.json(rows)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

export default router