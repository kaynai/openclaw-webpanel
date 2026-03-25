<template>
  <div class="sessions-container">
    <el-card shadow="never">
      <template #header>
        <div class="card-header">
          <span>会话管理</span>
          <div>
            <el-button type="primary" size="small" @click="refresh" :loading="loading">
              <el-icon><Refresh /></el-icon>
            </el-button>
          </div>
        </div>
      </template>

      <el-table :data="sessions" stripe v-loading="loading">
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column prop="model" label="模型" width="200" />
        <el-table-column prop="tokens" label="Tokens" width="120">
          <template #default="scope">
            {{ formatNumber(scope.row.tokens) }}
          </template>
        </el-table-column>
        <el-table-column prop="messages" label="消息数" width="100">
          <template #default="scope">
            {{ scope.row.messageCount || 0 }}
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" label="创建时间">
          <template #default="scope">
            {{ formatDate(scope.row.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column prop="updatedAt" label="最后活动">
          <template #default="scope">
            {{ formatDate(scope.row.updatedAt) }}
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="100">
          <template #default="scope">
            <el-tag :type="scope.row.status === 'active' ? 'success' : 'info'">
              {{ scope.row.status === 'active' ? '活跃' : '已结束' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="150">
          <template #default="scope">
            <el-button size="small" @click="viewDetail(scope.row)">详情</el-button>
            <el-button size="small" type="danger" @click="endSession(scope.row)" :disabled="scope.row.status !== 'active'">
              结束
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 会话详情对话框 -->
    <el-dialog v-model="detailVisible" title="会话详情" width="80%">
      <div v-if="currentSession">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="ID">{{ currentSession.id }}</el-descriptions-item>
          <el-descriptions-item label="模型">{{ currentSession.model }}</el-descriptions-item>
          <el-descriptions-item label="Tokens">{{ currentSession.tokens }}</el-descriptions-item>
          <el-descriptions-item label="状态">{{ currentSession.status }}</el-descriptions-item>
          <el-descriptions-item label="创建时间">{{ formatDate(currentSession.createdAt) }}</el-descriptions-item>
          <el-descriptions-item label="最后活动">{{ formatDate(currentSession.updatedAt) }}</el-descriptions-item>
        </el-descriptions>

        <h4 style="margin-top: 20px;">消息历史</h4>
        <div class="messages-container">
          <div v-for="(msg, index) in currentSession.messages" :key="index" class="message-item">
            <div class="message-role" :class="msg.role">
              {{ msg.role === 'user' ? '用户' : '助手' }}
            </div>
            <div class="message-content">{{ msg.content }}</div>
            <div class="message-time">{{ formatDate(msg.timestamp) }}</div>
          </div>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useStatsStore } from '@/stores/stats'
import { getSessions, getSessionDetail, endSession as endSessionApi } from '@/api/stats'

const statsStore = useStatsStore()
const { bySession, fetchStats } = statsStore

const sessions = ref([])
const loading = ref(false)
const detailVisible = ref(false)
const currentSession = ref(null)

async function loadSessions() {
  loading.value = true
  try {
    const response = await getSessions({ limit: 50 })
    sessions.value = response.sessions
  } catch (error) {
    ElMessage.error('加载失败: ' + error.message)
  } finally {
    loading.value = false
  }
}

async function refresh() {
  await loadSessions()
  await fetchStats()
}

async function viewDetail(session) {
  try {
    const data = await getSessionDetail(session.id)
    currentSession.value = data
    detailVisible.value = true
  } catch (error) {
    ElMessage.error('加载详情失败: ' + error.message)
  }
}

async function endSession(session) {
  try {
    await ElMessageBox.confirm('确定要结束这个会话吗？', '警告', {
      type: 'warning'
    })
    await endSessionApi(session.id)
    ElMessage.success('会话已结束')
    await refresh()
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('操作失败: ' + error.message)
    }
  }
}

const formatNumber = (num) => {
  if (num >= 1000000) return (num / 1000000).toFixed(2) + 'M'
  if (num >= 1000) return (num / 1000).toFixed(2) + 'K'
  return num.toLocaleString()
}

const formatDate = (dateStr) => {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleString('zh-CN')
}

onMounted(() => {
  loadSessions()
})
</script>

<style scoped>
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.messages-container {
  max-height: 400px;
  overflow-y: auto;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  padding: 10px;
}

.message-item {
  margin-bottom: 15px;
  padding: 10px;
  border-radius: 6px;
  background: #f5f7fa;
}

.message-role {
  font-weight: bold;
  margin-bottom: 5px;
  padding: 2px 8px;
  border-radius: 4px;
  display: inline-block;
}

.message-role.user {
  background: #409eff;
  color: white;
}

.message-role.assistant {
  background: #67c23a;
  color: white;
}

.message-content {
  margin: 5px 0;
  white-space: pre-wrap;
}

.message-time {
  font-size: 12px;
  color: #909399;
}
</style>