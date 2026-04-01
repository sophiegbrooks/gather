import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom'
import { EventProvider } from './context/EventContext'
import { supabase } from './lib/supabase'
import Landing from './pages/Landing'
import Create from './pages/Create'
import HostDashboard from './pages/HostDashboard'
import ParticipantView from './pages/ParticipantView'
import Profile from './pages/Profile'
import Login from './pages/Login'

// Handles the redirect after email confirmation click
function AuthCallback() {
  const navigate = useNavigate()
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        navigate('/profile', { replace: true })
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  return (
    <div className="min-h-screen flex items-center justify-center bg-mist">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-gather-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-slate-400">Signing you in…</p>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <EventProvider>
        <Routes>
          <Route path="/"                       element={<Landing />} />
          <Route path="/create"                 element={<Create />} />
          <Route path="/profile"                element={<Profile />} />
          <Route path="/login"                  element={<Login />} />
          <Route path="/auth/callback"          element={<AuthCallback />} />
          <Route path="/event/:id/dashboard"    element={<HostDashboard />} />
          <Route path="/event/:id"              element={<ParticipantView />} />
        </Routes>
      </EventProvider>
    </BrowserRouter>
  )
}
