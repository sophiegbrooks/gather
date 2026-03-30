import { useState } from 'react'
import { supabase } from '../../lib/supabase'

export default function AuthStep({ user, onChange, onNext, onBack }) {
  const [mode, setMode]       = useState('guest')   // 'guest' | 'signup' | 'login'
  const [name, setName]       = useState(user?.name  || '')
  const [email, setEmail]     = useState(user?.email || '')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState(null)
  const [success, setSuccess] = useState(null)

  const switchMode = (m) => { setMode(m); setError(null); setSuccess(null); setPassword('') }

  // ── Guest ──────────────────────────────────────────────────────────────────
  const handleGuest = () => {
    if (!name.trim()) return
    onChange({ name: name.trim(), email: email.trim() || null, isGuest: true })
    onNext()
  }

  // ── Sign Up ─────────────────────────────────────────────────────────────────
  const handleSignUp = async () => {
    if (!name.trim() || !email.trim() || !password) return
    setLoading(true); setError(null)

    const { data, error: authError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { data: { full_name: name.trim() } },
    })

    setLoading(false)
    if (authError) {
      setError(authError.message)
    } else if (data?.user) {
      onChange({ name: name.trim(), email: email.trim(), isGuest: false, id: data.user.id })
      onNext()
    }
  }

  // ── Log In ──────────────────────────────────────────────────────────────────
  const handleLogin = async () => {
    if (!email.trim() || !password) return
    setLoading(true); setError(null)

    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    })

    setLoading(false)
    if (authError) {
      if (authError.message.toLowerCase().includes('invalid')) {
        setError('Wrong email or password. Try again or sign up.')
      } else {
        setError(authError.message)
      }
    } else if (data?.user) {
      const displayName = name.trim() || data.user.user_metadata?.full_name || email.split('@')[0]
      onChange({ name: displayName, email: email.trim(), isGuest: false, id: data.user.id })
      onNext()
    }
  }

  const isGuestValid  = name.trim().length >= 1
  const isSignUpValid = name.trim().length >= 1 && email.includes('@') && password.length >= 6
  const isLoginValid  = email.includes('@') && password.length >= 6

  const Spinner = () => (
    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
    </svg>
  )

  return (
    <div className="w-full max-w-lg step-enter">
      <p className="text-gather-600 text-sm font-semibold uppercase tracking-widest mb-4">
        5 → Almost there
      </p>
      <h2 className="text-4xl md:text-5xl font-bold text-ink mb-3 leading-tight">Who are you?</h2>
      <p className="text-slate-400 mb-8">Continue as a guest or create a free account.</p>

      {/* Mode tabs */}
      <div className="flex bg-slate-100 rounded-2xl p-1 mb-8 gap-1">
        {[
          { key: 'guest',  label: 'Guest'   },
          { key: 'signup', label: 'Sign Up' },
          { key: 'login',  label: 'Log In'  },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => switchMode(tab.key)}
            className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              mode === tab.key ? 'bg-white shadow-sm text-ink' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Guest ── */}
      {mode === 'guest' && (
        <div className="space-y-4 animate-fade-in">
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1.5">Your name *</label>
            <input
              autoFocus type="text" value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && isGuestValid && handleGuest()}
              placeholder="e.g. Alex Johnson"
              className="w-full px-4 py-3.5 border-2 border-slate-200 focus:border-gather-500 rounded-xl outline-none text-ink font-medium transition-colors"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1.5">
              Email <span className="text-slate-300 font-normal">(optional)</span>
            </label>
            <input
              type="email" value={email}
              onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && isGuestValid && handleGuest()}
              placeholder="alex@example.com"
              className="w-full px-4 py-3.5 border-2 border-slate-200 focus:border-gather-500 rounded-xl outline-none text-ink font-medium transition-colors"
            />
          </div>
          <p className="text-xs text-slate-400">No account needed — just enter your name and go.</p>
        </div>
      )}

      {/* ── Sign Up ── */}
      {mode === 'signup' && (
        <div className="space-y-4 animate-fade-in">
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1.5">Full name *</label>
            <input
              autoFocus type="text" value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Your full name"
              className="w-full px-4 py-3.5 border-2 border-slate-200 focus:border-gather-500 rounded-xl outline-none text-ink font-medium transition-colors"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1.5">Email *</label>
            <input
              type="email" value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="your@email.com"
              className="w-full px-4 py-3.5 border-2 border-slate-200 focus:border-gather-500 rounded-xl outline-none text-ink font-medium transition-colors"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1.5">Password *</label>
            <input
              type="password" value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && isSignUpValid && !loading && handleSignUp()}
              placeholder="Min. 6 characters"
              className="w-full px-4 py-3.5 border-2 border-slate-200 focus:border-gather-500 rounded-xl outline-none text-ink font-medium transition-colors"
            />
          </div>
          {error && (
            <div className="px-4 py-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-500">{error}</div>
          )}
        </div>
      )}

      {/* ── Log In ── */}
      {mode === 'login' && (
        <div className="space-y-4 animate-fade-in">
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1.5">Your name</label>
            <input
              autoFocus type="text" value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Your name"
              className="w-full px-4 py-3.5 border-2 border-slate-200 focus:border-gather-500 rounded-xl outline-none text-ink font-medium transition-colors"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1.5">Email *</label>
            <input
              type="email" value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="your@email.com"
              className="w-full px-4 py-3.5 border-2 border-slate-200 focus:border-gather-500 rounded-xl outline-none text-ink font-medium transition-colors"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1.5">Password *</label>
            <input
              type="password" value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && isLoginValid && !loading && handleLogin()}
              placeholder="Your password"
              className="w-full px-4 py-3.5 border-2 border-slate-200 focus:border-gather-500 rounded-xl outline-none text-ink font-medium transition-colors"
            />
          </div>
          {error && (
            <div className="px-4 py-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-500 flex items-start gap-2">
              <span>{error}</span>
              {error.includes('sign up') && (
                <button onClick={() => switchMode('signup')} className="underline shrink-0 font-medium">Sign up →</button>
              )}
            </div>
          )}
          <p className="text-xs text-slate-400">
            Don't have an account?{' '}
            <button onClick={() => switchMode('signup')} className="text-gather-600 font-medium hover:underline">
              Sign up instead
            </button>
          </p>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between mt-8">
        <button onClick={onBack} className="text-slate-400 hover:text-slate-600 transition-colors text-sm font-medium">
          ← Back
        </button>

        {mode === 'guest' && (
          <button
            onClick={handleGuest}
            disabled={!isGuestValid}
            className="px-6 py-3 bg-gather-600 text-white font-semibold rounded-xl disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gather-700 transition-all shadow-md shadow-gather-100"
          >
            Continue as guest →
          </button>
        )}

        {mode === 'signup' && (
          <button
            onClick={handleSignUp}
            disabled={!isSignUpValid || loading}
            className="px-6 py-3 bg-gather-600 text-white font-semibold rounded-xl disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gather-700 transition-all shadow-md shadow-gather-100 flex items-center gap-2"
          >
            {loading ? <><Spinner />Creating…</> : 'Create account →'}
          </button>
        )}

        {mode === 'login' && (
          <button
            onClick={handleLogin}
            disabled={!isLoginValid || loading}
            className="px-6 py-3 bg-gather-600 text-white font-semibold rounded-xl disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gather-700 transition-all shadow-md shadow-gather-100 flex items-center gap-2"
          >
            {loading ? <><Spinner />Signing in…</> : 'Sign in →'}
          </button>
        )}
      </div>
    </div>
  )
}
