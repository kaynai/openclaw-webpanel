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
            <el-table-column prop="provider" label="提供商" width="150" />
            <el-table-column prop="apiKey" label="API Key">
              <template #default="scope">
                <el-input v-model="scope.row.apiKey" type="password" show-password />
              </template>
            </el-table-column>
            <el-table-column prop="baseUrl" label="Base URL" />
            <el-table-column label="操作" width="120">
              <template #default="scope">
                <el-button type="danger" size="small" @click="removeModel(scope.$index)">删除</el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-tab-pane>

        <el-tab-pane label="频道设置" name="channels">
          <el-table :data="channels" border>
            <el-table-column prop="type" label="类型" width="150">
              <template #default="scope">
                <el-tag>{{ scope.row.type }}</el-tag>
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
                  <div v-for="(value, key) in scope.row.config" :key="key">
                    <el-input v-model="scope.row.config[key]" :placeholder="key" style="margin-bottom: 5px;" />
                  </div>
                </el-form>
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
const { config, updateConfig, loadConfig } = configStore

const activeTab = ref('gateway')
const saving = ref(false)
const testing = ref(false)

const gatewayConfig = ref({
  gatewayUrl: '',
  adminToken: '',
  autoReconnect: true
})

const models = ref([])
const channels = ref([
  { type: 'Telegram', enabled: false, config: { token: '', chatId: '' } },
  { type: 'Discord', enabled: false, config: { token: '', channelId: '' } }
])
const systemConfig = ref({
  openclawPath: '/usr/local/bin/openclaw',
  maxSessions: 10,
  sessionTimeout: 60,
  backupEnabled: true,
  backupPath: './backups',
  logLevel: 'info'
})

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
  // 需要后端支持文件浏览器
  ElMessage.info('请在输入框中手动输入路径')
}
</script>

<style scoped>
.config-container {
  max-width: 1200px;
  margin: 0 auto;
}
</style>