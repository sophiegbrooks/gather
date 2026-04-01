import { useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Landing() {
  const navigate = useNavigate()
  const [user, setUser] = useState(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data?.user ?? null))
  }, [])

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Nav */}
      <nav className="px-8 py-5 flex items-center justify-between max-w-6xl mx-auto w-full">
        <div className="flex items-center gap-2">
          <span className="text-2xl font-bold text-gather-700 tracking-tight">gather</span>
          <span className="w-1.5 h-1.5 rounded-full bg-gather-500 mt-1" />
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/create')}
            className="text-sm font-medium text-gather-700 hover:text-gather-900 transition-colors"
          >
            Schedule a meeting
          </button>
          {user ? (
            <button
              onClick={() => navigate('/profile')}
              className="text-sm font-semibold px-4 py-2 bg-gather-600 text-white rounded-xl hover:bg-gather-700 transition-all"
            >
              My profile
            </button>
          ) : (
            <button
              onClick={() => navigate('/create')}
              className="text-sm font-semibold px-4 py-2 border-2 border-slate-200 text-ink rounded-xl hover:border-gather-400 hover:text-gather-700 transition-all"
            >
              Log in
            </button>
          )}
        </div>
      </nav>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 text-center">
        <div className="animate-slide-up max-w-3xl">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-gather-50 text-gather-700 text-sm font-medium px-4 py-1.5 rounded-full mb-8 border border-gather-100">
            <span className="w-2 h-2 rounded-full bg-gather-500 animate-pulse" />
            Group scheduling, simplified
          </div>

          {/* Headline */}
          <h1 className="text-6xl md:text-7xl font-extrabold text-ink leading-[1.05] tracking-tight mb-6">
            Find time that works{' '}
            <span className="text-gather-600">for everyone.</span>
          </h1>

          <p className="text-xl text-slate-500 leading-relaxed mb-10 max-w-xl mx-auto">
            No back-and-forth. No sign-up required. Just share a link and let
            your group tell you when they're free.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={() => navigate('/create')}
              className="px-8 py-4 bg-gather-600 text-white text-lg font-semibold rounded-2xl hover:bg-gather-700 transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-gather-200"
            >
              Schedule a meeting →
            </button>
            <span className="text-sm text-slate-400">No account needed</span>
          </div>
        </div>

        {/* Feature pills */}
        <div className="flex flex-wrap items-center justify-center gap-3 mt-20 animate-fade-in">
          {['Hover-select dates', 'Custom time windows', 'Live availability', 'Shareable link', 'Guest-friendly'].map(f => (
            <span key={f} className="px-4 py-2 bg-slate-50 border border-slate-100 text-slate-500 text-sm rounded-full">
              {f}
            </span>
          ))}
        </div>
      </main>

      {/* Preview card */}
      <div className="flex justify-center pb-16 px-6">
        <div className="w-full max-w-2xl bg-white rounded-3xl border border-slate-100 shadow-xl p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-3 h-3 rounded-full bg-red-300" />
            <div className="w-3 h-3 rounded-full bg-yellow-300" />
            <div className="w-3 h-3 rounded-full bg-green-300" />
            <div className="flex-1 h-6 bg-slate-50 rounded-lg ml-2" />
          </div>
          {/* Fake calendar preview */}
          <div className="grid grid-cols-7 gap-1.5 text-center text-xs font-medium text-slate-400 mb-2">
            {['S','M','T','W','T','F','S'].map((d,i) => (
              <div key={i}>{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1.5">
            {Array.from({ length: 35 }, (_, i) => {
              const day = i - 4
              const selected = [8, 9, 10, 15, 16].includes(day)
              const hot = [9, 10].includes(day)
              return (
                <div key={i} className={`
                  aspect-square rounded-lg flex items-center justify-center text-sm font-medium transition-all
                  ${day < 1 || day > 30 ? 'opacity-0' : ''}
                  ${selected && hot ? 'bg-gather-600 text-white' : ''}
                  ${selected && !hot ? 'bg-gather-100 text-gather-700' : ''}
                  ${!selected && day >= 1 && day <= 30 ? 'text-slate-600 hover:bg-slate-50' : ''}
                `}>
                  {day >= 1 && day <= 30 ? day : ''}
                </div>
              )
            })}
          </div>
          <div className="mt-4 flex items-center gap-2">
            <div className="flex -space-x-2">
              {['#4ade80','#60a5fa','#f472b6','#fb923c'].map((c, i) => (
                <div key={i} className="w-7 h-7 rounded-full border-2 border-white flex items-center justify-center text-white text-xs font-bold" style={{ background: c }}>
                  {['A','B','C','D'][i]}
                </div>
              ))}
            </div>
            <span className="text-sm text-slate-500">4 participants responded</span>
            <span className="ml-auto text-sm font-semibold text-gather-600">Best: Apr 9–10</span>
          </div>
        </div>
      </div>

      <footer className="text-center text-sm text-slate-400 pb-8">
        Made with care · gather &copy; {new Date().getFullYear()}
      </footer>
    </div>
  )
}
