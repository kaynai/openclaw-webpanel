import express from 'express'
import { getDb } from '../db.js'

const router = express.Router()

// 获取插件列表
router.get('/', async (req, res) => {
  try {
    const database = await getDb()
    const plugins = database.data.plugins || []
    res.json({ plugins })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// 安装插件
router.post('/install', async (req, res) => {
  try {
    const { source, repo, url, file } = req.body
    const database = await getDb()

    const pluginId = `plugin_${Date.now()}`
    const plugin = {
      id: pluginId,
      name: '示例插件',
      version: '1.0.0',
      description: '这是一个示例插件',
      author: '开发者',
      enabled: true,
      config: {},
      files: ['plugin.json', 'index.js'],
      installedAt: new Date().toISOString()
    }

    database.data.plugins = [...(database.data.plugins || []), plugin]
    await database.write()

    res.json(plugin)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// 卸载插件
router.post('/:id/uninstall', async (req, res) => {
  try {
    const database = await getDb()
    const plugins = database.data.plugins || []
    const filtered = plugins.filter(p => p.id !== req.params.id)
    database.data.plugins = filtered
    await database.write()
    res.json({ success: true })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// 启用/禁用插件
router.post('/:id/toggle', async (req, res) => {
  try {
    const { enabled } = req.body
    const database = await getDb()
    const plugins = database.data.plugins || []
    const plugin = plugins.find(p => p.id === req.params.id)
    if (plugin) {
      plugin.enabled = enabled
      await database.write()
    }
    res.json({ success: true })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

export default router