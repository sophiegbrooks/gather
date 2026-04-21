import { useState } from 'react'
import { supabase } from '../../lib/supabase'

const Spinner = () => (
  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
  </svg>
)

export default function AuthStep({ user, onChange, onBack, onFinish }) {
  const [name, setName]         = useState(user?.name  || '')
  const [email, setEmail]       = useState(user?.email || '')
  const [password, setPassword] = useState('')
  const [mode, setMode]         = useState('register') // 'register' | 'login'
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState(null)

  const isRegisterValid = name.trim().length >= 1 && email.includes('@')
  const isLoginValid    = email.includes('@') && password.length >= 6

  const switchMode = (m) => { setMode(m); setError(null); setPassword('') }

  // Auto-registers via magic link — creates Supabase user if they don't exist
  const handleRegister = async () => {
    if (!isRegisterValid) return
    setLoading(true)
    setError(null)

    const { error: authError } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        shouldCreateUser: true,
        data: { full_name: name.trim() },
        emailRedirectTo: `${window.location.origin}/profile`,
      },
    })

    setLoading(false)
    if (authError) { setError(authError.message); return }

    onChange({ name: name.trim(), email: email.trim(), isGuest: false })
    onFinish()
  }

  const handleLogin = async () => {
    if (!isLoginValid) return
    setLoading(true)
    setError(null)

    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    })

    setLoading(false)
    if (authError) {
      setError('Wrong email or password. Try again or go back to register.')
      return
    }

    const displayName = name.trim() || data.user.user_metadata?.full_name || email.split('@')[0]
    onChange({ name: displayName, email: email.trim(), isGuest: false, id: data.user.id })
    window.location.href = '/profile'
  }

  return (
    <div className="w-full max-w-lg step-enter">
      <p className="text-gather-600 text-sm font-semibold uppercase tracking-widest mb-4">4 → Almost there</p>
      <h2 className="text-4xl md:text-5xl font-bold text-ink mb-3 leading-tight">Who are you?</h2>
      <p className="text-slate-400 mb-8">
        {mode === 'register'
          ? "Enter your name and email — we'll register your profile automatically."
          : 'Sign in to your existing account.'}
      </p>

      {mode === 'register' && (
        <div className="space-y-4 animate-fade-in">
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1.5">Your name *</label>
            <input
              autoFocus
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && isRegisterValid && !loading && handleRegister()}
              placeholder="e.g. Alex Johnson"
              className="w-full px-4 py-3.5 border-2 border-slate-200 focus:border-gather-500 rounded-xl outline-none text-ink font-medium transition-colors"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1.5">Email *</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && isRegisterValid && !loading && handleRegister()}
              placeholder="your@email.com"
              className="w-full px-4 py-3.5 border-2 border-slate-200 focus:border-gather-500 rounded-xl outline-none text-ink font-medium transition-colors"
            />
          </div>
          <p className="text-xs text-slate-400">
            We'll send a magic link so you can access your events anytime — no password needed.
          </p>
          {error && (
            <div className="px-4 py-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-500">{error}</div>
          )}
        </div>
      )}

      {mode === 'login' && (
        <div className="space-y-4 animate-fade-in">
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1.5">Email *</label>
            <input
              autoFocus
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="your@email.com"
              className="w-full px-4 py-3.5 border-2 border-slate-200 focus:border-gather-500 rounded-xl outline-none text-ink font-medium transition-colors"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1.5">Password *</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && isLoginValid && !loading && handleLogin()}
              placeholder="Your password"
              className="w-full px-4 py-3.5 border-2 border-slate-200 focus:border-gather-500 rounded-xl outline-none text-ink font-medium transition-colors"
            />
          </div>
          {error && (
            <div className="px-4 py-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-500">{error}</div>
          )}
        </div>
      )}

      <div className="flex items-center justify-between mt-8">
        <button onClick={onBack} className="text-slate-400 hover:text-slate-600 transition-colors text-sm font-medium">
          ← Back
        </button>

        {mode === 'register' ? (
          <button
            onClick={handleRegister}
            disabled={!isRegisterValid || loading}
            className="px-6 py-3 bg-gather-600 text-white font-semibold rounded-xl disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gather-700 transition-all shadow-md shadow-gather-100 flex items-center gap-2"
          >
            {loading ? <><Spinner />Registering…</> : 'Launch event 🚀'}
          </button>
        ) : (
          <button
            onClick={handleLogin}
            disabled={!isLoginValid || loading}
            className="px-6 py-3 bg-ink text-white font-semibold rounded-xl disabled:opacity-30 disabled:cursor-not-allowed hover:opacity-90 transition-all flex items-center gap-2"
          >
            {loading ? <><Spinner />Signing in…</> : 'Sign in →'}
          </button>
        )}
      </div>

      <div className="mt-5 text-center">
        {mode === 'register' ? (
          <button
            onClick={() => switchMode('login')}
            className="text-sm text-slate-400 hover:text-gather-600 transition-colors"
          >
            Already have an account? Log in
          </button>
        ) : (
          <button
            onClick={() => switchMode('register')}
            className="text-sm text-slate-400 hover:text-gather-600 transition-colors"
          >
            ← New here? Register instead
          </button>
        )}
      </div>
    </div>
  )
}
