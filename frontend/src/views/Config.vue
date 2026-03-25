<template>
  <div class="config-container">
    <el-card shadow="never">
      <template #header>
        <span>配置管理</span>
        <el-button type="primary" size="small" @click="saveAll" :loading="saving" style="float: right;">
          保存所有更改
        </el-button>
      </template>

      <el-tabs v-model="activeTab">
        <el-tab-pane label="Gateway 设置" name="gateway">
          <el-form :model="gatewayConfig" label-width="200px">
            <el-form-item label="Gateway URL">
              <el-input v-model="gatewayConfig.gatewayUrl" placeholder="ws://127.0.0.1:18789">
                <template #append>
                  <el-button @click="testConnection" :loading="testing">测试连接</el-button>
                </template>
              </el-input>
            </el-form-item>
            <el-form-item label="Admin Token">
              <el-input v-model="gatewayConfig.adminToken" type="password" show-password />
            </el-form-item>
            <el-form-item label="自动重连">
              <el-switch v-model="gatewayConfig.autoReconnect" />
            </el-form-item>
          </el-form>
        </el-tab-pane>

        <el-tab-pane label="模型配置" name="models">
          <div style="margin-bottom: 20px;">
            <el-button type="primary" @click="addModel">添加模型</el-button>
          </div>
          <el-table :data="models" border>
            <el-table-column prop="name" label="模型名称" width="250" />
            <el-table-column prop="provider" label="提供商" width="150">
              <template #default="scope">
                <el-select v-model="scope.row.provider" placeholder="选择提供商" @change="onProviderChange(scope.row)">
                  <el-option label="OpenAI" value="openai" />
                  <el-option label="Anthropic" value="anthropic" />
                  <el-option label="StepFun" value="stepfun" />
                  <el-option label="Azure OpenAI" value="azure" />
                  <el-option label="Google" value="google" />
                  <el-option label="自定义" value="custom" />
                </el-select>
              </template>
            </el-table-column>
            <el-table-column prop="apiKey" label="API Key">
              <template #default="scope">
                <el-input v-model="scope.row.apiKey" type="password" show-password />
              </template>
            </el-table-column>
            <el-table-column prop="baseUrl" label="Base URL">
              <template #default="scope">
                <el-input v-model="scope.row.baseUrl" placeholder="https://api.openai.com/v1" />
              </template>
            </el-table-column>
            <el-table-column label="操作" width="120">
              <template #default="scope">
                <el-button type="danger" size="small" @click="removeModel(scope.$index)">删除</el-button>
              </template>
            </el-table-column>
          </el-table>
          <div style="margin-top: 10px; color: #666; font-size: 12px;">
            <p><strong>提供商预设：</strong></p>
            <ul>
              <li>OpenAI: https://api.openai.com/v1</li>
              <li>Anthropic: https://api.anthropic.com</li>
              <li>StepFun: https://api.stepfun.com</li>
              <li>Azure OpenAI: https://YOUR_RESOURCE_NAME.openai.azure.com</li>
              <li>自定义: 自行填写 API 地址</li>
            </ul>
          </div>
        </el-tab-pane>

        <el-tab-pane label="频道设置" name="channels">
          <div style="margin-bottom: 20px;">
            <el-button type="primary" @click="addChannel">添加频道</el-button>
          </div>
          <el-table :data="channels" border>
            <el-table-column prop="type" label="类型" width="150">
              <template #default="scope">
                <el-select v-model="scope.row.type" placeholder="选择类型">
                  <el-option label="Telegram" value="telegram" />
                  <el-option label="Discord" value="discord" />
                  <el-option label="Slack" value="slack" />
                  <el-option label="WhatsApp" value="whatsapp" />
                  <el-option label="Signal" value="signal" />
                  <el-option label="IRC" value="irc" />
                  <el-option label="Google Chat" value="googlechat" />
                  <el-option label="LINE" value="line" />
                  <el-option label="WeChat" value="wechat" />
                  <el-option label="KakaoTalk" value="kakaotalk" />
                  <el-option label="自定义" value="custom" />
                </el-select>
              </template>
            </el-table-column>
            <el-table-column prop="enabled" label="启用" width="100">
              <template #default="scope">
                <el-switch v-model="scope.row.enabled" />
              </template>
            </el-table-column>
            <el-table-column prop="config" label="配置">
              <template #default="scope">
                <el-form :model="scope.row.config" size="small">
                  <div v-for="(value, key) in scope.row.config" :key="key" style="margin-bottom: 5px;">
                    <el-input
                      v-model="scope.row.config[key]"
                      :placeholder="getChannelConfigPlaceholder(scope.row.type, key)"
                      style="width: 100%;"
                    />
                  </div>
                </el-form>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="120">
              <template #default="scope">
                <el-button type="danger" size="small" @click="removeChannel(scope.$index)">删除</el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-tab-pane>

        <el-tab-pane label="系统设置" name="system">
          <el-form :model="systemConfig" label-width="200px">
            <el-form-item label="OpenClaw 路径">
              <el-input v-model="systemConfig.openclawPath" />
              <el-button @click="browsePath" style="margin-left: 10px;">浏览</el-button>
            </el-form-item>
            <el-form-item label="最大并发会话">
              <el-input-number v-model="systemConfig.maxSessions" :min="1" :max="100" />
            </el-form-item>
            <el-form-item label="会话超时(分钟)">
              <el-input-number v-model="systemConfig.sessionTimeout" :min="5" :max="1440" />
            </el-form-item>
            <el-form-item label="启用备份">
              <el-switch v-model="systemConfig.backupEnabled" />
            </el-form-item>
            <el-form-item label="备份路径" v-if="systemConfig.backupEnabled">
              <el-input v-model="systemConfig.backupPath" />
            </el-form-item>
            <el-form-item label="日志级别">
              <el-select v-model="systemConfig.logLevel">
                <el-option label="DEBUG" value="debug" />
                <el-option label="INFO" value="info" />
                <el-option label="WARN" value="warn" />
                <el-option label="ERROR" value="error" />
              </el-select>
            </el-form-item>
          </el-form>
        </el-tab-pane>
      </el-tabs>
    </el-card>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useConfigStore } from '@/stores/config'

