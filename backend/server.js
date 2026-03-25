import express from 'express'
import cors from 'cors'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { getDb } from './db.js'
import configRoutes from './routes/config.js'
import statsRoutes from './routes/stats.js'
import sessionsRoutes from './routes/sessions.js'
import systemRoutes from './routes/system.js'
import pluginsRoutes from './routes/plugins.js'
import installRoutes from './routes/install.js'
import apiRoutes from './routes/api.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const app = express()
const PORT = process.env.PORT || 3001

// 中间件
app.use(cors())
app.use(express.json())
app.use(express.static(join(__dirname, 'public')))

// API 路由
app.use('/api/config', configRoutes)
app.use('/api/stats', statsRoutes)
app.use('/api/sessions', sessionsRoutes)
app.use('/api/system', systemRoutes)
app.use('/api/plugins', pluginsRoutes)
app.use('/api/install', installRoutes)
app.use('/api', apiRoutes)  // 代理到 OpenClaw Gateway

// 健康检查
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// 启动服务器
app.listen(PORT, () => {
  console.log(`OpenClaw Web Panel backend running on http://localhost:${PORT}`)
  console.log(`Frontend available at http://localhost:${PORT}`)
})