import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  timeout: 30000
})

export async function getStats() {
  const response = await api.get('/stats')
  return response.data
}

export async function getUsageChart(params) {
  const response = await api.get('/stats/chart', { params })
  return response.data
}

export async function getSessions(params) {
  const response = await api.get('/sessions', { params })
  return response.data
}

export async function getSessionDetail(sessionId) {
  const response = await api.get(`/sessions/${sessionId}`)
  return response.data
}

export async function endSession(sessionId) {
  const response = await api.post(`/sessions/${sessionId}/end`)
  return response.data
}