<template>
  <div class="logs-container">
    <el-card shadow="never">
      <template #header>
        <div class="card-header">
          <span>系统日志</span>
          <div>
            <el-button size="small" @click="clearLogs">清空</el-button>
            <el-button size="small" type="primary" @click="refresh" :loading="loading">
              刷新
            </el-button>
            <el-button size="small" type="success" @click="downloadLogs">
              下载
            </el-button>
          </div>
        </div>
      </template>

      <div class="toolbar">
        <el-select v-model="logLevel" placeholder="日志级别" size="small" style="width: 120px;">
          <el-option label="全部" value="all" />
          <el-option label="DEBUG" value="debug" />
          <el-option label="INFO" value="info" />
          <el-option label="WARN" value="warn" />
          <el-option label="ERROR" value="error" />
        </el-select>
        <el-input
          v-model="searchText"
          placeholder="搜索日志..."
          size="small"
          style="width: 300px; margin-left: 10px;"
          clearable
        />
        <el-button size="small" type="primary" @click="toggleFollow" :class="{ active: follow }">
          {{ follow ? '停止跟随' : '跟随最新' }}
        </el-button>
      </div>

      <div ref="logsBox" class="logs-box" v-loading="loading">
        <div v-if="logs.length === 0" class="empty-logs">
          暂无日志
        </div>
        <div
          v-for="(log, index) in filteredLogs"
          :key="index"
          class="log-line"
          :class="`log-${log.level}`"
        >
          <span class="log-time">{{ formatTime(log.timestamp) }}</span>
          <span class="log-level" :class="`level-${log.level}`">{{ log.level }}</span>
          <span class="log-source" v-if="log.source">[{{ log.source }}]</span>
          <span class="log-message">{{ log.message }}</span>
        </div>
      </div>

      <div class="logs-footer">
        <span>共 {{ logs.length }} 条日志</span>
        <span style="margin-left: 20px;">显示 {{ filteredLogs.length }} 条</span>
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { ElMessage } from 'element-plus'
import { getLogs } from '@/api/system'

const logs = ref([])
const loading = ref(false)
const logLevel = ref('all')
const searchText = ref('')
const follow = ref(false)
const logsBox = ref(null)

const filteredLogs = computed(() => {
  let result = logs.value
  if (logLevel.value !== 'all') {
    result = result.filter(l => l.level === logLevel.value)
  }
  if (searchText.value) {
    const text = searchText.value.toLowerCase()
    result = result.filter(l => l.message.toLowerCase().includes(text))
  }
  return result
})

let pollTimer = null

async function loadLogs() {
  loading.value = true
  try {
    const response = await getLogs({ limit: 1000 })
    logs.value = response.logs
    if (follow.value) {
      await nextTick()
      logsBox.value.scrollTop = logsBox.value.scrollHeight
    }
  } catch (error) {
    ElMessage.error('加载日志失败: ' + error.message)
  } finally {
    loading.value = false
  }
}

function refresh() {
  loadLogs()
}

function clearLogs() {
  logs.value = []
  ElMessage.info('已清空显示')
}

function downloadLogs() {
  const content = logs.value.map(l => `[${l.timestamp}] [${l.level}] ${l.source || ''} ${l.message}`).join('\n')
  const blob = new Blob([content], { type: 'text/plain' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `openclaw-logs-${new Date().toISOString().slice(0,10)}.log`
  a.click()
  URL.revokeObjectURL(url)
}

function toggleFollow() {
  follow.value = !follow.value
  if (follow.value) {
    scrollToBottom()
  }
}

function scrollToBottom() {
  if (logsBox.value) {
    logsBox.value.scrollTop = logsBox.value.scrollHeight
  }
}

function formatTime(timestamp) {
  if (!timestamp) return ''
  return new Date(timestamp).toLocaleString('zh-CN')
}

watch(logs, () => {
  if (follow.value) {
    nextTick(scrollToBottom)
  }
}, { deep: true })

onMounted(() => {
  loadLogs()
  pollTimer = setInterval(loadLogs, 5000)
})

onUnmounted(() => {
  if (pollTimer) clearInterval(pollTimer)
})
</script>

<style scoped>
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.toolbar {
  margin-bottom: 15px;
  display: flex;
  align-items: center;
}

.toolbar .active {
  background-color: #409eff;
  border-color: #409eff;
  color: white;
}

.logs-box {
  height: 500px;
  overflow-y: auto;
  background: #1e1e1e;
  color: #d4d4d4;
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 12px;
  padding: 10px;
  border-radius: 4px;
}

.empty-logs {
  text-align: center;
  color: #666;
  padding: 40px;
}

.log-line {
  margin-bottom: 2px;
  padding: 2px 0;
  white-space: nowrap;
}

.log-time {
  color: #888;
  margin-right: 10px;
}

.log-level {
  font-weight: bold;
  margin-right: 10px;
  padding: 1px 4px;
  border-radius: 2px;
}

.log-level.debug { color: #888; }
.log-level.info { color: #409eff; }
.log-level.warn { color: #e6a23c; }
.log-level.error { color: #f56c6c; }

.log-source {
  color: #67c23a;
  margin-right: 10px;
}

.log-message {
  color: #d4d4d4;
}

.logs-footer {
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid #ebeef5;
  color: #909399;
  font-size: 12px;
}
</style>