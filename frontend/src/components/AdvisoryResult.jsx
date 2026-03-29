import { useState } from 'react'
import {
  ShieldCheck, ShieldX, ShieldAlert, AlertTriangle, CheckCircle2,
  XCircle, Info, ChevronDown, ChevronUp, ClipboardCheck, Sprout,
  Zap, BookOpen, TrendingUp
} from 'lucide-react'

// ── Sub-components ────────────────────────────────────────────────────────────

function RiskBadge({ level }) {
  const cfg = {
    Low:      { color: 'bg-leaf-600/20 text-leaf-400 border-leaf-400/40',  Icon: CheckCircle2 },
    Medium:   { color: 'bg-yellow-600/20 text-yellow-400 border-yellow-400/40', Icon: AlertTriangle },
    High:     { color: 'bg-orange-600/20 text-orange-400 border-orange-400/40', Icon: AlertTriangle },
    Critical: { color: 'bg-red-600/20 text-red-400 border-red-400/40',     Icon: XCircle },
  }
  const { color, Icon } = cfg[level] || cfg.Medium
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-bold ${color}`}>
      <Icon className="w-3.5 h-3.5" />
      {level} Risk
    </span>
  )
}

function ComplianceBadge({ status }) {
  const cfg = {
    Approved: { color: 'bg-leaf-600/20 text-leaf-400 border-leaf-400/40',  Icon: ShieldCheck, label: 'Approved' },
    Blocked:  { color: 'bg-red-600/20 text-red-400 border-red-400/40',     Icon: ShieldX,    label: 'Blocked'  },
    Modified: { color: 'bg-yellow-600/20 text-yellow-400 border-yellow-400/40', Icon: ShieldAlert, label: 'Modified' },
  }
  const { color, Icon, label } = cfg[status] || cfg.Modified
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-bold ${color}`}>
      <Icon className="w-3.5 h-3.5" />
      {label}
    </span>
  )
}

function ConfidenceBar({ score }) {
  const pct   = Math.round(score * 100)
  const color = score >= 0.75 ? 'bg-leaf-500' : score >= 0.55 ? 'bg-yellow-500' : 'bg-red-500'
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-700 ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-ocean-100 min-w-[38px] text-right">{pct}%</span>
    </div>
  )
}

const STEP_COLORS = {
  DATA:        { bg: 'bg-blue-500/20',   border: 'border-blue-400/40',   text: 'text-blue-300',   dot: 'bg-blue-400'   },
  RULE_CHECK:  { bg: 'bg-yellow-500/20', border: 'border-yellow-400/40', text: 'text-yellow-300', dot: 'bg-yellow-400' },
  ANALYSIS:    { bg: 'bg-purple-500/20', border: 'border-purple-400/40', text: 'text-purple-300', dot: 'bg-purple-400' },
  GUARDRAIL:   { bg: 'bg-red-500/20',    border: 'border-red-400/40',    text: 'text-red-300',    dot: 'bg-red-400'    },
  ACTION:      { bg: 'bg-leaf-500/20',   border: 'border-leaf-400/40',   text: 'text-leaf-300',   dot: 'bg-leaf-400'   },
}

