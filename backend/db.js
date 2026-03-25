import sqlite3 from 'sqlite3'
import { open } from 'sqlite'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

let dbInstance = null

export default async function getDb() {
  if (dbInstance) return dbInstance

  const dbPath = process.env.DB_PATH || join(__dirname, '..', 'data', 'panel.db')
  dbInstance = await open({
    filename: dbPath,
    driver: sqlite3.Database
  })

  // 初始化表结构
  await dbInstance.exec(`
    CREATE TABLE IF NOT EXISTS config (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      gateway_url TEXT NOT NULL,
      admin_token TEXT NOT NULL,
      openclaw_path TEXT DEFAULT '/usr/local/bin/openclaw',
      auto_start BOOLEAN DEFAULT 1,
      backup_enabled BOOLEAN DEFAULT 1,
      backup_path TEXT DEFAULT './backups',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS stats (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date DATE NOT NULL,
      model TEXT NOT NULL,
      tokens INTEGER DEFAULT 0,
      sessions INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(date, model)
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      model TEXT NOT NULL,
      tokens INTEGER DEFAULT 0,
      message_count INTEGER DEFAULT 0,
      status TEXT DEFAULT 'active',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS plugins (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      version TEXT NOT NULL,
      description TEXT,
      author TEXT,
      enabled BOOLEAN DEFAULT 1,
      config TEXT DEFAULT '{}',
      installed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      files TEXT DEFAULT '[]'
    );

    CREATE TABLE IF NOT EXISTS system_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      level TEXT DEFAULT 'info',
      source TEXT,
      message TEXT NOT NULL,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS models (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      provider TEXT NOT NULL,
      apiKey TEXT NOT NULL,
      baseUrl TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `)

  // 插入默认配置（如果不存在）
  const configCount = await dbInstance.get('SELECT COUNT(*) as count FROM config')
  if (configCount.count === 0) {
    await dbInstance.run(
      'INSERT INTO config (id, gateway_url, admin_token) VALUES (1, ?, ?)',
      'ws://127.0.0.1:18789',
      ''
    )
  }

  return dbInstance
}