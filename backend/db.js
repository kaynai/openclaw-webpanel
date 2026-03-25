import { Low } from 'lowdb'
import { JSONFile } from 'lowdb/node'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import fs from 'fs-extra'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

let dbInstance = null

export async function getDb() {
  if (dbInstance) return dbInstance

  const dataDir = process.env.DATA_DIR || join(__dirname, '..', 'data')
  const dbPath = join(dataDir, 'db.json')

  // 确保数据目录存在
  await fs.ensureDir(dataDir)

  // 初始化数据结构
  const defaultData = {
    config: {
      gatewayUrl: 'ws://127.0.0.1:18789',
      adminToken: '',
      openclawPath: '/usr/local/bin/openclaw',
      autoStart: true,
      backupEnabled: true,
      backupPath: './backups',
      models: [],
      channels: []
    },
    stats: {
      overview: {
        totalTokens: 0,
        totalSessions: 0,
        activeSessions: 0,
        todayTokens: 0
      },
      byModel: [],
      bySession: [],
      timeSeries: []
    },
    sessions: [],
    plugins: [],
    systemLogs: []
  }

  // 如果文件不存在，创建初始文件
  if (!await fs.pathExists(dbPath)) {
    await fs.writeJson(dbPath, defaultData, { spaces: 2 })
  }

  const adapter = new JSONFile(dbPath)
  dbInstance = new Low(adapter, defaultData)
  await dbInstance.read()

  // 如果数据为空，初始化默认值
  if (!dbInstance.data) {
    dbInstance.data = defaultData
    await dbInstance.write()
  }

  return dbInstance
}