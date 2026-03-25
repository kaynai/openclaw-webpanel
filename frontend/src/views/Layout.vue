<template>
  <el-container class="layout">
    <el-aside :width="isCollapse ? '64px' : '200px'">
      <div class="logo">
        <img v-if="!isCollapse" src="@/assets/logo.png" alt="OpenClaw" />
        <span v-show="!isCollapse">OpenClaw 面板</span>
      </div>
      <el-menu
        :default-active="activeMenu"
        :collapse="isCollapse"
        router
        background-color="#304156"
        text-color="#bfcbd9"
        active-text-color="#409eff"
      >
        <el-menu-item
          v-for="route in routes"
          :key="route.path"
          :index="route.path"
        >
          <el-icon><component :is="route.meta.icon" /></el-icon>
          <template #title>{{ route.meta.title }}</template>
        </el-menu-item>
      </el-menu>
    </el-aside>

    <el-container>
      <el-header>
        <div class="header-left">
          <el-button
            type="text"
            @click="isCollapse = !isCollapse"
            style="font-size: 20px; margin-right: 20px;"
          >
            <el-icon><Fold v-if="!isCollapse" /><Expand v-else /></el-icon>
          </el-button>
          <el-breadcrumb separator="/">
            <el-breadcrumb-item :to="{ path: '/' }">首页</el-breadcrumb-item>
            <el-breadcrumb-item v-if="currentRoute.meta">{{
              currentRoute.meta.title
            }}</el-breadcrumb-item>
          </el-breadcrumb>
        </div>
        <div class="header-right">
          <el-tooltip content="系统状态" placement="bottom">
            <el-button
              :type="systemStatus === 'running' ? 'success' : 'danger'"
              circle
              size="small"
              @click="showStatus = true"
            >
              <el-icon><Monitor /></el-icon>
            </el-button>
          </el-tooltip>
          <el-dropdown @command="handleCommand">
            <span class="el-dropdown-link">
              <el-avatar :size="32" style="margin-right: 8px;">A</el-avatar>
              <el-icon class="el-icon--right"><arrow-down /></el-icon>
            </span>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="profile">个人中心</el-dropdown-item>
                <el-dropdown-item command="settings">设置</el-dropdown-item>
                <el-dropdown-item divided command="logout">退出</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </el-header>

      <el-main>
        <router-view v-slot="{ Component }">
          <transition name="fade" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </el-main>

      <el-footer>
        <div class="footer">
          <span>&copy; 2024 OpenClaw Panel</span>
          <span style="margin-left: 20px;">Version 1.0.0</span>
        </div>
      </el-footer>
    </el-container>

    <!-- 系统状态对话框 -->
    <el-dialog v-model="showStatus" title="系统状态" width="500px">
      <el-descriptions :column="1" border>
        <el-descriptions-item label="服务状态">
          <el-tag :type="systemStatus === 'running' ? 'success' : 'danger'">
            {{ systemStatus === 'running' ? '运行中' : '已停止' }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="Gateway 地址">
          {{ config.gatewayUrl || '未配置' }}
        </el-descriptions-item>
        <el-descriptions-item label="运行时间">
          {{ uptime || '未知' }}
        </el-descriptions-item>
        <el-descriptions-item label="内存使用">
          {{ memoryUsage || '未知' }}
        </el-descriptions-item>
      </el-descriptions>
    </el-dialog>
  </el-container>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useConfigStore } from '@/stores/config'
import { ElMessage } from 'element-plus'
import { Monitor, Fold, Expand, ArrowDown } from '@element-plus/icons-vue'

const route = useRoute()
const router = useRouter()
const configStore = useConfigStore()

const isCollapse = ref(false)
const showStatus = ref(false)
const systemStatus = ref('stopped')
const uptime = ref('')
const memoryUsage = ref('')

const activeMenu = computed(() => route.path)

const routes = computed(() => {
  const r = router.getRoutes()
  return r.filter(route => route.meta && route.path !== '/')
})

const currentRoute = computed(() => route)

const { config } = configStore

let statusTimer = null

onMounted(() => {
  checkStatus()
  statusTimer = setInterval(checkStatus, 5000)
})

onUnmounted(() => {
  if (statusTimer) clearInterval(statusTimer)
})

async function checkStatus() {
  try {
    const response = await fetch('/api/system/info')
    if (response.ok) {
      systemStatus.value = 'running'
    } else {
      systemStatus.value = 'stopped'
    }
  } catch (error) {
    systemStatus.value = 'stopped'
  }
}

function handleCommand(command) {
  switch (command) {
    case 'profile':
      ElMessage.info('个人中心功能开发中')
      break
    case 'settings':
      ElMessage.info('设置功能开发中')
      break
    case 'logout':
      ElMessage.success('已退出')
      break
  }
}
</script>

<style scoped>
.layout {
  height: 100vh;
}

.logo {
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 10px;
  color: #fff;
  font-size: 16px;
  font-weight: bold;
}

.logo img {
  width: 32px;
  height: 32px;
  margin-right: 10px;
}

.el-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #fff;
  box-shadow: 0 1px 4px rgba(0,21,41,.08);
}

.header-left {
  display: flex;
  align-items: center;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 15px;
}

.el-dropdown-link {
  display: flex;
  align-items: center;
  cursor: pointer;
}

.el-main {
  padding: 0;
}

.el-footer {
  background: #fff;
  border-top: 1px solid #e6e6e6;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #909399;
  font-size: 12px;
}

/* 过渡动画 */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>