import express from 'express'
import db from '../db.js'
import { spawn } from 'child_process'
import { promisify } from 'node:util'
import { exec } from 'node:child_process'

const router = express.Router()

// 获取配置
router.get('/', async (req, res) => {
  try {
    const config = await db.get('SELECT * FROM config WHERE id = 1')
    const models = await db.all('SELECT * FROM models ORDER BY id')
    res.json({
      ...config,
      models: models.map(m => ({
        id: m.id,
        name: m.name,
        provider: m.provider,
        apiKey: m.apiKey,
        baseUrl: m.baseUrl
      }))
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// 保存配置
router.post('/', async (req, res) => {
  try {
    const { gatewayUrl, adminToken, openclawPath, autoStart, backupEnabled, backupPath, models } = req.body

    await db.run(
      `UPDATE config SET 
        gateway_url = ?, 
        admin_token = ?, 
        openclaw_path = ?,
        auto_start = ?,
        backup_enabled = ?,
        backup_path = ?,
        updated_at = CURRENT_TIMESTAMP
       WHERE id = 1`,
      [gatewayUrl, adminToken, openclawPath, autoStart ? 1 : 0, backupEnabled ? 1 : 0, backupPath]
    )

    // 更新模型配置
    if (models && Array.isArray(models)) {
      await db.run('DELETE FROM models')
      for (const model of models) {
        await db.run(
          'INSERT INTO models (name, provider, apiKey, baseUrl) VALUES (?, ?, ?, ?)',
          [model.name, model.provider, model.apiKey, model.baseUrl]
        )
      }
    }

    const config = await db.get('SELECT * FROM config WHERE id = 1')
    res.json(config)
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
    const config = await db.get('SELECT * FROM config WHERE id = 1')
    if (!config.openclaw_path) {
      return res.json({ installed: false, running: false })
    }

    // 检查进程是否运行
    const isRunning = await checkProcess('openclaw')
    res.json({
      installed: true,
      running: isRunning,
      path: config.openclaw_path,
      version: await getOpenClawVersion(config.openclaw_path)
    })
  } catch (error) {
    res.json({ installed: false, running: false, error: error.message })
  }
})

async function checkProcess(name) {
  return new Promise((resolve) => {
    exec(`pgrep -f ${name}`, (err, stdout) => {
      resolve(!err && stdout.trim().length > 0)
    })
  })
}

async function getOpenClawVersion(path) {
  return new Promise((resolve) => {
    exec(`${path} --version`, (err, stdout) => {
      if (err) resolve(null)
      else resolve(stdout.trim())
    })
  })
}

export default router