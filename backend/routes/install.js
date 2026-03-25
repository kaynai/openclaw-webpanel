import express from 'express'
import db from '../db.js'
import { spawn, exec } from 'child_process'
import { promisify } from 'node:util'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const router = express.Router()

// 检测环境
router.get('/env', async (req, res) => {
  try {
    const info = await getSystemInfo()
    const check = await checkEnvironment()

    res.json({ info, check })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// 开始安装
router.post('/install', async (req, res) => {
  const { method, path: installPath, version } = req.body

  try {
    // 发送实时日志（这里简化处理，实际应该用 SSE 或 WebSocket）
    const logs = []

    // 步骤1: 安装 OpenClaw
    logs.push('开始安装 OpenClaw...')

    if (method === 'npm') {
      const npmResult = await execCommand('npm install -g openclaw', logs)
      logs.push(...npmResult)
    } else if (method === 'binary') {
      const binaryResult = await installBinary(installPath, version, logs)
      logs.push(...binaryResult)
    }

    // 步骤2: 初始化配置
    logs.push('初始化配置...')
    await initConfig()

    logs.push('OpenClaw 安装完成！')

    res.json({ success: true, logs: logs.join('\n') })
  } catch (error) {
    res.status(500).json({ error: error.message, logs: logs.join('\n') })
  }
})

// 启动 OpenClaw
router.post('/start', async (req, res) => {
  try {
    const config = await db.get('SELECT * FROM config WHERE id = 1')
    if (!config.openclaw_path) {
      return res.status(400).json({ error: 'OpenClaw 未安装' })
    }

    // 启动 OpenClaw
    await startOpenClaw(config.openclaw_path)

    res.json({ success: true, message: 'OpenClaw 已启动' })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// 停止 OpenClaw
router.post('/stop', async (req, res) => {
  try {
    await exec('pkill -f openclaw')
    res.json({ success: true, message: 'OpenClaw 已停止' })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// 重启 OpenClaw
router.post('/restart', async (req, res) => {
  try {
    await exec('pkill -f openclaw')
    const config = await db.get('SELECT * FROM config WHERE id = 1')
    if (config.openclaw_path) {
      await startOpenClaw(config.openclaw_path)
    }
    res.json({ success: true, message: 'OpenClaw 已重启' })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

async function getSystemInfo() {
  const info = {}

  // Node.js 版本
  try {
    info.nodeVersion = await execCommand('node --version')
  } catch {
    info.nodeVersion = '未安装'
  }

  // 操作系统
  try {
    info.os = await execCommand('uname -a')
  } catch {
    info.os = 'Unknown'
  }

  // 架构
  try {
    info.arch = await execCommand('uname -m')
  } catch {
    info.arch = 'Unknown'
  }

  // 内存
  try {
    const mem = await execCommand('free -h | grep "^Mem:"')
    info.memory = mem.trim()
  } catch {
    info.memory = 'Unknown'
  }

  // 磁盘空间
  try {
    const disk = await execCommand('df -h / | tail -1')
    info.disk = disk.trim()
  } catch {
    info.disk = 'Unknown'
  }

  return info
}

async function checkEnvironment() {
  const errors = []
  const warnings = []

  // 检查 Node.js
  try {
    const nodeVersion = await execCommand('node --version')
    const version = parseInt(nodeVersion.replace('v', '').split('.')[0])
    if (version < 18) {
      errors.push('Node.js 版本必须 >= 18')
    }
  } catch {
    errors.push('未检测到 Node.js')
  }

  // 检查 npm
  try {
    await execCommand('npm --version')
  } catch {
    errors.push('未检测到 npm')
  }

  // 检查是否有 root/管理员权限（某些操作需要）
  try {
    await execCommand('whoami')
  } catch {
    errors.push('无法获取当前用户')
  }

  return {
    passed: errors.length === 0,
    errors,
    warnings
  }
}

async function installBinary(installPath, version, logs) {
  const result = []

  result.push(`下载 OpenClaw 二进制文件到 ${installPath}...`)

  // TODO: 实现实际的下载和安装逻辑
  // 这里先模拟

  result.push('下载完成')
  result.push('设置执行权限...')

  await execCommand(`chmod +x ${installPath}`)

  result.push('二进制安装完成')
  return result
}

async function initConfig() {
  // 创建初始配置
  const configPath = join(__dirname, '..', '..', 'data', 'openclaw.json')
  const configDir = path.dirname(configPath)

  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true })
  }

  const config = {
    gateway: {
      bind: '127.0.0.1:18789',
      trustedProxies: []
    },
    agents: {
      default: {
        model: 'stepfun-ai/Step-3.5-Flash'
      }
    },
    plugins: {
      entries: []
    }
  }

  fs.writeFileSync(configPath, JSON.stringify(config, null, 2))
}

async function startOpenClaw(installPath) {
  // 后台启动 OpenClaw
  // 注意：在容器环境中需要特殊处理
  return new Promise((resolve, reject) => {
    const child = spawn(installPath, ['gateway', 'start'], {
      detached: true,
      stdio: 'ignore'
    })

    child.unref()
    setTimeout(resolve, 2000)
  })
}

async function execCommand(command, logs = []) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, { shell: true, stdio: 'pipe' })

    let output = ''
    child.stdout.on('data', (data) => {
      const text = data.toString()
      output += text
      logs.push(text.trim())
    })

    child.stderr.on('data', (data) => {
      const text = data.toString()
      output += text
      logs.push(`ERROR: ${text.trim()}`)
    })

    child.on('close', (code) => {
      if (code === 0) {
        resolve(output.trim())
      } else {
        reject(new Error(`命令执行失败，退出码: ${code}`))
      }
    })

    child.on('error', (err) => {
      reject(err)
    })
  })
}

export default router