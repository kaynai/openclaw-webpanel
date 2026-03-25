<template>
  <div class="plugins-container">
    <el-card shadow="never">
      <template #header>
        <div class="card-header">
          <span>插件管理</span>
          <div>
            <el-button type="primary" size="small" @click="showInstallDialog">
              <el-icon><Plus /></el-icon> 安装插件
            </el-button>
            <el-button size="small" @click="refresh" :loading="loading">
              <el-icon><Refresh /></el-icon>
            </el-button>
          </div>
        </div>
      </template>

      <el-table :data="plugins" stripe v-loading="loading">
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column prop="name" label="名称" width="200" />
        <el-table-column prop="version" label="版本" width="100" />
        <el-table-column prop="description" label="描述" />
        <el-table-column prop="author" label="作者" width="150" />
        <el-table-column prop="enabled" label="启用" width="100">
          <template #default="scope">
            <el-switch v-model="scope.row.enabled" @change="togglePlugin(scope.row)" />
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200">
          <template #default="scope">
            <el-button size="small" @click="viewDetails(scope.row)">详情</el-button>
            <el-button size="small" type="danger" @click="uninstallPlugin(scope.row)">卸载</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 安装插件对话框 -->
    <el-dialog v-model="installVisible" title="安装插件" width="600px">
      <el-form :model="installForm" label-width="120px">
        <el-form-item label="插件来源">
          <el-radio-group v-model="installForm.source">
            <el-radio-button label="github">GitHub</el-radio-button>
            <el-radio-button label="url">URL</el-radio-button>
            <el-radio-button label="local">本地文件</el-radio-button>
          </el-radio-group>
        </el-form-item>

        <el-form-item label="GitHub 仓库" v-if="installForm.source === 'github'">
          <el-input v-model="installForm.repo" placeholder="username/repo" />
        </el-form-item>

        <el-form-item label="下载 URL" v-if="installForm.source === 'url'">
          <el-input v-model="installForm.url" placeholder="https://..." />
        </el-form-item>

        <el-form-item label="本地文件" v-if="installForm.source === 'local'">
          <el-upload
            ref="uploadRef"
            :auto-upload="false"
            :limit="1"
            :on-change="handleFileChange"
          >
            <template #trigger>
              <el-button type="primary">选择文件</el-button>
            </template>
            <div v-if="installForm.file" style="margin-top: 10px;">
              已选择: {{ installForm.file.name }}
            </div>
          </el-upload>
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="installVisible = false">取消</el-button>
        <el-button type="primary" @click="installPlugin" :loading="installing">
          安装
        </el-button>
      </template>
    </el-dialog>

    <!-- 插件详情对话框 -->
    <el-dialog v-model="detailVisible" title="插件详情" width="800px">
      <div v-if="currentPlugin">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="ID">{{ currentPlugin.id }}</el-descriptions-item>
          <el-descriptions-item label="名称">{{ currentPlugin.name }}</el-descriptions-item>
          <el-descriptions-item label="版本">{{ currentPlugin.version }}</el-descriptions-item>
          <el-descriptions-item label="作者">{{ currentPlugin.author }}</el-descriptions-item>
          <el-descriptions-item label="状态">
            <el-tag :type="currentPlugin.enabled ? 'success' : 'info'">
              {{ currentPlugin.enabled ? '已启用' : '已禁用' }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="安装时间">
            {{ formatDate(currentPlugin.installedAt) }}
          </el-descriptions-item>
        </el-descriptions>

        <div style="margin-top: 20px;">
          <h4>描述</h4>
          <p>{{ currentPlugin.description }}</p>
        </div>

        <div style="margin-top: 20px;">
          <h4>配置</h4>
          <el-form v-if="currentPlugin.config" :model="currentPlugin.config" label-width="120px">
            <el-form-item v-for="(value, key) in currentPlugin.config" :key="key" :label="key">
              <el-input v-model="currentPlugin.config[key]" />
            </el-form-item>
          </el-form>
          <p v-else>该插件没有可配置项</p>
        </div>

        <div style="margin-top: 20px;">
          <h4>文件列表</h4>
          <ul>
            <li v-for="file in currentPlugin.files" :key="file">{{ file }}</li>
          </ul>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getPlugins, installPlugin as installPluginApi, uninstallPlugin as uninstallPluginApi, togglePlugin as togglePluginApi } from '@/api/plugins'

const plugins = ref([])
const loading = ref(false)
const installVisible = ref(false)
const detailVisible = ref(false)
const installing = ref(false)
const currentPlugin = ref(null)
const uploadRef = ref(null)

const installForm = ref({
  source: 'github',
  repo: '',
  url: '',
  file: null
})

async function loadPlugins() {
  loading.value = true
  try {
    const response = await getPlugins()
    plugins.value = response.plugins
  } catch (error) {
    ElMessage.error('加载插件列表失败: ' + error.message)
  } finally {
    loading.value = false
  }
}

function showInstallDialog() {
  installVisible.value = true
  installForm.value = { source: 'github', repo: '', url: '', file: null }
  if (uploadRef.value) uploadRef.value.clearFiles()
}

function handleFileChange(file) {
  installForm.value.file = file.raw
}

async function installPlugin() {
  installing.value = true
  try {
    const payload = { source: installForm.value.source }
    if (installForm.value.source === 'github') {
      payload.repo = installForm.value.repo
    } else if (installForm.value.source === 'url') {
      payload.url = installForm.value.url
    } else if (installForm.value.source === 'local' && installForm.value.file) {
      // 需要转换为 base64 或通过 FormData 上传
      payload.file = await fileToBase64(installForm.value.file)
    }
    await installPluginApi(payload)
    ElMessage.success('插件安装成功')
    installVisible.value = false
    await loadPlugins()
  } catch (error) {
    ElMessage.error('安装失败: ' + error.message)
  } finally {
    installing.value = false
  }
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.readAsDataURL(file)
    reader.onload = () => resolve(reader.result)
    reader.onerror = error => reject(error)
  })
}

async function uninstallPlugin(plugin) {
  try {
    await ElMessageBox.confirm(`确定要卸载插件 "${plugin.name}" 吗？`, '警告', {
      type: 'warning'
    })
    await uninstallPluginApi(plugin.id)
    ElMessage.success('插件已卸载')
    await loadPlugins()
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('卸载失败: ' + error.message)
    }
  }
}

async function togglePlugin(plugin) {
  try {
    await togglePluginApi(plugin.id, { enabled: plugin.enabled })
    ElMessage.success(plugin.enabled ? '插件已启用' : '插件已禁用')
  } catch (error) {
    plugin.enabled = !plugin.enabled
    ElMessage.error('操作失败: ' + error.message)
  }
}

function viewDetails(plugin) {
  currentPlugin.value = plugin
  detailVisible.value = true
}

function refresh() {
  loadPlugins()
}

const formatDate = (dateStr) => {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleString('zh-CN')
}

onMounted(() => {
  loadPlugins()
})
</script>

<style scoped>
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
</style>