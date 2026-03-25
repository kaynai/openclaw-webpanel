<template>
  <div class="install-container">
    <el-card shadow="never">
      <template #header>
        <div class="card-header">
          <span>OpenClaw 一键安装</span>
          <el-tag :type="statusType">{{ statusText }}</el-tag>
        </div>
      </template>

      <el-steps :active="currentStep" finish-status="success" align-center style="margin-bottom: 40px;">
        <el-step title="环境检测" description="检查系统环境" />
        <el-step title="下载安装" description="下载并安装" />
        <el-step title="配置" description="初始化配置" />
        <el-step title="启动" description="启动服务" />
        <el-step title="完成" description="安装完成" />
      </el-steps>

      <div v-if="currentStep === 0" class="step-content">
        <h3>环境检测</h3>
        <el-descriptions :column="1" border>
          <el-descriptions-item label="Node.js">{{ envInfo.nodeVersion || '未检测' }}</el-descriptions-item>
          <el-descriptions-item label="操作系统">{{ envInfo.os || '未检测' }}</el-descriptions-item>
          <el-descriptions-item label="架构">{{ envInfo.arch || '未检测' }}</el-descriptions-item>
          <el-descriptions-item label="内存">{{ envInfo.memory || '未检测' }}</el-descriptions-item>
          <el-descriptions-item label="磁盘空间">{{ envInfo.disk || '未检测' }}</el-descriptions-item>
        </el-descriptions>
        <div v-if="envCheck.errors && envCheck.errors.length" style="margin-top: 20px;">
          <el-alert title="环境问题" type="warning" :closable="false">
            <ul>
              <li v-for="(error, i) in envCheck.errors" :key="i">{{ error }}</li>
            </ul>
          </el-alert>
        </div>
        <div style="margin-top: 20px;">
          <el-button type="primary" @click="detectEnv" :loading="detecting">
            {{ detecting ? '检测中...' : '重新检测' }}
          </el-button>
          <el-button type="success" @click="nextStep" :disabled="!envCheck.passed" style="margin-left: 10px;">
            下一步
          </el-button>
        </div>
      </div>

      <div v-if="currentStep === 1" class="step-content">
        <h3>下载并安装 OpenClaw</h3>
        <el-form :model="installForm" label-width="120px">
          <el-form-item label="安装方式">
            <el-radio-group v-model="installForm.method">
              <el-radio-button label="npm">npm 全局安装</el-radio-button>
              <el-radio-button label="binary">下载二进制</el-radio-button>
            </el-radio-group>
          </el-form-item>
          <el-form-item label="安装路径" v-if="installForm.method === 'binary'">
            <el-input v-model="installForm.path" placeholder="/usr/local/bin/openclaw" />
          </el-form-item>
          <el-form-item label="版本">
            <el-select v-model="installForm.version" placeholder="选择版本">
              <el-option label="最新稳定版" value="latest" />
              <el-option label=" nightly" value="nightly" />
            </el-select>
          </el-form-item>
        </el-form>
        <el-alert title="安装过程可能需要几分钟，请耐心等待" type="info" :closable="false" style="margin-bottom: 20px;" />
        <div v-if="installLogs" class="logs-container">
          <pre>{{ installLogs }}</pre>
        </div>
        <div style="margin-top: 20px;">
          <el-button @click="prevStep">上一步</el-button>
          <el-button type="primary" @click="startInstall" :loading="installing">
            {{ installing ? '安装中...' : '开始安装' }}
          </el-button>
        </div>
      </div>

      <div v-if="currentStep === 2" class="step-content">
        <h3>初始化配置</h3>
        <el-form :model="configForm" label-width="120px">
          <el-form-item label="Gateway 端口">
            <el-input-number v-model="configForm.port" :min="1024" :max="65535" />
          </el-form-item>
          <el-form-item label="Admin Token">
            <el-input v-model="configForm.adminToken" placeholder="自动生成" show-password>
              <template #append>
                <el-button @click="generateToken">生成</el-button>
              </template>
            </el-input>
          </el-form-item>
          <el-form-item label="默认模型">
            <el-select v-model="configForm.defaultModel" placeholder="选择默认模型">
              <el-option label="Step-3.5-Flash" value="stepfun-ai/Step-3.5-Flash" />
              <el-option label="GPT-4" value="openai/gpt-4" />
              <el-option label="Claude 3" value="anthropic/claude-3-opus" />
            </el-select>
          </el-form-item>
        </el-form>
        <div style="margin-top: 20px;">
          <el-button @click="prevStep">上一步</el-button>
          <el-button type="primary" @click="saveConfig" :loading="saving">
            {{ saving ? '保存中...' : '保存配置' }}
          </el-button>
        </div>
      </div>

      <div v-if="currentStep === 3" class="step-content">
        <h3>启动 OpenClaw 服务</h3>
        <el-alert title="服务启动中..." type="info" :closable="false" style="margin-bottom: 20px;" />
        <div v-if="startLogs" class="logs-container">
          <pre>{{ startLogs }}</pre>
        </div>
        <div style="margin-top: 20px;">
          <el-button @click="prevStep">上一步</el-button>
          <el-button type="primary" @click="startService" :loading="starting" :disabled="starting">
            {{ starting ? '启动中...' : '启动服务' }}
          </el-button>
        </div>
      </div>

      <div v-if="currentStep === 4" class="step-content">
        <el-result icon="success" title="安装成功" sub-title="OpenClaw 已成功安装并启动">
          <template #extra>
            <el-button type="primary" @click="goToDashboard">前往仪表盘</el-button>
            <el-button @click="restartInstall">重新安装</el-button>
          </template>
        </el-result>
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { installOpenClaw } from '@/api/config'

