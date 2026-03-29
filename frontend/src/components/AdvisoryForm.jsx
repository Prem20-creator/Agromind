import { useState } from 'react'
import { Sprout, Loader2, Zap, FlaskConical } from 'lucide-react'
import { getDemoScenario } from '../services/api'
import toast from 'react-hot-toast'

const CROPS = [
  'Cotton (Bt)', 'Paddy', 'Wheat', 'Groundnut', 'Sugarcane',
  'Soybean', 'Maize', 'Tomato', 'Onion', 'Potato', 'Chilli', 'Banana', 'Other'
]

const SOIL_TYPES = [
  'Black Cotton Soil (Regur)', 'Red Laterite Soil', 'Alluvial Soil',
  'Sandy Loam', 'Clay Loam', 'Saline / High EC Soil', 'Acidic Soil', 'Other'
]

const SEASONS    = ['Kharif (Jun–Oct)', 'Rabi (Nov–Mar)', 'Zaid (Mar–Jun)']
const IRRIGATION = ['Bore-well', 'Canal', 'Drip', 'Sprinkler', 'Rain-fed', 'Tank / Pond']
const REGIONS    = [
  'Maharashtra', 'Punjab', 'Andhra Pradesh', 'Gujarat', 'Uttar Pradesh',
  'Madhya Pradesh', 'Rajasthan', 'Karnataka', 'Tamil Nadu', 'Telangana', 'Other'
]

const DEMO_SCENARIOS = [
  { id: 'safe',          label: '✅ Safe Advisory',    color: 'text-leaf-400 border-leaf-400/40 hover:bg-leaf-600/20' },
  { id: 'blocked',       label: '🚫 Blocked Pesticide', color: 'text-red-400 border-red-400/40 hover:bg-red-600/20'   },
  { id: 'clarification', label: '❓ Missing Data',      color: 'text-yellow-400 border-yellow-400/40 hover:bg-yellow-600/20' },
]

const EMPTY = {
  farmer_name: '', crop_type: '', soil_condition: '', weather: '',
  farmer_query: '', region: 'Maharashtra', land_size_acres: '',
  season: 'Kharif (Jun–Oct)', irrigation_type: '', previous_crops: '',
}

