import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useEvent } from '../context/EventContext'

function formatSlot(slot) {
  const [h, m] = slot.split(':').map(Number)
  const ampm = h < 12 ? 'AM' : 'PM'
  const hour = h === 0 ? 12 : h > 12 ? h - 12 : h
  return `${hour}:${String(m).padStart(2,'0')} ${ampm}`
}

function formatSlotRange(slot, durationMin) {
  const [h, m] = slot.split(':').map(Number)
  let endTotal = h * 60 + m + durationMin
  const endH = Math.floor(endTotal / 60) % 24
  const endM = endTotal % 60
  return `${formatSlot(slot)} – ${formatSlot(`${String(endH).padStart(2,'0')}:${String(endM).padStart(2,'0')}`)}`
}

function parseKey(key) {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export default function SignupView() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { event, loadEventFromStorage, addSignup } = useEvent()

  const [loading,    setLoading]    = useState(true)
  const [notFound,   setNotFound]   = useState(false)
  const [modal,      setModal]      = useState(null)   // { date, slot }
  const [name,       setName]       = useState('')
  const [email,      setEmail]      = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [confirmed,  setConfirmed]  = useState(null)   // { date, slot, name }
  const [error,      setError]      = useState(null)

  // Load event on mount and poll for updates
  useEffect(() => {
    const load = async () => {
      const data = await loadEventFromStorage(id)
      if (!data) { setNotFound(true); setLoading(false); return }
      if (data.type !== 'signup') { navigate(`/event/${id}`); return }
      setLoading(false)
    }
    load()
    const interval = setInterval(() => loadEventFromStorage(id), 5000)
    return () => clearInterval(interval)
  }, [id])

  if (loading) return (
    <div className="min-h-screen bg-mist flex items-center justify-center">
      <div className="w-10 h-10 border-4 border-gather-400 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (notFound) return (
    <div className="min-h-screen bg-mist flex items-center justify-center text-center px-6">
      <div>
        <div className="text-5xl mb-4">🔍</div>
        <h1 className="text-2xl font-bold text-ink mb-2">Sign-up not found</h1>
        <p className="text-slate-400">This link may have expired or been removed.</p>
      </div>
    </div>
  )

  // Build slot → who signed up map
  const signupMap = {}   // { "date|slot": participantName }
  ;(event.participants || []).forEach(p => {
    Object.entries(p.availability || {}).forEach(([date, slots]) => {
      slots.forEach(slot => {
        signupMap[`${date}|${slot}`] = p.name
      })
    })
  })

  const slotDuration = event.slotDuration || 30
  const dates = event.selectedDates || []
  const hostName = event.user?.name || 'the host'

  const handleClaim = async () => {
    if (!name.trim() || !modal) return
    setSubmitting(true)
    setError(null)
    const key = `${modal.date}|${modal.slot}`
    if (signupMap[key]) {
      setError('This slot was just taken — please pick another.')
      setSubmitting(false)
      return
    }
    await addSignup(id, { name: name.trim(), email: email.trim() || null, date: modal.date, slot: modal.slot })
    setConfirmed({ date: modal.date, slot: modal.slot, name: name.trim() })
    setModal(null)
    setName('')
    setEmail('')
    setSubmitting(false)
  }

  // Confirmation screen
  if (confirmed) {
    const dateObj  = parseKey(confirmed.date)
    const dateLabel = dateObj.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
    const timeLabel = formatSlotRange(confirmed.slot, slotDuration)
    return (
      <div className="min-h-screen bg-mist flex items-center justify-center px-6">
        <div className="max-w-md w-full bg-white rounded-3xl border border-slate-100 shadow-xl p-10 text-center animate-slide-up">
          <div className="w-16 h-16 bg-gather-100 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-5">✅</div>
          <h1 className="text-2xl font-bold text-ink mb-2">You're signed up!</h1>
          <p className="text-slate-400 mb-6">
            <span className="font-semibold text-ink">{confirmed.name}</span> is confirmed for
          </p>
          <div className="bg-gather-50 rounded-2xl border border-gather-100 p-5 mb-6">
            <p className="font-bold text-gather-700 text-lg">{timeLabel}</p>
            <p className="text-slate-500 text-sm mt-1">{dateLabel}</p>
          </div>
          <p className="text-sm text-slate-400 mb-6">Organized by {hostName} · {event.name}</p>
          <button
            onClick={() => setConfirmed(null)}
            className="text-sm text-gather-600 hover:text-gather-800 font-medium transition-colors"
          >
            ← View all slots
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-mist">
      {/* Header */}
      <header className="bg-white border-b border-slate-100 px-6 py-5">
        <div className="max-w-3xl mx-auto">
          <button onClick={() => navigate('/')} className="text-sm font-bold text-gather-700 mb-3 block tracking-tight">
            gather<span className="inline-block w-1 h-1 rounded-full bg-gather-500 ml-1 mb-0.5" />
          </button>
          <h1 className="text-2xl font-bold text-ink leading-tight">{event.name}</h1>
          <p className="text-slate-400 text-sm mt-1">
            Organized by {hostName}
            {event.timezone && ` · ${event.timezone.replace('_', ' ')}`}
          </p>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-8 space-y-8">
        <p className="text-slate-500">
          Click an available slot below to sign up. Each slot can only be claimed once.
        </p>

        {dates.map(date => {
          const dateObj   = parseKey(date)
          const dateLabel = dateObj.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
          const slots     = event.timeSlots?.[date] || []
          const filled    = slots.filter(s => signupMap[`${date}|${s}`]).length

          return (
            <div key={date} className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
              {/* Date header */}
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <p className="font-bold text-ink">{dateLabel}</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {filled} of {slots.length} slot{slots.length !== 1 ? 's' : ''} taken
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-gather-600">{slots.length - filled}</p>
                  <p className="text-xs text-slate-400">open</p>
                </div>
              </div>

              {/* Slot list */}
              <div className="divide-y divide-slate-50">
                {slots.map(slot => {
                  const key    = `${date}|${slot}`
                  const takenBy = signupMap[key]
                  return (
                    <div
                      key={slot}
                      className={`px-6 py-3.5 flex items-center justify-between transition-colors ${
                        takenBy ? 'bg-white' : 'hover:bg-gather-50 cursor-pointer'
                      }`}
                      onClick={() => !takenBy && setModal({ date, slot })}
                    >
                      <span className="text-sm font-semibold text-ink">
                        {formatSlotRange(slot, slotDuration)}
                      </span>
                      {takenBy ? (
                        <span className="flex items-center gap-2 text-sm text-slate-400">
                          <span className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-500">
                            {takenBy[0].toUpperCase()}
                          </span>
                          {takenBy}
                        </span>
                      ) : (
                        <span className="px-3 py-1 rounded-full bg-gather-100 text-gather-700 text-xs font-semibold hover:bg-gather-200 transition-colors">
                          Sign up →
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </main>

      {/* Sign-up modal */}
      {modal && (
        <div
          className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 px-6"
          onClick={e => e.target === e.currentTarget && setModal(null)}
        >
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-8 animate-slide-up">
            <h2 className="text-xl font-bold text-ink mb-1">Sign up for this slot</h2>
            <p className="text-sm text-slate-400 mb-5">
              {formatSlotRange(modal.slot, slotDuration)} ·{' '}
              {parseKey(modal.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </p>

            <div className="space-y-3 mb-6">
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Your name *</label>
                <input
                  autoFocus
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && name.trim() && handleClaim()}
                  placeholder="e.g. Alex Johnson"
                  className="w-full px-4 py-3 border-2 border-slate-200 focus:border-gather-500 rounded-xl outline-none text-ink font-medium transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">
                  Email <span className="font-normal text-slate-400">(optional)</span>
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="alex@example.com"
                  className="w-full px-4 py-3 border-2 border-slate-200 focus:border-gather-500 rounded-xl outline-none text-ink font-medium transition-colors"
                />
              </div>
              {error && (
                <p className="text-sm text-red-500 bg-red-50 px-4 py-2 rounded-xl">{error}</p>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => { setModal(null); setError(null) }}
                className="flex-1 py-3 rounded-xl border-2 border-slate-200 text-slate-500 font-semibold text-sm hover:border-slate-300 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleClaim}
                disabled={!name.trim() || submitting}
                className="flex-1 py-3 rounded-xl bg-gather-600 text-white font-semibold text-sm disabled:opacity-40 hover:bg-gather-700 transition-all shadow-md shadow-gather-100"
              >
                {submitting ? 'Saving…' : 'Confirm →'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
