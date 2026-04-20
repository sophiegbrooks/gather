import { useEffect, useState, useRef } from 'react'
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
  const endTotal = h * 60 + m + durationMin
  const endH = Math.floor(endTotal / 60) % 24
  const endM = endTotal % 60
  return `${formatSlot(slot)} – ${formatSlot(`${String(endH).padStart(2,'0')}:${String(endM).padStart(2,'0')}`)}`
}

function parseKey(key) {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export default function SignupDashboard() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { event, loadEventFromStorage } = useEvent()

  const [loading,     setLoading]     = useState(true)
  const [notFound,    setNotFound]    = useState(false)
  const [shareOpen,   setShareOpen]   = useState(false)
  const [copied,      setCopied]      = useState(false)
  const shareRef = useRef(null)

  // Load on mount + poll every 3 s
  useEffect(() => {
    const load = async () => {
      const data = await loadEventFromStorage(id)
      if (!data) { setNotFound(true) }
      setLoading(false)
    }
    load()
    const interval = setInterval(() => loadEventFromStorage(id), 3000)
    return () => clearInterval(interval)
  }, [id])

  // Close share dropdown on outside click
  useEffect(() => {
    const handler = e => {
      if (shareRef.current && !shareRef.current.contains(e.target)) setShareOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const signupLink = `${window.location.origin}/signup/${id}`

  const copyLink = () => {
    navigator.clipboard.writeText(signupLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const shareViaEmail = () => {
    const subject = encodeURIComponent(`Sign up: ${event.name}`)
    const body    = encodeURIComponent(`Hi!\n\nPlease sign up for a slot at:\n${signupLink}\n\nThanks!`)
    window.open(`mailto:?subject=${subject}&body=${body}`)
  }

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
        <p className="text-slate-400">This event may have been removed.</p>
      </div>
    </div>
  )

  const slotDuration = event.slotDuration || 30
  const dates        = event.selectedDates || []
  const participants = event.participants  || []

  // Build slot → participant map
  const signupMap = {}
  participants.forEach(p => {
    Object.entries(p.availability || {}).forEach(([date, slots]) => {
      slots.forEach(slot => { signupMap[`${date}|${slot}`] = p })
    })
  })

  const totalSlots  = dates.reduce((sum, d) => sum + (event.timeSlots?.[d]?.length || 0), 0)
  const filledSlots = Object.keys(signupMap).length
  const pct         = totalSlots > 0 ? Math.round((filledSlots / totalSlots) * 100) : 0

  return (
    <div className="min-h-screen bg-mist">
      {/* Header */}
      <header className="bg-white border-b border-slate-100 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            <button onClick={() => navigate('/')} className="text-lg font-bold text-gather-700 shrink-0 tracking-tight">
              gather<span className="inline-block w-1 h-1 rounded-full bg-gather-500 ml-1 mb-0.5" />
            </button>
            <div className="min-w-0">
              <h1 className="font-bold text-ink text-lg leading-tight truncate">{event.name}</h1>
              <p className="text-xs text-slate-400">
                {event.user?.name && `by ${event.user.name} · `}Sign-up sheet
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Share invite */}
            <div className="relative" ref={shareRef}>
              <button
                onClick={() => setShareOpen(o => !o)}
                className="flex items-center gap-1.5 px-4 py-2 bg-gather-600 text-white text-sm font-semibold rounded-xl hover:bg-gather-700 transition-all shadow-md shadow-gather-100"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
                Share sign-up
              </button>
              {shareOpen && (
                <div className="absolute right-0 top-full mt-2 bg-white rounded-2xl border border-slate-100 shadow-xl p-2 w-56 z-20 animate-fade-in">
                  <button
                    onClick={() => { copyLink(); setShareOpen(false) }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl hover:bg-gather-50 text-sm font-medium text-ink transition-colors"
                  >
                    <span>{copied ? '✓ Copied!' : '🔗 Copy link'}</span>
                  </button>
                  <button
                    onClick={() => { shareViaEmail(); setShareOpen(false) }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl hover:bg-gather-50 text-sm font-medium text-ink transition-colors"
                  >
                    <span>✉️ Send email</span>
                  </button>
                  {navigator.share && (
                    <button
                      onClick={() => { navigator.share({ title: event.name, url: signupLink }); setShareOpen(false) }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl hover:bg-gather-50 text-sm font-medium text-ink transition-colors"
                    >
                      <span>↑ Share via…</span>
                    </button>
                  )}
                  <div className="px-4 py-2 mt-1 border-t border-slate-50">
                    <p className="text-[11px] text-slate-400 truncate">{signupLink}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8 space-y-6">

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Total slots',  value: totalSlots  },
            { label: 'Claimed',      value: filledSlots },
            { label: 'Open',         value: totalSlots - filledSlots },
          ].map(stat => (
            <div key={stat.label} className="bg-white rounded-2xl border border-slate-100 p-5 text-center">
              <p className="text-3xl font-bold text-ink">{stat.value}</p>
              <p className="text-xs text-slate-400 mt-1">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Fill progress */}
        {totalSlots > 0 && (
          <div className="bg-white rounded-2xl border border-slate-100 px-6 py-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-semibold text-ink">Fill rate</p>
              <p className="text-sm font-bold text-gather-600">{pct}%</p>
            </div>
            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gather-500 rounded-full transition-all duration-700"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        )}

        {/* Slot tables per date */}
        {dates.map(date => {
          const dateObj   = parseKey(date)
          const dateLabel = dateObj.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
          const slots     = event.timeSlots?.[date] || []
          const dayFilled = slots.filter(s => signupMap[`${date}|${s}`]).length

          return (
            <div key={date} className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
              {/* Date header */}
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div>
                  <p className="font-bold text-ink">{dateLabel}</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {dayFilled}/{slots.length} slots claimed
                  </p>
                </div>
                {dayFilled === slots.length && slots.length > 0 && (
                  <span className="px-3 py-1 bg-gather-100 text-gather-700 text-xs font-bold rounded-full">Full</span>
                )}
              </div>

              {/* Slot rows */}
              {slots.length === 0 ? (
                <p className="px-6 py-4 text-sm text-slate-400 italic">No slots for this date.</p>
              ) : (
                <div className="divide-y divide-slate-50">
                  {slots.map(slot => {
                    const key = `${date}|${slot}`
                    const p   = signupMap[key]
                    return (
                      <div key={slot} className={`px-6 py-3.5 flex items-center justify-between ${p ? '' : 'opacity-50'}`}>
                        <span className="text-sm font-semibold text-ink w-44 shrink-0">
                          {formatSlotRange(slot, slotDuration)}
                        </span>
                        {p ? (
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div className="w-7 h-7 rounded-full bg-gather-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
                              {p.name[0].toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-ink truncate">{p.name}</p>
                              {p.email && <p className="text-xs text-slate-400 truncate">{p.email}</p>}
                            </div>
                            <span className="ml-auto text-[10px] font-semibold text-gather-600 bg-gather-50 px-2 py-0.5 rounded-full shrink-0">Claimed</span>
                          </div>
                        ) : (
                          <span className="text-sm text-slate-300 italic">Open</span>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}

        {/* Empty state */}
        {participants.length === 0 && (
          <div className="bg-white rounded-2xl border border-slate-100 p-10 text-center">
            <div className="text-4xl mb-4">📋</div>
            <h2 className="text-lg font-bold text-ink mb-2">No sign-ups yet</h2>
            <p className="text-slate-400 text-sm mb-5">Share the link below and slots will fill in here as people sign up.</p>
            <button
              onClick={copyLink}
              className="px-5 py-2.5 bg-gather-600 text-white font-semibold rounded-xl hover:bg-gather-700 transition-all shadow-md shadow-gather-100 text-sm"
            >
              {copied ? '✓ Link copied!' : '🔗 Copy sign-up link'}
            </button>
          </div>
        )}
      </main>
    </div>
  )
}
