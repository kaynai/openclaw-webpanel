import express from 'express'
import db from '../db.js'

const router = express.Router()

// 获取会话列表
router.get('/', async (req, res) => {
  try {
    const { limit = 50, status } = req.query
    let sql = 'SELECT * FROM sessions'
    const params = []

    if (status) {
      sql += ' WHERE status = ?'
      params.push(status)
    }

    sql += ' ORDER BY updated_at DESC'
    if (limit) {
      sql += ' LIMIT ?'
      params.push(parseInt(limit))
    }

    const sessions = await db.all(sql, params)
    res.json({ sessions })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// 获取单个会话详情
router.get('/:id', async (req, res) => {
  try {
    const session = await db.get('SELECT * FROM sessions WHERE id = ?', [req.params.id])
    if (!session) {
      return res.status(404).json({ error: 'Session not found' })
    }

    // 这里应该从消息存储中获取实际消息历史
    // 目前返回模拟数据
    session.messages = []

    res.json(session)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// 结束会话
router.post('/:id/end', async (req, res) => {
  try {
    await db.run(
      'UPDATE sessions SET status = "ended", updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [req.params.id]
    )
    res.json({ success: true })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

export default router