function ReasoningStep({ step, index }) {
  const [open, setOpen] = useState(index === 0)
  const cfg = STEP_COLORS[step.step_type] || STEP_COLORS.ANALYSIS

  return (
    <div
      className={`step-enter border rounded-xl overflow-hidden transition-all ${cfg.border} ${cfg.bg}`}
      style={{ animationDelay: `${index * 80}ms` }}
    >
      <button
        className="w-full flex items-center justify-between px-4 py-3 text-left"
        onClick={() => setOpen(o => !o)}
      >
        <div className="flex items-center gap-3">
          <div className={`w-2 h-2 rounded-full flex-shrink-0 ${cfg.dot} ${step.triggered ? 'animate-pulse' : ''}`} />
          <span className={`text-xs font-bold uppercase tracking-wider ${cfg.text}`}>{step.step_type}</span>
          <span className="text-white text-sm font-medium">{step.label}</span>
          {step.triggered && (
            <span className="text-[10px] px-2 py-0.5 bg-red-500/30 text-red-300 rounded-full border border-red-400/40">
              TRIGGERED
            </span>
          )}
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-ocean-200" /> : <ChevronDown className="w-4 h-4 text-ocean-200" />}
      </button>
      {open && (
        <div className="px-4 pb-4 border-t border-white/10">
          <p className="text-ocean-100 text-sm leading-relaxed mt-3">{step.content}</p>
          {step.source && (
            <p className="text-ocean-300 text-xs mt-2 flex items-center gap-1">
              <BookOpen className="w-3 h-3" /> {step.source}
            </p>
          )}
        </div>
      )}
    </div>
  )
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function AdvisoryResult({ result }) {
  const [showReasoning, setShowReasoning] = useState(true)

  if (!result) return null

  const {
    recommendation, risk_level, compliance_status, violations, warnings,
    reasoning, confidence_score, immediate_actions, avoid_actions,
    relevant_schemes, farmer_name, crop_type, session_id,
    needs_clarification, clarification_questions, timestamp
  } = result

  // Clarification case
  if (needs_clarification && clarification_questions?.length) {
    return (
      <div className="glass rounded-2xl p-6 border border-yellow-400/30 glow-yellow step-enter">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-yellow-500/20 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 text-yellow-400" />
          </div>
          <div>
            <h3 className="text-white font-bold">Clarification Needed</h3>
            <p className="text-ocean-200 text-xs">The agent needs more information to give accurate advice</p>
          </div>
        </div>
        <div className="space-y-2">
          {clarification_questions.map((q, i) => (
            <div key={i} className="flex items-start gap-2 text-yellow-200 text-sm">
              <Info className="w-4 h-4 mt-0.5 flex-shrink-0 text-yellow-400" />
              {q}
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* ── Header Card ── */}
      <div className={`glass rounded-2xl p-5 border step-enter ${
        compliance_status === 'Blocked'  ? 'border-red-400/40 glow-red' :
        compliance_status === 'Modified' ? 'border-yellow-400/40 glow-yellow' :
                                           'border-leaf-400/40 glow-green'
      }`}>
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="text-white font-bold text-lg text-shadow">
              Advisory for {farmer_name || 'Farmer'}
              {crop_type ? ` — ${crop_type}` : ''}
            </h3>
            <p className="text-ocean-200 text-xs mt-0.5 font-mono">
              Session: {session_id?.slice(0,8)}… · {new Date(timestamp).toLocaleTimeString()}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <RiskBadge level={risk_level} />
            <ComplianceBadge status={compliance_status} />
          </div>
        </div>

        <div className="mb-3">
          <p className="text-ocean-100 text-xs mb-1.5">Agent Confidence</p>
          <ConfidenceBar score={confidence_score} />
        </div>
      </div>

      {/* ── Violations ── */}
      {violations?.length > 0 && (
        <div className="glass rounded-2xl p-5 border border-red-400/40 step-enter">
          <h4 className="text-red-400 font-bold flex items-center gap-2 mb-3">
            <ShieldX className="w-5 h-5" /> Compliance Violations ({violations.length})
          </h4>
          <div className="space-y-2">
            {violations.map((v, i) => (
              <div key={i} className="flex items-start gap-2 text-red-200 text-sm bg-red-500/10 rounded-lg p-3">
                <XCircle className="w-4 h-4 mt-0.5 flex-shrink-0 text-red-400" />
                {v}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Warnings ── */}
      {warnings?.length > 0 && (
        <div className="glass rounded-2xl p-5 border border-yellow-400/40 step-enter">
          <h4 className="text-yellow-400 font-bold flex items-center gap-2 mb-3">
            <AlertTriangle className="w-5 h-5" /> Compliance Warnings ({warnings.length})
          </h4>
          <div className="space-y-2">
            {warnings.map((w, i) => (
              <div key={i} className="flex items-start gap-2 text-yellow-200 text-sm bg-yellow-500/10 rounded-lg p-3">
                <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0 text-yellow-400" />
                {w}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Recommendation ── */}
      <div className="glass rounded-2xl p-5 step-enter">
        <h4 className="text-white font-bold flex items-center gap-2 mb-3">
          <Sprout className="w-5 h-5 text-leaf-400" /> Recommendation
        </h4>
        <div className="text-ocean-100 text-sm leading-relaxed whitespace-pre-wrap">
          {recommendation}
        </div>
      </div>

      {/* ── Action Cards ── */}
      {(immediate_actions?.length > 0 || avoid_actions?.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {immediate_actions?.length > 0 && (
            <div className="glass rounded-2xl p-5 border border-leaf-400/30 step-enter">
              <h4 className="text-leaf-400 font-bold flex items-center gap-2 mb-3 text-sm">
                <Zap className="w-4 h-4" /> Immediate Actions
              </h4>
              <ul className="space-y-2">
                {immediate_actions.map((a, i) => (
                  <li key={i} className="flex items-start gap-2 text-ocean-100 text-sm">
                    <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0 text-leaf-400" />
                    {a}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {avoid_actions?.length > 0 && (
            <div className="glass rounded-2xl p-5 border border-red-400/30 step-enter">
              <h4 className="text-red-400 font-bold flex items-center gap-2 mb-3 text-sm">
                <XCircle className="w-4 h-4" /> Do Not Do
              </h4>
              <ul className="space-y-2">
                {avoid_actions.map((a, i) => (
                  <li key={i} className="flex items-start gap-2 text-ocean-100 text-sm">
                    <XCircle className="w-4 h-4 mt-0.5 flex-shrink-0 text-red-400" />
                    {a}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* ── Govt Schemes ── */}
      {relevant_schemes?.length > 0 && (
        <div className="glass rounded-2xl p-5 border border-blue-400/30 step-enter">
          <h4 className="text-blue-300 font-bold flex items-center gap-2 mb-3 text-sm">
            <TrendingUp className="w-4 h-4" /> Relevant Government Schemes
          </h4>
          <div className="flex flex-wrap gap-2">
            {relevant_schemes.map((s, i) => (
              <span key={i} className="text-xs px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/30">
                {s}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ── Reasoning Chain ── */}
      {reasoning?.length > 0 && (
        <div className="glass rounded-2xl overflow-hidden step-enter">
          <button
            className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-white/5 transition-all"
            onClick={() => setShowReasoning(o => !o)}
          >
            <h4 className="text-white font-bold flex items-center gap-2 text-sm">
              <ClipboardCheck className="w-4 h-4 text-ocean-300" />
              Agent Reasoning Chain ({reasoning.length} steps)
            </h4>
            {showReasoning ? <ChevronUp className="w-4 h-4 text-ocean-300" /> : <ChevronDown className="w-4 h-4 text-ocean-300" />}
          </button>
          {showReasoning && (
            <div className="px-5 pb-5 space-y-3">
              {reasoning.map((step, i) => (
                <ReasoningStep key={i} step={step} index={i} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
