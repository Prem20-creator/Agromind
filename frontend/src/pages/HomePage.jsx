import { Link } from 'react-router-dom'
import { Sprout, ShieldCheck, ClipboardList, Zap, Globe, BookOpen, ArrowRight } from 'lucide-react'

const FEATURES = [
  {
    Icon: Sprout,
    title: 'AI-Powered Advisory',
    desc: 'Claude AI reasons through crop science, soil data, weather, and your specific query to generate farm-ready advice.',
    color: 'text-leaf-400',
    bg: 'bg-leaf-600/20',
  },
  {
    Icon: ShieldCheck,
    title: 'Compliance Guardrails',
    desc: 'Every AI output is validated against CIB&RC pesticide rules, ICAR dosage limits, and FSSAI safety standards before delivery.',
    color: 'text-yellow-400',
    bg: 'bg-yellow-600/20',
  },
  {
    Icon: ClipboardList,
    title: 'Full Audit Trail',
    desc: 'Every reasoning step, rule triggered, and recommendation is stored in MongoDB with timestamps for complete accountability.',
    color: 'text-blue-400',
    bg: 'bg-blue-600/20',
  },
  {
    Icon: Globe,
    title: 'Region-Aware',
    desc: 'Understands state-specific rules — Maharashtra\'s groundwater act, Punjab\'s stubble ban, Gujarat\'s drip subsidies.',
    color: 'text-purple-400',
    bg: 'bg-purple-600/20',
  },
  {
    Icon: Zap,
    title: 'Edge Case Handling',
    desc: 'Missing inputs? Low confidence? Dangerous suggestion? The agent asks, warns, or blocks — never silently fails.',
    color: 'text-orange-400',
    bg: 'bg-orange-600/20',
  },
  {
    Icon: BookOpen,
    title: 'Government Schemes',
    desc: 'Automatically surfaces relevant schemes — PM-KISAN, PMFBY, PKVY, KCC, PMKSY — with eligibility guidance.',
    color: 'text-pink-400',
    bg: 'bg-pink-600/20',
  },
]

const STATS = [
  { label: 'Compliance Rules',  value: '200+' },
  { label: 'Banned Pesticides', value: '14'   },
  { label: 'Crops Covered',     value: '13+'  },
  { label: 'Govt Schemes',      value: '6'    },
]

export default function HomePage() {
  return (
    <div className="max-w-6xl mx-auto px-4">

      {/* ── Hero ── */}
      <div className="text-center py-12">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass border border-leaf-400/30 text-leaf-400 text-xs font-medium mb-6">
          <Sprout className="w-3.5 h-3.5" />
          Domain-Specialized AI Agent with Compliance Guardrails
        </div>
        <h2 className="text-4xl md:text-6xl font-bold text-white text-shadow leading-tight mb-4">
          Smart Farming.<br />
          <span className="text-gold">Safe Advice.</span>
        </h2>
        <p className="text-ocean-100 text-lg max-w-2xl mx-auto leading-relaxed mb-8">
          AI-powered agricultural advisory for Indian smallholder farmers — with
          real-time compliance validation, full audit trails, and government scheme guidance.
        </p>
        <div className="flex flex-wrap justify-center gap-4">
          <Link to="/advisor"
            className="flex items-center gap-2 px-8 py-3.5 rounded-full bg-gold text-ocean-800 font-bold hover:bg-yellow-300 transition-all shadow-lg hover:shadow-gold/30">
            <Zap className="w-5 h-5" />
            Get Advisory
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link to="/audit"
            className="flex items-center gap-2 px-8 py-3.5 rounded-full glass border border-white/20 text-white font-medium hover:bg-white/10 transition-all">
            <ClipboardList className="w-5 h-5" />
            Audit Dashboard
          </Link>
        </div>
      </div>

      {/* ── Stats ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-16">
        {STATS.map(({ label, value }) => (
          <div key={label} className="glass rounded-2xl p-5 text-center border border-white/10">
            <p className="text-3xl font-bold text-gold">{value}</p>
            <p className="text-ocean-200 text-sm mt-1">{label}</p>
          </div>
        ))}
      </div>

      {/* ── Features ── */}
      <div className="mb-16">
        <h3 className="text-2xl font-bold text-white text-center mb-8 text-shadow">
          What AgroMind Does
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES.map(({ Icon, title, desc, color, bg }) => (
            <div key={title} className="glass rounded-2xl p-5 border border-white/10 hover:border-white/20 transition-all group">
              <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                <Icon className={`w-5 h-5 ${color}`} />
              </div>
              <h4 className="text-white font-bold mb-2">{title}</h4>
              <p className="text-ocean-200 text-sm leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── CTA ── */}
      <div className="glass-white rounded-3xl p-8 text-center mb-8 border border-white/30">
        <h3 className="text-2xl font-bold text-ocean-700 mb-2">Ready to get farm-safe advice?</h3>
        <p className="text-ocean-500 mb-6">
          Try the 3 demo scenarios — safe advisory, blocked pesticide, and missing data — to see the agent in action.
        </p>
        <Link to="/advisor"
          className="inline-flex items-center gap-2 px-8 py-3 rounded-full bg-ocean-600 text-white font-bold hover:bg-ocean-500 transition-all">
          <Sprout className="w-5 h-5" />
          Open AgroMind Advisor
        </Link>
      </div>
    </div>
  )
}
