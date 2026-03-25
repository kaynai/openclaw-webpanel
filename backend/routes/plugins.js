import express from 'express'
import db from '../db.js'

const router = express.Router()

// 获取插件列表
router.get('/', async (req, res) => {
  try {
    const plugins = await db.all('SELECT * FROM plugins ORDER BY installed_at DESC')
    // 解析 JSON 字段
    const parsed = plugins.map(p => ({
      ...p,
      config: p.config ? JSON.parse(p.config) : {},
      files: p.files ? JSON.parse(p.files) : []
    }))
    res.json({ plugins: parsed })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// 安装插件
router.post('/install', async (req, res) => {
  try {
    const { source, repo, url, file } = req.body
    // TODO: 实现实际的插件安装逻辑
    // 这里先返回模拟数据
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

    await db.run(
      `INSERT INTO plugins (id, name, version, description, author, enabled, config, files, installed_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        plugin.id, plugin.name, plugin.version, plugin.description,
        plugin.author, plugin.enabled ? 1 : 0,
        JSON.stringify(plugin.config), JSON.stringify(plugin.files), plugin.installedAt
      ]
    )

    res.json(plugin)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// 卸载插件
router.post('/:id/uninstall', async (req, res) => {
  try {
    await db.run('DELETE FROM plugins WHERE id = ?', [req.params.id])
    res.json({ success: true })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// 启用/禁用插件
router.post('/:id/toggle', async (req, res) => {
  try {
    const { enabled } = req.body
    await db.run(
      'UPDATE plugins SET enabled = ? WHERE id = ?',
      [enabled ? 1 : 0, req.params.id]
    )
    res.json({ success: true })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

export default router