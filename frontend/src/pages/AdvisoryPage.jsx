import { useState } from 'react'
import { Sprout, RefreshCw } from 'lucide-react'
import toast from 'react-hot-toast'
import AdvisoryForm from '../components/AdvisoryForm'
import AdvisoryResult from '../components/AdvisoryResult'
import { submitAdvisory } from '../services/api'

export default function AdvisoryPage() {
  const [loading, setLoading] = useState(false)
  const [result,  setResult]  = useState(null)
  const [error,   setError]   = useState(null)

  const handleSubmit = async (payload) => {
    setLoading(true)
    setResult(null)
    setError(null)

    try {
      const res = await submitAdvisory(payload)

      if (res.needs_clarification) {
        setResult({ needs_clarification: true, clarification_questions: res.clarification_questions })
        toast('Clarification needed — please fill in missing details.', { icon: '❓' })
        return
      }

      if (res.success && res.data) {
        setResult(res.data)
        const status = res.data.compliance_status
        if      (status === 'Blocked')  toast.error('Advisory blocked — compliance violation detected.')
        else if (status === 'Modified') toast('Advisory modified — see compliance warnings.', { icon: '⚠️' })
        else                            toast.success('Advisory generated successfully!')
      } else {
        throw new Error(res.error || 'Unknown error')
      }
    } catch (err) {
      const msg = err.response?.data?.error || err.message || 'Failed to get advisory'
      setError(msg)
      toast.error(msg)

      // Handle 422 clarification from backend
      if (err.response?.status === 422) {
        setResult({
          needs_clarification: true,
          clarification_questions: err.response.data.clarification_questions || [],
        })
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-6xl mx-auto px-4">
      {/* Page Header */}
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-white text-shadow flex items-center justify-center gap-3">
          <Sprout className="w-8 h-8 text-leaf-400" />
          Farm Advisory Agent
        </h2>
        <p className="text-ocean-200 mt-2">
          AI-powered advice with compliance guardrails — tell us about your farm and query
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left — Form */}
        <div>
          <AdvisoryForm onSubmit={handleSubmit} loading={loading} />
        </div>

        {/* Right — Result */}
        <div>
          {!result && !loading && !error && (
            <div className="glass rounded-2xl p-12 text-center text-ocean-200 h-full flex flex-col items-center justify-center">
              <Sprout className="w-16 h-16 text-leaf-400/40 mb-4" />
              <p className="font-medium text-lg">Advisory results will appear here</p>
              <p className="text-sm mt-2">Fill in the form and click "Get Advisory"</p>
              <p className="text-xs mt-4 text-ocean-300">
                Try a demo scenario to see the agent in action
              </p>
            </div>
          )}

          {loading && (
            <div className="glass rounded-2xl p-12 text-center text-ocean-200 h-full flex flex-col items-center justify-center">
              <div className="relative mb-6">
                <div className="w-16 h-16 rounded-full border-4 border-leaf-400/20 border-t-leaf-400 animate-spin" />
                <Sprout className="w-7 h-7 text-leaf-400 absolute inset-0 m-auto" />
              </div>
              <p className="font-medium text-lg text-white">Agent Reasoning…</p>
              <p className="text-sm mt-2">Analyzing your query against ICAR rules and regulations</p>
              <div className="mt-6 space-y-2 text-xs text-ocean-300 text-left max-w-xs">
                {[
                  '🔍 Loading crop science protocols…',
                  '⚖️  Checking CIB&RC pesticide rules…',
                  '🧠 Running AI reasoning engine…',
                  '🛡️  Validating compliance guardrails…',
                ].map((t, i) => (
                  <div key={i} className="flex items-center gap-2 animate-pulse" style={{ animationDelay: `${i * 300}ms` }}>
                    {t}
                  </div>
                ))}
              </div>
            </div>
          )}

          {error && !result && (
            <div className="glass rounded-2xl p-8 text-center border border-red-400/30">
              <p className="text-red-400 text-lg font-bold mb-2">⚠️ Error</p>
              <p className="text-ocean-200 text-sm">{error}</p>
              <button
                onClick={() => setError(null)}
                className="mt-4 flex items-center gap-2 mx-auto px-4 py-2 rounded-lg bg-white/10 text-white text-sm hover:bg-white/20 transition-all"
              >
                <RefreshCw className="w-4 h-4" />
                Try Again
              </button>
            </div>
          )}

          {result && <AdvisoryResult result={result} />}
        </div>
      </div>
    </div>
  )
}
