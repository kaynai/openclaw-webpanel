import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  timeout: 30000
})

export async function getPlugins() {
  const response = await api.get('/plugins')
  return response.data
}

export async function installPlugin(pluginData) {
  const response = await api.post('/plugins/install', pluginData)
  return response.data
}

export async function uninstallPlugin(pluginId) {
  const response = await api.post(`/plugins/${pluginId}/uninstall`)
  return response.data
}

export async function togglePlugin(pluginId, enabled) {
  const response = await api.post(`/plugins/${pluginId}/toggle`, { enabled })
  return response.data
}