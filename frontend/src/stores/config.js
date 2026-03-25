import { defineStore } from 'pinia'
import { ref } from 'vue'
import { getConfig, saveConfig } from '@/api/config'

export const useConfigStore = defineStore('config', () => {
  const config = ref({
    gatewayUrl: 'ws://127.0.0.1:18789',
    adminToken: '',
    openclawPath: '/usr/local/bin/openclaw',
    autoStart: true,
    backupEnabled: true,
    backupPath: './backups'
  })

  const isLoading = ref(false)
  const error = ref(null)

  async function loadConfig() {
    isLoading.value = true
    error.value = null
    try {
      const data = await getConfig()
      config.value = { ...config.value, ...data }
    } catch (err) {
      error.value = err.message
    } finally {
      isLoading.value = false
    }
  }

  async function updateConfig(newConfig) {
    isLoading.value = true
    error.value = null
    try {
      const data = await saveConfig({ ...config.value, ...newConfig })
      config.value = data
      return true
    } catch (err) {
      error.value = err.message
      return false
    } finally {
      isLoading.value = false
    }
  }

  return {
    config,
    isLoading,
    error,
    loadConfig,
    updateConfig
  }
})