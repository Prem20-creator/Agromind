import { CheckCircle2, XCircle, AlertTriangle, Database, TrendingUp } from 'lucide-react'

export default function StatsCards({ stats }) {
  if (!stats) return null

  const cards = [
    {
      label:  'Total Advisories',
      value:  stats.total,
      Icon:   Database,
      color:  'text-blue-400',
      bg:     'bg-blue-500/20',
      border: 'border-blue-400/30',
    },
    {
      label:  'Approved',
      value:  stats.approved,
      Icon:   CheckCircle2,
      color:  'text-leaf-400',
      bg:     'bg-leaf-600/20',
      border: 'border-leaf-400/30',
    },
    {
      label:  'Blocked',
      value:  stats.blocked,
      Icon:   XCircle,
      color:  'text-red-400',
      bg:     'bg-red-600/20',
      border: 'border-red-400/30',
    },
    {
      label:  'Modified',
      value:  stats.modified,
      Icon:   AlertTriangle,
      color:  'text-yellow-400',
      bg:     'bg-yellow-600/20',
      border: 'border-yellow-400/30',
    },
    {
      label:  'High Risk',
      value:  stats.high_risk,
      Icon:   TrendingUp,
      color:  'text-orange-400',
      bg:     'bg-orange-600/20',
      border: 'border-orange-400/30',
    },
  ]

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
      {cards.map(({ label, value, Icon, color, bg, border }) => (
        <div key={label} className={`glass rounded-xl p-4 border ${border}`}>
          <div className={`w-8 h-8 rounded-lg ${bg} flex items-center justify-center mb-2`}>
            <Icon className={`w-4 h-4 ${color}`} />
          </div>
          <p className={`text-2xl font-bold ${color}`}>{value ?? '—'}</p>
          <p className="text-ocean-200 text-xs mt-0.5">{label}</p>
        </div>
      ))}
    </div>
  )
}
