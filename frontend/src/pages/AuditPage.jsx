import { useState, useEffect, useCallback } from 'react'
import { RefreshCw, Filter, ClipboardList, Database } from 'lucide-react'
import toast from 'react-hot-toast'
import StatsCards from '../components/StatsCards'
import AuditTable from '../components/AuditTable'
import { getAuditLogs, getAuditStats } from '../services/api'

const STATUS_FILTERS = ['All', 'Approved', 'Blocked', 'Modified']

export default function AuditPage() {
  const [logs,   setLogs]   = useState([])
  const [stats,  setStats]  = useState(null)
  const [filter, setFilter] = useState('All')
  const [loading, setLoading] = useState(false)
  const [page,   setPage]   = useState(0)
  const [storage, setStorage] = useState('unknown')

  const LIMIT = 20

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const params = {
        limit: LIMIT,
        skip:  page * LIMIT,
        ...(filter !== 'All' ? { compliance_status: filter } : {}),
      }
      const [logsRes, statsRes] = await Promise.all([
        getAuditLogs(params),
        getAuditStats(),
      ])
      setLogs(logsRes.data?.logs || [])
      setStats(statsRes.data)
      setStorage(statsRes.data?.storage || 'unknown')
    } catch (err) {
      toast.error('Failed to load audit logs')
    } finally {
      setLoading(false)
    }
  }, [filter, page])

  useEffect(() => { fetchData() }, [fetchData])

  return (
    <div className="max-w-7xl mx-auto px-4">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h2 className="text-3xl font-bold text-white text-shadow flex items-center gap-3">
            <ClipboardList className="w-8 h-8 text-blue-400" />
            Audit Dashboard
          </h2>
          <p className="text-ocean-200 mt-1 flex items-center gap-2 text-sm">
            <Database className="w-4 h-4" />
            Storage: <span className={`font-medium ${storage === 'mongodb' ? 'text-leaf-400' : 'text-yellow-400'}`}>
              {storage === 'mongodb' ? 'MongoDB' : 'In-Memory Fallback'}
            </span>
            · Full immutable audit trail of all advisory sessions
          </p>
        </div>
        <button
          onClick={fetchData}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-xl glass border border-white/20 text-white text-sm hover:bg-white/10 transition-all disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Stats */}
      <StatsCards stats={stats} />

      {/* Filter */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <Filter className="w-4 h-4 text-ocean-300" />
        <span className="text-ocean-200 text-sm">Filter:</span>
        {STATUS_FILTERS.map(f => (
          <button
            key={f}
            onClick={() => { setFilter(f); setPage(0) }}
            className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-all ${
              filter === f
                ? 'bg-gold text-ocean-800 border-gold'
                : 'border-white/20 text-ocean-100 hover:border-gold/50 hover:text-white'
            }`}
          >
            {f}
          </button>
        ))}
        <span className="text-ocean-300 text-xs ml-auto">
          {logs.length} records shown
        </span>
      </div>

      {/* Table */}
      {loading ? (
        <div className="glass rounded-2xl p-12 text-center text-ocean-200">
          <div className="w-10 h-10 border-2 border-ocean-400 border-t-gold rounded-full animate-spin mx-auto mb-4" />
          <p>Loading audit logs…</p>
        </div>
      ) : (
        <AuditTable logs={logs} />
      )}

      {/* Pagination */}
      {logs.length >= LIMIT && (
        <div className="flex justify-center gap-3 mt-6">
          <button
            disabled={page === 0}
            onClick={() => setPage(p => p - 1)}
            className="px-4 py-2 rounded-lg glass border border-white/20 text-white text-sm disabled:opacity-40 hover:bg-white/10 transition-all"
          >
            ← Previous
          </button>
          <span className="px-4 py-2 text-ocean-200 text-sm">Page {page + 1}</span>
          <button
            onClick={() => setPage(p => p + 1)}
            className="px-4 py-2 rounded-lg glass border border-white/20 text-white text-sm hover:bg-white/10 transition-all"
          >
            Next →
          </button>
        </div>
      )}

      {/* Schema Info */}
      <div className="mt-8 glass rounded-2xl p-5 border border-white/10">
        <h4 className="text-white font-bold mb-3 text-sm">MongoDB Schema — audit_logs collection</h4>
        <pre className="text-ocean-200 text-xs leading-relaxed overflow-x-auto font-mono">
{`{
  "session_id":          "uuid-string",
  "timestamp":           "2024-10-15T08:23:11.000Z",
  "farmer_input":        { "crop_type": "Cotton", "soil_condition": "...", "weather": "...", "farmer_query": "..." },
  "reasoning_steps":     [{ "step_type": "DATA|RULE_CHECK|ANALYSIS|GUARDRAIL|ACTION", "label": "...", "content": "...", "triggered": false }],
  "rules_triggered":     ["BANNED PESTICIDE: endosulfan", "DOSAGE VIOLATION: urea 80kg/acre"],
  "compliance_status":   "Approved | Blocked | Modified",
  "violations":          ["..."],
  "final_recommendation": "...",
  "risk_level":          "Low | Medium | High | Critical",
  "confidence_score":    0.87,
  "processing_time_ms":  1420
}`}
        </pre>
      </div>
    </div>
  )
}
