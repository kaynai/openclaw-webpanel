import express from 'express'
import { getDb } from '../db.js'

const router = express.Router()

// 获取会话列表
router.get('/', async (req, res) => {
  try {
    const database = await getDb()
    const sessions = database.data.sessions || []
    const { limit = 50, status } = req.query

    let filtered = sessions
    if (status) {
      filtered = filtered.filter(s => s.status === status)
    }

    filtered.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))

    const result = limit ? filtered.slice(0, parseInt(limit)) : filtered

    res.json({ sessions: result })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// 获取单个会话详情
router.get('/:id', async (req, res) => {
  try {
    const database = await getDb()
    const sessions = database.data.sessions || []
    const session = sessions.find(s => s.id === req.params.id)

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
    const database = await getDb()
    const sessions = database.data.sessions || []
    const index = sessions.findIndex(s => s.id === req.params.id)

    if (index === -1) {
      return res.status(404).json({ error: 'Session not found' })
    }

    sessions[index].status = 'ended'
    sessions[index].updatedAt = new Date().toISOString()

    await database.write()
    res.json({ success: true })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

export default router