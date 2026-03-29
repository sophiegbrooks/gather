import { useState } from 'react'
import { supabase } from '../../lib/supabase'

export default function AuthStep({ user, onChange, onNext, onBack }) {
  const [mode, setMode]         = useState('guest')
  const [name, setName]         = useState(user?.name  || '')
  const [email, setEmail]       = useState(user?.email || '')
  const [loading, setLoading]   = useState(false)
  const [emailSent, setEmailSent] = useState(false)
  const [error, setError]       = useState(null)

  // ── Guest: no auth needed ──────────────────────────────────────────────────
  const handleGuest = () => {
    if (!name.trim()) return
    onChange({ name: name.trim(), email: email.trim() || null, isGuest: true })
    onNext()
  }

  // ── Magic link: Supabase sends a confirmation email ───────────────────────
  const handleMagicLink = async () => {
    if (!name.trim() || !email.trim()) return
    setLoading(true)
    setError(null)

    const { error: authError } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        data: { full_name: name.trim() },
        emailRedirectTo: window.location.origin,
      },
    })

    setLoading(false)

    if (authError) {
      setError(authError.message)
    } else {
      onChange({ name: name.trim(), email: email.trim(), isGuest: false })
      setEmailSent(true)
    }
  }

  // ── Google OAuth ───────────────────────────────────────────────────────────
  const handleGoogle = async () => {
    setLoading(true)
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    })
    if (oauthError) { setError(oauthError.message); setLoading(false) }
  }

  const isGuestValid  = name.trim().length >= 1
  const isSignInValid = name.trim().length >= 1 && email.trim().includes('@')

  // ── Email sent confirmation screen ────────────────────────────────────────
  if (emailSent) {
    return (
      <div className="w-full max-w-lg step-enter flex flex-col items-center text-center">
        <div className="w-16 h-16 bg-gather-100 rounded-2xl flex items-center justify-center text-3xl mb-5">
          📬
        </div>
        <p className="text-gather-600 text-sm font-semibold uppercase tracking-widest mb-3">
          5 → Almost there
        </p>
        <h2 className="text-4xl font-bold text-ink mb-3 leading-tight">Check your inbox</h2>
        <p className="text-slate-400 mb-1">We sent a magic link to</p>
        <p className="font-bold text-gather-600 text-lg mb-5">{email}</p>
        <p className="text-sm text-slate-400 mb-8 max-w-sm">
          Click the link in your email to verify your account — then come back here and continue.
        </p>

        {/* Continue anyway (user may confirm in another tab) */}
        <button
          onClick={onNext}
          className="w-full py-3 bg-gather-600 text-white font-semibold rounded-xl hover:bg-gather-700 transition-all shadow-md shadow-gather-100 mb-3"
        >
          I confirmed my email → Continue
        </button>

        <button
          onClick={() => setEmailSent(false)}
          className="text-sm text-slate-400 hover:text-slate-600 transition-colors"
        >
          ← Use a different email
        </button>
      </div>
    )
  }

  // ── Main form ──────────────────────────────────────────────────────────────
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
          onClick={() => { setMode('guest'); setError(null) }}
          className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${
            mode === 'guest' ? 'bg-white shadow-sm text-ink' : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          Continue as guest
        </button>
        <button
          onClick={() => { setMode('signin'); setError(null) }}
          className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${
            mode === 'signin' ? 'bg-white shadow-sm text-ink' : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          Sign in / create account
        </button>
      </div>

      {/* ── Guest form ── */}
      {mode === 'guest' && (
        <div className="space-y-4 animate-fade-in">
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1.5">Your name *</label>
            <input
              autoFocus
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && isGuestValid && handleGuest()}
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
              onKeyDown={e => e.key === 'Enter' && isGuestValid && handleGuest()}
              placeholder="alex@example.com"
              className="w-full px-4 py-3.5 border-2 border-slate-200 focus:border-gather-500 rounded-xl outline-none text-ink font-medium transition-colors"
            />
          </div>
        </div>
      )}

      {/* ── Sign in / create account form ── */}
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
              onKeyDown={e => e.key === 'Enter' && isSignInValid && !loading && handleMagicLink()}
              placeholder="your@email.com"
              className="w-full px-4 py-3.5 border-2 border-slate-200 focus:border-gather-500 rounded-xl outline-none text-ink font-medium transition-colors"
            />
          </div>

          <p className="text-xs text-slate-400 pt-1">
            We'll send a magic link to your email — no password needed.
          </p>

          {/* Error */}
          {error && (
            <div className="px-4 py-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-500">
              {error}
            </div>
          )}

          {/* Divider + social */}
          <div className="pt-2">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex-1 h-px bg-slate-100" />
              <span className="text-xs text-slate-400">or continue with</span>
              <div className="flex-1 h-px bg-slate-100" />
            </div>
            <button
              onClick={handleGoogle}
              disabled={loading}
              className="w-full py-3 border-2 border-slate-200 rounded-xl text-sm font-medium text-slate-500 hover:border-gather-300 hover:text-gather-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continue with Google
            </button>
          </div>
        </div>
      )}

      {/* ── Footer buttons ── */}
      <div className="flex items-center justify-between mt-8">
        <button onClick={onBack} className="text-slate-400 hover:text-slate-600 transition-colors text-sm font-medium">
          ← Back
        </button>

        {mode === 'guest' ? (
          <button
            onClick={handleGuest}
            disabled={!isGuestValid}
            className="px-6 py-3 bg-gather-600 text-white font-semibold rounded-xl disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gather-700 transition-all hover:scale-[1.02] active:scale-[0.98] shadow-md shadow-gather-100"
          >
            Continue →
          </button>
        ) : (
          <button
            onClick={handleMagicLink}
            disabled={!isSignInValid || loading}
            className="px-6 py-3 bg-gather-600 text-white font-semibold rounded-xl disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gather-700 transition-all hover:scale-[1.02] active:scale-[0.98] shadow-md shadow-gather-100 flex items-center gap-2"
          >
            {loading ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                </svg>
                Sending…
              </>
            ) : 'Send magic link →'}
          </button>
        )}
      </div>
    </div>
  )
}
