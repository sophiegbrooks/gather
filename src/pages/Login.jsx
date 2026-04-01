import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function Login() {
  const navigate = useNavigate()
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState(null)

  const handleLogin = async () => {
    if (!email.trim() || !password) return
    setLoading(true); setError(null)

    const { error: authError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    })

    setLoading(false)
    if (authError) {
      setError('Wrong email or password. Try again or sign up.')
    } else {
      navigate('/profile', { replace: true })
    }
  }

  const Spinner = () => (
    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
    </svg>
  )

  return (
    <div className="min-h-screen bg-mist flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-md">
        {/* Logo */}
        <button onClick={() => navigate('/')} className="flex items-center gap-2 mb-10">
          <span className="text-2xl font-bold text-gather-700 tracking-tight">gather</span>
          <span className="w-1.5 h-1.5 rounded-full bg-gather-500 mt-1" />
        </button>

        <h1 className="text-3xl font-bold text-ink mb-1">Welcome back</h1>
        <p className="text-slate-400 mb-8">Sign in to your Gather account.</p>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1.5">Email</label>
            <input
              autoFocus
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !loading && handleLogin()}
              placeholder="your@email.com"
              className="w-full px-4 py-3.5 border-2 border-slate-200 focus:border-gather-500 rounded-xl outline-none text-ink font-medium transition-colors bg-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1.5">Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !loading && handleLogin()}
              placeholder="Your password"
              className="w-full px-4 py-3.5 border-2 border-slate-200 focus:border-gather-500 rounded-xl outline-none text-ink font-medium transition-colors bg-white"
            />
          </div>

          {error && (
            <div className="px-4 py-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-500">
              {error}
            </div>
          )}

          <button
            onClick={handleLogin}
            disabled={!email.includes('@') || password.length < 1 || loading}
            className="w-full py-3.5 bg-ink text-white font-semibold rounded-xl disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-800 transition-all flex items-center justify-center gap-2 shadow-md"
          >
            {loading ? <><Spinner />Signing in…</> : 'Sign in →'}
          </button>
        </div>

        <p className="text-sm text-slate-400 mt-6 text-center">
          Don't have an account?{' '}
          <button onClick={() => navigate('/create')} className="text-gather-600 font-medium hover:underline">
            Sign up
          </button>
        </p>
      </div>
    </div>
  )
}
