import express from 'express'

const router = express.Router()

// 获取系统日志
router.get('/logs', async (req, res) => {
  try {
    const database = await getDb()
    const logs = database.data.systemLogs || []
    const { limit = 100, level } = req.query

    let filtered = logs
    if (level && level !== 'all') {
      filtered = filtered.filter(l => l.level === level)
    }

    filtered.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))

    const result = limit ? filtered.slice(0, parseInt(limit)) : filtered
    res.json({ logs: result })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// 添加日志
router.post('/logs', async (req, res) => {
  try {
    const { level, source, message } = req.body
    const database = await getDb()
    const log = {
      id: database.data.systemLogs?.length + 1 || 1,
      level: level || 'info',
      source: source || 'panel',
      message,
      timestamp: new Date().toISOString()
    }
    database.data.systemLogs = [...(database.data.systemLogs || []), log]
    await database.write()
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
  const { exec } = require('child_process')
  return new Promise((resolve) => {
    exec('uname -a && uptime && free -h && df -h', (err, stdout) => {
      if (err) resolve({ error: err.message })
      else resolve({ info: stdout.trim() })
    })
  })
}

export default router