const router = useRouter()

const currentStep = ref(0)
const detecting = ref(false)
const installing = ref(false)
const saving = ref(false)
const starting = ref(false)

const envInfo = ref({})
const envCheck = ref({ passed: false, errors: [] })
const installForm = ref({
  method: 'npm',
  path: '/usr/local/bin/openclaw',
  version: 'latest'
})
const configForm = ref({
  port: 18789,
  adminToken: '',
  defaultModel: 'stepfun-ai/Step-3.5-Flash'
})
const installLogs = ref('')
const startLogs = ref('')

const statusType = computed(() => {
  switch (currentStep.value) {
    case 0: return 'info'
    case 1: return 'warning'
    case 2: return 'warning'
    case 3: return 'warning'
    case 4: return 'success'
    default: return 'info'
  }
})

const statusText = computed(() => {
  switch (currentStep.value) {
    case 0: return '环境检测'
    case 1: return '安装中'
    case 2: return '配置中'
    case 3: return '启动中'
    case 4: return '完成'
    default: return ''
  }
})

async function detectEnv() {
  detecting.value = true
  try {
    const response = await fetch('/api/system/env')
    const data = await response.json()
    envInfo.value = data.info
    envCheck.value = data.check
    if (data.check.passed) {
      ElMessage.success('环境检测通过')
    } else {
      ElMessage.warning('环境存在一些问题')
    }
  } catch (error) {
    ElMessage.error('环境检测失败: ' + error.message)
  } finally {
    detecting.value = false
  }
}

function nextStep() {
  if (envCheck.value.passed) {
    currentStep.value++
  }
}

function prevStep() {
  currentStep.value--
}

async function startInstall() {
  installing.value = true
  installLogs.value = ''
  try {
    const response = await installOpenClaw(installForm.value)
    // 这里应该使用流式响应或轮询获取日志
    installLogs.value = '安装完成（模拟）'
    currentStep.value++
    ElMessage.success('安装完成')
  } catch (error) {
    ElMessage.error('安装失败: ' + error.message)
  } finally {
    installing.value = false
  }
}

function generateToken() {
  const token = Math.random().toString(36).substring(2) + Date.now().toString(36)
  configForm.value.adminToken = token
}

async function saveConfig() {
  saving.value = true
  try {
    await fetch('/api/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(configForm.value)
    })
    ElMessage.success('配置已保存')
    currentStep.value++
  } catch (error) {
    ElMessage.error('保存失败: ' + error.message)
  } finally {
    saving.value = false
  }
}

async function startService() {
  starting.value = true
  try {
    await fetch('/api/openclaw/start', { method: 'POST' })
    startLogs.value = '服务启动成功'
    setTimeout(() => {
      currentStep.value++
    }, 1500)
    ElMessage.success('服务已启动')
  } catch (error) {
    ElMessage.error('启动失败: ' + error.message)
  } finally {
    starting.value = false
  }
}

function goToDashboard() {
  router.push('/dashboard')
}

function restartInstall() {
  currentStep.value = 0
  installLogs.value = ''
  startLogs.value = ''
}

onMounted(() => {
  detectEnv()
})
</script>

<style scoped>
.install-container {
  max-width: 900px;
  margin: 0 auto;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.step-content {
  min-height: 300px;
}

.logs-container {
  background: #1e1e1e;
  color: #d4d4d4;
  padding: 15px;
  border-radius: 6px;
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 12px;
  max-height: 300px;
  overflow-y: auto;
}

.logs-container pre {
  margin: 0;
  white-space: pre-wrap;
}
</style>