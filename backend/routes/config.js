import express from 'express'
import { getDb } from '../db.js'

const router = express.Router()

// 获取配置
router.get('/', async (req, res) => {
  try {
    const database = await getDb()
    const config = database.data.config
    res.json(config)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// 保存配置
router.post('/', async (req, res) => {
  try {
    const database = await getDb()
    const { gatewayUrl, adminToken, openclawPath, autoStart, backupEnabled, backupPath, models, channels } = req.body

    database.data.config = {
      ...database.data.config,
      gatewayUrl,
      adminToken,
      openclawPath,
      autoStart: autoStart !== undefined ? autoStart : database.data.config.autoStart,
      backupEnabled: backupEnabled !== undefined ? backupEnabled : database.data.config.backupEnabled,
      backupPath: backupPath || database.data.config.backupPath,
      models: models || database.data.config.models,
      channels: channels || database.data.config.channels
    }

    await database.write()
    res.json(database.data.config)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// 测试连接
router.post('/test', async (req, res) => {
  const { gatewayUrl, adminToken } = req.body

  try {
    // 测试 WebSocket 连接
    const WebSocket = require('ws')
    const testTimeout = 5000

    const promise = new Promise((resolve, reject) => {
      const ws = new WebSocket(gatewayUrl, {
        headers: {
          'Authorization': `Bearer ${adminToken}`
        }
      })

      const timer = setTimeout(() => {
        ws.close()
        reject(new Error('连接超时'))
      }, testTimeout)

      ws.on('open', () => {
        clearTimeout(timer)
        ws.close()
        resolve(true)
      })

      ws.on('error', (err) => {
        clearTimeout(timer)
        reject(err)
      })
    })

    await promise
    res.json({ success: true, message: '连接成功' })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
})

// 获取 OpenClaw 状态
router.get('/openclaw/status', async (req, res) => {
  try {
    const database = await getDb()
    const config = database.data.config
    if (!config.openclawPath) {
      return res.json({ installed: false, running: false })
    }

    // 检查进程是否运行
    const isRunning = await checkProcess('openclaw')
    res.json({
      installed: true,
      running: isRunning,
      path: config.openclawPath,
      version: await getOpenClawVersion(config.openclawPath)
    })
  } catch (error) {
    res.json({ installed: false, running: false, error: error.message })
  }
})

async function checkProcess(name) {
  return new Promise((resolve) => {
    const { exec } = require('child_process')
    exec(`pgrep -f ${name}`, (err, stdout) => {
      resolve(!err && stdout.trim().length > 0)
    })
  })
}

async function getOpenClawVersion(path) {
  return new Promise((resolve) => {
    const { exec } = require('child_process')
    exec(`${path} --version`, (err, stdout) => {
      if (err) resolve(null)
      else resolve(stdout.trim())
    })
  })
}

export default router