export default function AdvisoryForm({ onSubmit, loading }) {
  const [form, setForm] = useState(EMPTY)
  const [demoLoading, setDemoLoading] = useState(null)

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = (e) => {
    e.preventDefault()
    onSubmit({
      ...form,
      land_size_acres: form.land_size_acres ? Number(form.land_size_acres) : undefined,
      region: form.region.toLowerCase().replace(/ /g, '_'),
    })
  }

  const loadDemo = async (scenario) => {
    setDemoLoading(scenario)
    try {
      const res = await getDemoScenario(scenario)
      if (res.demo_input) {
        setForm({ ...EMPTY, ...res.demo_input })
        toast.success(`Demo loaded: ${scenario}`)
      }
    } catch {
      // If backend down, use hardcoded demos
      const HARDCODED = {
        safe: {
          farmer_name: 'Ramesh Kumar', crop_type: 'Cotton (Bt)',
          soil_condition: 'Black cotton soil, pH 7.8, EC 1.6 dS/m, low nitrogen, adequate potassium',
          weather: 'Temperature 34°C, humidity 65%, last rain 8 days ago, forecast rain in 5 days',
          farmer_query: 'My cotton is at 65 days old vegetative stage. Leaves are yellowing at edges. What fertilizer and pest management should I do?',
          region: 'Maharashtra', land_size_acres: '3.2', season: 'Kharif (Jun–Oct)', irrigation_type: 'Bore-well',
        },
        blocked: {
          farmer_name: 'Suresh Patil', crop_type: 'Cotton (Bt)',
          soil_condition: 'Red laterite soil, pH 6.5, moderate fertility',
          weather: 'Hot and dry, 38°C, no rain for 15 days',
          farmer_query: 'I have severe bollworm attack on my cotton. My neighbour suggested spraying endosulfan and monocrotophos together for better results. Can I do this?',
          region: 'Telangana', land_size_acres: '5', season: 'Kharif (Jun–Oct)',
        },
        clarification: {
          farmer_name: 'Meena Devi', crop_type: '',
          soil_condition: '', weather: 'Normal monsoon',
          farmer_query: 'What fertilizer should I use?',
          region: 'Rajasthan', season: 'Kharif (Jun–Oct)',
        },
      }
      setForm({ ...EMPTY, ...HARDCODED[scenario] })
      toast.success(`Demo loaded: ${scenario}`)
    } finally {
      setDemoLoading(null)
    }
  }

  const inputClass = `w-full bg-white/10 border border-white/20 rounded-xl px-4 py-2.5 text-white 
    placeholder-ocean-200 focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold/50 
    transition-all text-sm`
  const labelClass = 'block text-ocean-100 text-xs font-medium uppercase tracking-wider mb-1.5'

  return (
    <div className="glass rounded-2xl p-6">
      {/* Demo Scenarios */}
      <div className="mb-6">
        <p className="text-ocean-100 text-xs uppercase tracking-wider mb-3 flex items-center gap-2">
          <FlaskConical className="w-3.5 h-3.5" /> Demo Scenarios
        </p>
        <div className="flex gap-2 flex-wrap">
          {DEMO_SCENARIOS.map(({ id, label, color }) => (
            <button
              key={id}
              onClick={() => loadDemo(id)}
              disabled={!!demoLoading}
              className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-all ${color} disabled:opacity-50`}
            >
              {demoLoading === id ? <Loader2 className="w-3 h-3 animate-spin inline" /> : label}
            </button>
          ))}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Row 1 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Farmer Name</label>
            <input className={inputClass} placeholder="e.g. Ramesh Kumar"
              value={form.farmer_name} onChange={e => set('farmer_name', e.target.value)} />
          </div>
          <div>
            <label className={labelClass}>Region / State *</label>
            <select className={inputClass + ' cursor-pointer'}
              value={form.region} onChange={e => set('region', e.target.value)}>
              {REGIONS.map(r => <option key={r} value={r} className="bg-ocean-700">{r}</option>)}
            </select>
          </div>
        </div>

        {/* Row 2 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className={labelClass}>Crop Type *</label>
            <select className={inputClass + ' cursor-pointer'}
              value={form.crop_type} onChange={e => set('crop_type', e.target.value)}>
              <option value="" className="bg-ocean-700">Select crop…</option>
              {CROPS.map(c => <option key={c} value={c} className="bg-ocean-700">{c}</option>)}
            </select>
          </div>
          <div>
            <label className={labelClass}>Season</label>
            <select className={inputClass + ' cursor-pointer'}
              value={form.season} onChange={e => set('season', e.target.value)}>
              {SEASONS.map(s => <option key={s} value={s} className="bg-ocean-700">{s}</option>)}
            </select>
          </div>
          <div>
            <label className={labelClass}>Land Size (acres)</label>
            <input className={inputClass} type="number" min="0.1" max="10000" step="0.1"
              placeholder="e.g. 3.2"
              value={form.land_size_acres} onChange={e => set('land_size_acres', e.target.value)} />
          </div>
        </div>

        {/* Soil */}
        <div>
          <label className={labelClass}>Soil Condition *</label>
          <div className="flex gap-2 flex-wrap mb-2">
            {SOIL_TYPES.map(s => (
              <button key={s} type="button"
                onClick={() => set('soil_condition', s)}
                className={`text-xs px-3 py-1 rounded-full border transition-all ${
                  form.soil_condition === s
                    ? 'bg-gold text-ocean-800 border-gold'
                    : 'border-white/20 text-ocean-100 hover:border-gold/50'
                }`}
              >{s}</button>
            ))}
          </div>
          <textarea className={inputClass} rows={2}
            placeholder="Describe soil pH, EC, fertility, moisture, previous treatment…"
            value={form.soil_condition} onChange={e => set('soil_condition', e.target.value)} />
        </div>

        {/* Weather */}
        <div>
          <label className={labelClass}>Weather Conditions *</label>
          <input className={inputClass}
            placeholder="e.g. Temperature 34°C, humidity 65%, last rain 8 days ago, forecast rain 5 days"
            value={form.weather} onChange={e => set('weather', e.target.value)} />
        </div>

        {/* Row 3 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Irrigation Type</label>
            <select className={inputClass + ' cursor-pointer'}
              value={form.irrigation_type} onChange={e => set('irrigation_type', e.target.value)}>
              <option value="" className="bg-ocean-700">Select…</option>
              {IRRIGATION.map(i => <option key={i} value={i} className="bg-ocean-700">{i}</option>)}
            </select>
          </div>
          <div>
            <label className={labelClass}>Previous Crops</label>
            <input className={inputClass} placeholder="e.g. Soybean, Wheat"
              value={form.previous_crops} onChange={e => set('previous_crops', e.target.value)} />
          </div>
        </div>

        {/* Query */}
        <div>
          <label className={labelClass}>Your Question *</label>
          <textarea className={inputClass} rows={4}
            placeholder="Describe your problem in detail — symptoms, what you've tried, what you want to know…"
            value={form.farmer_query} onChange={e => set('farmer_query', e.target.value)} />
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 py-3.5 rounded-xl font-bold text-sm
            bg-gold hover:bg-yellow-300 text-ocean-800 transition-all disabled:opacity-60
            disabled:cursor-not-allowed shadow-lg hover:shadow-gold/30"
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Agent Reasoning…
            </>
          ) : (
            <>
              <Zap className="w-5 h-5" />
              Get Advisory
            </>
          )}
        </button>
      </form>
    </div>
  )
}
