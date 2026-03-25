import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  timeout: 30000
})

export async function getLogs(params) {
  const response = await api.get('/system/logs', { params })
  return response.data
}

export async function getSystemInfo() {
  const response = await api.get('/system/info')
  return response.data
}

export async function addLog(log) {
  const response = await api.post('/system/logs', log)
  return response.data
}