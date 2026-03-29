import axios from 'axios'

const API = axios.create({
  baseURL: '/api',
  timeout: 60000,
  headers: { 'Content-Type': 'application/json' },
})

// ── Advisory ──────────────────────────────────────────────────────────────

export const submitAdvisory = (payload) =>
  API.post('/advisory', payload).then(r => r.data)

export const getDemoScenario = (scenario) =>
  API.get(`/advisory/demo/${scenario}`).then(r => r.data)

// ── Audit ─────────────────────────────────────────────────────────────────

export const getAuditLogs = (params = {}) =>
  API.get('/audit/logs', { params }).then(r => r.data)

export const getAuditLogBySession = (sessionId) =>
  API.get(`/audit/logs/${sessionId}`).then(r => r.data)

export const getAuditStats = () =>
  API.get('/audit/stats').then(r => r.data)

// ── Health ────────────────────────────────────────────────────────────────

export const getHealth = () =>
  API.get('/health').then(r => r.data)

export const getRules = () =>
  API.get('/rules').then(r => r.data)
