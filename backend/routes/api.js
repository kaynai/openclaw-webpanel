import express from 'express'
import db from '../db.js'

const router = express.Router()

// API 代理：将请求转发到 OpenClaw Gateway
router.all('/gateway/*', async (req, res) => {
  try {
    const config = await db.get('SELECT * FROM config WHERE id = 1')
    const gatewayUrl = config.gateway_url.replace('ws://', 'http://')

    const proxyUrl = `${gatewayUrl}/${req.params[0]}`

    const response = await fetch(proxyUrl, {
      method: req.method,
      headers: {
        ...req.headers,
        host: new URL(proxyUrl).host,
        'Authorization': `Bearer ${config.admin_token}`
      },
      body: req.method !== 'GET' && req.method !== 'HEAD' ? JSON.stringify(req.body) : undefined
    })

    const data = await response.json()
    res.json(data)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

export default router