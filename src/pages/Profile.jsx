import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function Profile() {
  const navigate  = useNavigate()
  const [user, setUser]     = useState(null)
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)

  // ── Load current user ───────────────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data?.user) { navigate('/'); return }
      setUser(data.user)
    })
  }, [])

  // ── Load events for this user + subscribe to participant changes ─────────
  useEffect(() => {
    if (!user) return

    const fetchEvents = async () => {
      const { data, error } = await supabase
        .from('events')
        .select('*, participants(*)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (!error) setEvents(data || [])
      setLoading(false)
    }

    fetchEvents()

    // Real-time: re-fetch events whenever any participant row changes
    const channel = supabase
      .channel('profile-participants')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'participants' }, fetchEvents)
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [user])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    navigate('/')
  }

  const displayName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'there'

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-mist">
        <div className="text-slate-400">Loading your profile…</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-mist">
      {/* Header */}
      <header className="bg-white border-b border-slate-100 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <button
            onClick={() => navigate('/')}
            className="text-xl font-bold text-gather-700 tracking-tight"
          >
            gather
          </button>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-gather-500 flex items-center justify-center text-white text-sm font-bold">
                {displayName[0].toUpperCase()}
              </div>
              <span className="text-sm font-medium text-ink hidden sm:block">{displayName}</span>
            </div>
            <button
              onClick={handleSignOut}
              className="text-sm text-slate-400 hover:text-slate-600 transition-colors"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-10">
        {/* Welcome */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-ink">Hey, {displayName} 👋</h1>
            <p className="text-slate-400 mt-1">Here are all your gather events.</p>
          </div>
          <button
            onClick={() => navigate('/create')}
            className="px-5 py-2.5 bg-gather-600 text-white font-semibold rounded-xl hover:bg-gather-700 transition-all shadow-md shadow-gather-100 text-sm"
          >
            + New event
          </button>
        </div>

        {/* Events grid */}
        {events.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-100 p-16 text-center">
            <div className="text-5xl mb-4">📅</div>
            <h2 className="text-xl font-bold text-ink mb-2">No events yet</h2>
            <p className="text-slate-400 mb-6">Create your first event and start collecting availability.</p>
            <button
              onClick={() => navigate('/create')}
              className="px-6 py-3 bg-gather-600 text-white font-semibold rounded-xl hover:bg-gather-700 transition-all shadow-md shadow-gather-100"
            >
              Create event →
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {events.map(evt => {
              const participants = evt.participants || []
              const dates = evt.selected_dates || []
              const created = evt.created_at
                ? new Date(evt.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                : '—'

              return (
                <div
                  key={evt.id}
                  className="bg-white rounded-2xl border border-slate-100 p-5 hover:border-gather-200 hover:shadow-md transition-all cursor-pointer group"
                  onClick={() => navigate(`/event/${evt.id}/dashboard`)}
                >
                  {/* Event name + topic */}
                  <div className="mb-4">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-bold text-ink text-base leading-tight group-hover:text-gather-700 transition-colors">
                        {evt.name}
                      </h3>
                      {evt.topic && (
                        <span className="px-2 py-0.5 bg-gather-50 text-gather-600 text-xs font-medium rounded-full shrink-0">
                          {evt.topic}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 mt-1">Created {created}</p>
                  </div>

                  {/* Stats */}
                  <div className="flex items-center gap-4 mb-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-ink">{participants.length}</div>
                      <div className="text-xs text-slate-400">responses</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-ink">{dates.length}</div>
                      <div className="text-xs text-slate-400">dates</div>
                    </div>
                    <div className="ml-auto flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                      <span className="text-xs text-slate-400">Live</span>
                    </div>
                  </div>

                  {/* Participant avatars */}
                  {participants.length > 0 && (
                    <div className="flex items-center gap-1 mb-4">
                      {participants.slice(0, 5).map((p, i) => {
                        const colors = ['#4ade80','#60a5fa','#f472b6','#fb923c','#a78bfa']
                        return (
                          <div
                            key={p.id || i}
                            className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold border-2 border-white -ml-1 first:ml-0"
                            style={{ background: colors[i % colors.length] }}
                            title={p.name}
                          >
                            {(p.name || '?')[0].toUpperCase()}
                          </div>
                        )
                      })}
                      {participants.length > 5 && (
                        <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-xs text-slate-500 font-semibold -ml-1 border-2 border-white">
                          +{participants.length - 5}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex items-center justify-between text-xs font-semibold text-gather-600 group-hover:text-gather-700">
                    <span>View dashboard →</span>
                    <span className="capitalize text-slate-400">{evt.type}</span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
