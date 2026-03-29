import { Link, useLocation } from 'react-router-dom'
import { useState } from 'react'
import { Sprout, ClipboardList, Home, Menu, X, Cpu } from 'lucide-react'

const BUBBLES = [
  { left: '8%',  size: 14, dur: '12s', delay: '0s'  },
  { left: '22%', size: 20, dur: '18s', delay: '3s'  },
  { left: '40%', size: 10, dur: '10s', delay: '6s'  },
  { left: '60%', size: 24, dur: '20s', delay: '2s'  },
  { left: '78%', size: 12, dur: '14s', delay: '4s'  },
  { left: '92%', size: 18, dur: '16s', delay: '1s'  },
]

const NAV_LINKS = [
  { to: '/',        label: 'Home',     Icon: Home         },
  { to: '/advisor', label: 'Advisor',  Icon: Sprout       },
  { to: '/audit',   label: 'Audit Log',Icon: ClipboardList},
]

export default function Layout({ children }) {
  const { pathname } = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <div className="ocean-bg">

      {/* ── Waves ── */}
      <div className="wave-container">
        <div className="wave" />
        <div className="wave" />
        <div className="wave" />
      </div>

      {/* ── Bubbles ── */}
      {BUBBLES.map((b, i) => (
        <div
          key={i}
          className="bubble"
          style={{
            left: b.left,
            width:  b.size,
            height: b.size,
            animationDuration: b.dur,
            animationDelay:    b.delay,
          }}
        />
      ))}

      {/* ── Header ── */}
      <header className="relative z-20 text-white text-shadow">
        <div className="max-w-6xl mx-auto px-4 py-6 flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-leaf-400 to-leaf-600 flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
              <Sprout className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gold leading-none">AgroMind</h1>
              <p className="text-xs text-ocean-100 tracking-widest uppercase mt-0.5">
                Agricultural AI Agent
              </p>
            </div>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-2">
            {NAV_LINKS.map(({ to, label, Icon }) => (
              <Link
                key={to}
                to={to}
                className={`flex items-center gap-2 px-4 py-2 rounded-full font-medium text-sm transition-all duration-200 ${
                  pathname === to
                    ? 'bg-gold text-ocean-800 shadow-md'
                    : 'text-white hover:bg-white/10'
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </Link>
            ))}
          </nav>

          {/* Mobile menu toggle */}
          <button
            className="md:hidden text-white p-2 rounded-lg hover:bg-white/10"
            onClick={() => setMenuOpen(o => !o)}
          >
            {menuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Nav */}
        {menuOpen && (
          <div className="md:hidden glass mx-4 mb-4 rounded-2xl overflow-hidden z-20 relative">
            {NAV_LINKS.map(({ to, label, Icon }) => (
              <Link
                key={to}
                to={to}
                onClick={() => setMenuOpen(false)}
                className={`flex items-center gap-3 px-5 py-3 font-medium transition-all ${
                  pathname === to
                    ? 'bg-gold/20 text-gold'
                    : 'text-white hover:bg-white/10'
                }`}
              >
                <Icon className="w-5 h-5" />
                {label}
              </Link>
            ))}
          </div>
        )}
      </header>

      {/* ── Compliance badges strip ── */}
      <div className="relative z-10 overflow-hidden">
        <div className="flex gap-2 px-4 pb-4 flex-wrap justify-center">
          {['ICAR 2024','CIB&RC Rules','MSP Aligned','PM-KISAN','PMFBY','NPOP Organic','Pesticide Act 1968'].map(b => (
            <span
              key={b}
              className="text-[10px] font-medium px-3 py-1 rounded-full border border-leaf-400/40 text-leaf-400 bg-leaf-600/10 tracking-wide"
            >
              {b}
            </span>
          ))}
        </div>
      </div>

      {/* ── Page Content ── */}
      <main className="relative z-10 pb-40">
        {children}
      </main>

      {/* ── Footer ── */}
      <footer className="relative z-10 text-center py-6 text-ocean-100 text-sm text-shadow">
        <div className="flex items-center justify-center gap-2 mb-1">
        </div>
        <p className="text-xs text-ocean-200">
          © {new Date().getFullYear()} AgroMind — Agricultural Advisory Intelligence Platform
        </p>
      </footer>
    </div>
  )
}