const configStore = useConfigStore()
const { config, updateConfig, loadConfig } = configStore()

const activeTab = ref('gateway')
const saving = ref(false)
const testing = ref(false)

const gatewayConfig = ref({
  gatewayUrl: '',
  adminToken: '',
  autoReconnect: true
})

const models = ref([])
const channels = ref([])
const systemConfig = ref({
  openclawPath: '/usr/local/bin/openclaw',
  maxSessions: 10,
  sessionTimeout: 60,
  backupEnabled: true,
  backupPath: './backups',
  logLevel: 'info'
})

// 频道配置模板
const channelConfigTemplates = {
  telegram: { token: '', chatId: '' },
  discord: { token: '', channelId: '' },
  slack: { token: '', channelId: '' },
  whatsapp: { token: '', phoneId: '' },
  signal: { phoneNumber: '', pin: '' },
  irc: { server: '', port: '6667', nick: '', channels: '' },
  googlechat: { webhookUrl: '' },
  line: { accessToken: '', userId: '' },
  wechat: { token: '', encodingAESKey: '' },
  kakaotalk: { token: '', channelId: '' },
  custom: {}
}

onMounted(() => {
  loadConfigData()
})

async function loadConfigData() {
  await loadConfig()
  const c = config.value
  gatewayConfig.value = {
    gatewayUrl: c.gatewayUrl,
    adminToken: c.adminToken,
    autoReconnect: true
  }
  systemConfig.value = {
    openclawPath: c.openclawPath,
    maxSessions: 10,
    sessionTimeout: 60,
    backupEnabled: c.backupEnabled,
    backupPath: c.backupPath,
    logLevel: 'info'
  }
  models.value = c.models || []

  // 加载频道配置
  if (c.channels && Array.isArray(c.channels)) {
    channels.value = c.channels
  } else {
    channels.value = []
  }
}

function addModel() {
  models.value.push({
    name: '',
    provider: 'openai',
    apiKey: '',
    baseUrl: 'https://api.openai.com/v1'
  })
}

function removeModel(index) {
  models.value.splice(index, 1)
}

function onProviderChange(model) {
  const providerUrls = {
    openai: 'https://api.openai.com/v1',
    anthropic: 'https://api.anthropic.com',
    stepfun: 'https://api.stepfun.com',
    azure: '',
    google: 'https://generativelanguage.googleapis.com',
    custom: ''
  }
  model.baseUrl = providerUrls[model.provider] || ''
}

function addChannel() {
  channels.value.push({
    type: 'telegram',
    enabled: true,
    config: { ...channelConfigTemplates.telegram }
  })
}

function removeChannel(index) {
  channels.value.splice(index, 1)
}

function getChannelConfigPlaceholder(type, key) {
  const placeholders = {
    telegram: { token: 'Bot Token', chatId: 'Chat ID' },
    discord: { token: 'Bot Token', channelId: 'Channel ID' },
    slack: { token: 'Bot Token', channelId: 'Channel ID' },
    whatsapp: { token: 'Phone ID Token', phoneId: 'Phone ID' },
    signal: { phoneNumber: 'Phone Number', pin: 'PIN (optional)' },
    irc: { server: 'IRC Server', port: 'Port', nick: 'Nickname', channels: 'Channels (comma-separated)' },
    googlechat: { webhookUrl: 'Webhook URL' },
    line: { accessToken: 'Channel Access Token', userId: 'User ID' },
    wechat: { token: 'Token', encodingAESKey: 'Encoding AES Key' },
    kakaotalk: { token: 'Bot Token', channelId: 'Channel ID' },
    custom: {}
  }
  return placeholders[type]?.[key] || key
}

async function testConnection() {
  testing.value = true
  try {
    await fetch('/api/config/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(gatewayConfig.value)
    })
    ElMessage.success('连接成功')
  } catch (error) {
    ElMessage.error('连接失败: ' + error.message)
  } finally {
    testing.value = false
  }
}

async function saveAll() {
  saving.value = true
  try {
    await updateConfig({
      gatewayUrl: gatewayConfig.value.gatewayUrl,
      adminToken: gatewayConfig.value.adminToken,
      models: models.value,
      channels: channels.value,
      ...systemConfig.value
    })
    ElMessage.success('配置已保存')
  } catch (error) {
    ElMessage.error('保存失败: ' + error.message)
  } finally {
    saving.value = false
  }
}

function browsePath() {
  ElMessage.info('请在输入框中手动输入路径')
}
</script>

<style scoped>
.config-container {
  max-width: 1200px;
  margin: 0 auto;
}
</style>