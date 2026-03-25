import express from 'express'
import db from '../db.js'
import { spawn } from 'child_process'
import { promisify } from 'node:util'
import { exec } from 'node:child_process'

const router = express.Router()

// 获取系统日志
router.get('/logs', async (req, res) => {
  try {
    const { limit = 100, level } = req.query
    let sql = 'SELECT * FROM system_logs'
    const params = []

    if (level && level !== 'all') {
      sql += ' WHERE level = ?'
      params.push(level)
    }

    sql += ' ORDER BY timestamp DESC LIMIT ?'
    params.push(parseInt(limit))

    const logs = await db.all(sql, params)
    res.json({ logs })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// 添加日志
router.post('/logs', async (req, res) => {
  try {
    const { level, source, message } = req.body
    await db.run(
      'INSERT INTO system_logs (level, source, message) VALUES (?, ?, ?)',
      [level || 'info', source || 'panel', message]
    )
    res.json({ success: true })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// 系统信息
router.get('/info', async (req, res) => {
  try {
    const info = await getSystemInfo()
    res.json(info)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

async function getSystemInfo() {
  return new Promise((resolve) => {
    exec('uname -a && uptime && free -h && df -h', (err, stdout) => {
      if (err) resolve({ error: err.message })
      else resolve({ info: stdout.trim() })
    })
  })
}

export default router