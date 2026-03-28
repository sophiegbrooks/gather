import { useState } from 'react'

export default function AuthStep({ user, onChange, onNext, onBack }) {
  const [mode, setMode] = useState('guest')   // 'guest' | 'signin'
  const [name, setName] = useState(user?.name || '')
  const [email, setEmail] = useState(user?.email || '')

  const handleContinue = () => {
    if (mode === 'guest') {
      if (!name.trim()) return
      onChange({ name: name.trim(), email: email.trim() || null, isGuest: true })
    } else {
      if (!name.trim() || !email.trim()) return
      onChange({ name: name.trim(), email: email.trim(), isGuest: false })
    }
    onNext()
  }

  const isValid = name.trim().length >= 1 && (mode === 'guest' || email.trim().includes('@'))

  return (
    <div className="w-full max-w-lg step-enter">
      <p className="text-gather-600 text-sm font-semibold uppercase tracking-widest mb-4">
        5 → Almost there
      </p>
      <h2 className="text-4xl md:text-5xl font-bold text-ink mb-3 leading-tight">
        Who are you?
      </h2>
      <p className="text-slate-400 mb-8">You can continue as a guest — no account needed.</p>

      {/* Mode toggle */}
      <div className="flex bg-slate-100 rounded-2xl p-1 mb-8">
        <button
          onClick={() => setMode('guest')}
          className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${
            mode === 'guest' ? 'bg-white shadow-sm text-ink' : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          Continue as guest
        </button>
        <button
          onClick={() => setMode('signin')}
          className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${
            mode === 'signin' ? 'bg-white shadow-sm text-ink' : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          Sign in / create account
        </button>
      </div>

      {/* Guest form */}
      {mode === 'guest' && (
        <div className="space-y-4 animate-fade-in">
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1.5">Your name *</label>
            <input
              autoFocus
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && isValid && handleContinue()}
              placeholder="e.g. Alex Johnson"
              className="w-full px-4 py-3.5 border-2 border-slate-200 focus:border-gather-500 rounded-xl outline-none text-ink font-medium transition-colors"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1.5">
              Email <span className="text-slate-300 font-normal">(optional — for notifications)</span>
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="alex@example.com"
              className="w-full px-4 py-3.5 border-2 border-slate-200 focus:border-gather-500 rounded-xl outline-none text-ink font-medium transition-colors"
            />
          </div>
        </div>
      )}

      {/* Sign in form */}
      {mode === 'signin' && (
        <div className="space-y-4 animate-fade-in">
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1.5">Name *</label>
            <input
              autoFocus
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Your full name"
              className="w-full px-4 py-3.5 border-2 border-slate-200 focus:border-gather-500 rounded-xl outline-none text-ink font-medium transition-colors"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1.5">Email *</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && isValid && handleContinue()}
              placeholder="your@email.com"
              className="w-full px-4 py-3.5 border-2 border-slate-200 focus:border-gather-500 rounded-xl outline-none text-ink font-medium transition-colors"
            />
          </div>
          {/* Social logins (visual only for now) */}
          <div className="pt-2">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex-1 h-px bg-slate-100" />
              <span className="text-xs text-slate-400">or continue with</span>
              <div className="flex-1 h-px bg-slate-100" />
            </div>
            <div className="flex gap-3">
              {['Google', 'Apple'].map(p => (
                <button
                  key={p}
                  className="flex-1 py-3 border-2 border-slate-200 rounded-xl text-sm font-medium text-slate-500 hover:border-gather-300 hover:text-gather-600 transition-colors"
                >
                  {p === 'Google' ? '🔵' : '🍎'} {p}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mt-8">
        <button onClick={onBack} className="text-slate-400 hover:text-slate-600 transition-colors text-sm font-medium">
          ← Back
        </button>
        <button
          onClick={handleContinue}
          disabled={!isValid}
          className="px-6 py-3 bg-gather-600 text-white font-semibold rounded-xl disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gather-700 transition-all hover:scale-[1.02] active:scale-[0.98] shadow-md shadow-gather-100"
        >
          Continue →
        </button>
      </div>
    </div>
  )
}
