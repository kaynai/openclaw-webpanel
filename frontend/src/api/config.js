import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
})

export async function getConfig() {
  const response = await api.get('/config')
  return response.data
}

export async function saveConfig(config) {
  const response = await api.post('/config', config)
  return response.data
}

export async function testConnection() {
  const response = await api.post('/config/test')
  return response.data
}

export async function getOpenClawStatus() {
  const response = await api.get('/openclaw/status')
  return response.data
}

export async function installOpenClaw(options) {
  const response = await api.post('/openclaw/install', options)
  return response.data
}

export async function startOpenClaw() {
  const response = await api.post('/openclaw/start')
  return response.data
}

export async function stopOpenClaw() {
  const response = await api.post('/openclaw/stop')
  return response.data
}

export async function restartOpenClaw() {
  const response = await api.post('/openclaw/restart')
  return response.data
}