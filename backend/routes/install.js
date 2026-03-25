import express from 'express'

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

// 安装 Node.js（如果未安装）
router.post('/install-node', async (req, res) => {
  try {
    const logs = []
    logs.push('开始安装 Node.js...')

    // 检测系统类型
    const osInfo = await execCommand('uname -s')
    const isLinux = osInfo.includes('Linux')
    const isMac = osInfo.includes('Darwin')

    if (isLinux) {
      // 使用 NodeSource 安装
      logs.push('检测到 Linux 系统，使用 NodeSource 安装 Node.js 20...')
      await execCommand('curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -')
      await execCommand('apt-get install -y nodejs')
    } else if (isMac) {
      // macOS 使用 Homebrew
      logs.push('检测到 macOS，使用 Homebrew 安装 Node.js...')
      await execCommand('brew install node@20')
    } else {
      throw new Error('不支持的操作系统，请手动安装 Node.js')
    }

    const version = await execCommand('node --version')
    logs.push(`Node.js 安装完成: ${version}`)

    res.json({ success: true, logs: logs.join('\n') })
  } catch (error) {
    res.status(500).json({ error: error.message, logs: logs.join('\n') })
  }
})

// 开始安装 OpenClaw
router.post('/install', async (req, res) => {
  const { method, path: installPath, version } = req.body

  try {
    const logs = []

    // 1. 检查并安装 Node.js
    logs.push('步骤 1/4: 检查 Node.js...')
    try {
      const nodeVersion = await execCommand('node --version')
      logs.push(`✓ Node.js 已安装: ${nodeVersion}`)
    } catch {
      logs.push('✗ Node.js 未安装，开始安装...')
      // 调用安装 Node.js 的逻辑（简化，实际应通过 API）
      logs.push('请先安装 Node.js 18+，然后重试')
      throw new Error('Node.js 未安装')
    }

    // 2. 检查并安装 npm
    logs.push('步骤 2/4: 检查 npm...')
    try {
      const npmVersion = await execCommand('npm --version')
      logs.push(`✓ npm 已安装: ${npmVersion}`)
    } catch {
      throw new Error('npm 未安装')
    }

    // 3. 安装 OpenClaw
    logs.push('步骤 3/4: 安装 OpenClaw...')

    if (method === 'npm') {
      const npmResult = await execCommand('npm install -g openclaw', logs)
      logs.push(...npmResult)
    } else if (method === 'binary') {
      const binaryResult = await installBinary(installPath, version, logs)
      logs.push(...binaryResult)
    }

    // 4. 初始化配置
    logs.push('步骤 4/4: 初始化配置...')
    await initConfig()

    logs.push('✅ OpenClaw 安装完成！')
    logs.push('')
    logs.push('下一步：在面板中配置网关地址和 Admin Token，然后启动服务。')

    res.json({ success: true, logs: logs.join('\n') })
  } catch (error) {
    res.status(500).json({ error: error.message, logs: logs.join('\n') })
  }
})

// 启动 OpenClaw
router.post('/start', async (req, res) => {
  try {
    const database = await getDb()
    const config = database.data.config
    if (!config?.openclawPath) {
      return res.status(400).json({ error: 'OpenClaw 未安装' })
    }

    // 确保 openclaw 可执行
    try {
      await execCommand(`${config.openclawPath} --version`)
    } catch {
      // 尝试从 PATH 查找
      const whichResult = await execCommand('which openclaw')
      if (whichResult) {
        config.openclawPath = 'openclaw'
        await database.write()
      } else {
        return res.status(400).json({ error: '未找到 openclaw 命令，请检查安装' })
      }
    }

    await startOpenClaw(config.openclawPath)
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
    const database = await getDb()
    const config = database.data.config
    if (config?.openclawPath) {
      await startOpenClaw(config.openclawPath)
    }
    res.json({ success: true, message: 'OpenClaw 已重启' })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// 获取系统信息
async function getSystemInfo() {
  const info = {}

  try {
    info.nodeVersion = await execCommand('node --version')
  } catch {
    info.nodeVersion = '未安装'
  }

  try {
    info.npmVersion = await execCommand('npm --version')
  } catch {
    info.npmVersion = '未安装'
  }

  try {
    info.os = await execCommand('uname -a')
  } catch {
    info.os = 'Unknown'
  }

  try {
    info.arch = await execCommand('uname -m')
  } catch {
    info.arch = 'Unknown'
  }

  try {
    const mem = await execCommand('free -h | grep "^Mem:"')
    info.memory = mem.trim()
  } catch {
    info.memory = 'Unknown'
  }

  try {
    const disk = await execCommand('df -h / | tail -1')
    info.disk = disk.trim()
  } catch {
    info.disk = 'Unknown'
  }

  return info
}

// 环境检查
async function checkEnvironment() {
  const errors = []
  const warnings = []

  // 检查 Node.js
  try {
    const nodeVersion = await execCommand('node --version')
    const version = parseInt(nodeVersion.replace('v', '').split('.')[0])
    if (version < 18) {
      errors.push('Node.js 版本必须 >= 18（建议 20+）')
    } else {
      errors.push(`Node.js 版本较旧: ${nodeVersion.trim()}，建议升级到 20+`)
    }
  } catch {
    errors.push('未检测到 Node.js（将自动安装）')
  }

  // 检查 npm
  try {
    await execCommand('npm --version')
  } catch {
    errors.push('未检测到 npm')
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
  result.push('⚠️  二进制安装功能开发中，建议使用 npm 安装')
  result.push('安装完成')

  return result
}

async function initConfig() {
  const { join } = require('node:path')
  const { ensureDir, writeJson } = require('fs-extra')

  const configDir = join(__dirname, '..', '..', 'data')
  await ensureDir(configDir)

  const configPath = join(configDir, 'openclaw.json')
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

  await writeJson(configPath, config, { spaces: 2 })
}

async function startOpenClaw(installPath) {
  return new Promise((resolve, reject) => {
    const { spawn } = require('child_process')
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
    const { spawn } = require('child_process')
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