import { useState } from 'react'
import { ChevronDown, ChevronRight, ShieldCheck, ShieldX, ShieldAlert, ExternalLink } from 'lucide-react'

function StatusPill({ status }) {
  const cfg = {
    Approved: 'bg-leaf-600/20 text-leaf-400 border-leaf-400/40',
    Blocked:  'bg-red-600/20 text-red-400 border-red-400/40',
    Modified: 'bg-yellow-600/20 text-yellow-400 border-yellow-400/40',
  }
  const Icon = status === 'Approved' ? ShieldCheck : status === 'Blocked' ? ShieldX : ShieldAlert
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-bold ${cfg[status] || cfg.Modified}`}>
      <Icon className="w-3 h-3" />
      {status}
    </span>
  )
}

function RiskPill({ level }) {
  const cfg = {
    Low:      'text-leaf-400',
    Medium:   'text-yellow-400',
    High:     'text-orange-400',
    Critical: 'text-red-400',
  }
  return <span className={`text-xs font-bold ${cfg[level] || 'text-white'}`}>{level}</span>
}

function LogRow({ log }) {
  const [expanded, setExpanded] = useState(false)
  const input = log.farmer_input || {}

  return (
    <>
      <tr
        className="border-b border-white/10 hover:bg-white/5 cursor-pointer transition-all"
        onClick={() => setExpanded(e => !e)}
      >
        <td className="px-4 py-3">
          {expanded
            ? <ChevronDown className="w-4 h-4 text-ocean-300" />
            : <ChevronRight className="w-4 h-4 text-ocean-300" />}
        </td>
        <td className="px-4 py-3 font-mono text-ocean-200 text-xs">
          {log.session_id?.slice(0, 8)}…
        </td>
        <td className="px-4 py-3 text-white text-sm">
          {input.farmer_name || '—'}
        </td>
        <td className="px-4 py-3 text-ocean-100 text-sm">
          {input.crop_type || '—'}
        </td>
        <td className="px-4 py-3">
          <RiskPill level={log.risk_level} />
        </td>
        <td className="px-4 py-3">
          <StatusPill status={log.compliance_status} />
        </td>
        <td className="px-4 py-3 text-ocean-200 text-xs">
          {log.confidence_score != null
            ? `${Math.round(log.confidence_score * 100)}%`
            : '—'}
        </td>
        <td className="px-4 py-3 text-ocean-300 text-xs">
          {log.timestamp ? new Date(log.timestamp).toLocaleString() : '—'}
        </td>
      </tr>

      {expanded && (
        <tr className="bg-white/5 border-b border-white/10">
          <td colSpan={8} className="px-6 py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              {/* Query */}
              <div>
                <p className="text-ocean-300 text-xs uppercase tracking-wider mb-1">Farmer Query</p>
                <p className="text-ocean-100 leading-relaxed">{input.farmer_query || '—'}</p>
              </div>
              {/* Recommendation */}
              <div>
                <p className="text-ocean-300 text-xs uppercase tracking-wider mb-1">Final Recommendation</p>
                <p className="text-ocean-100 leading-relaxed line-clamp-4">
                  {log.final_recommendation?.replace('__META__{}', '') || '—'}
                </p>
              </div>
              {/* Violations */}
              {log.violations?.length > 0 && (
                <div>
                  <p className="text-red-400 text-xs uppercase tracking-wider mb-1">Violations</p>
                  <ul className="space-y-1">
                    {log.violations.map((v, i) => (
                      <li key={i} className="text-red-300 text-xs flex items-start gap-1">
                        <span className="text-red-400 mt-0.5">•</span>{v}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {/* Rules triggered */}
              {log.rules_triggered?.length > 0 && (
                <div>
                  <p className="text-yellow-400 text-xs uppercase tracking-wider mb-1">Rules Triggered</p>
                  <div className="flex flex-wrap gap-1">
                    {log.rules_triggered.slice(0, 5).map((r, i) => (
                      <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-yellow-500/10 text-yellow-300 border border-yellow-400/30">
                        {r.slice(0, 60)}{r.length > 60 ? '…' : ''}
                      </span>
                    ))}
                    {log.rules_triggered.length > 5 && (
                      <span className="text-[10px] text-ocean-300">+{log.rules_triggered.length - 5} more</span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

export default function AuditTable({ logs }) {
  if (!logs || logs.length === 0) {
    return (
      <div className="glass rounded-2xl p-12 text-center text-ocean-200">
        <p className="text-5xl mb-4">🌾</p>
        <p className="font-medium">No audit logs yet.</p>
        <p className="text-sm mt-1">Submit an advisory request to see logs here.</p>
      </div>
    )
  }

  return (
    <div className="glass rounded-2xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left min-w-[800px]">
          <thead>
            <tr className="border-b border-white/20 bg-white/5">
              <th className="px-4 py-3 w-8" />
              {['Session', 'Farmer', 'Crop', 'Risk', 'Compliance', 'Confidence', 'Time'].map(h => (
                <th key={h} className="px-4 py-3 text-ocean-200 text-xs uppercase tracking-wider font-medium">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {logs.map((log, i) => <LogRow key={log.session_id || i} log={log} />)}
          </tbody>
        </table>
      </div>
    </div>
  )
}
