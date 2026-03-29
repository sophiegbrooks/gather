import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useEvent } from '../context/EventContext'

const ALL_SLOTS = (() => {
  const slots = []
  for (let h = 6; h <= 22; h++) {
    slots.push(`${String(h).padStart(2,'0')}:00`)
    if (h < 22) slots.push(`${String(h).padStart(2,'0')}:30`)
  }
  return slots
})()

function formatSlot(slot) {
  const [h, m] = slot.split(':').map(Number)
  const ampm = h < 12 ? 'AM' : 'PM'
  const hour = h === 0 ? 12 : h > 12 ? h - 12 : h
  return `${hour}:${m === 0 ? '00' : m} ${ampm}`
}

function parseKey(key) {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d)
}

// Compute best slots (most participants available)
function getBestSlots(event) {
  const scores = {}
  const participants = event.participants || []
  if (participants.length === 0) return []

  event.selectedDates?.forEach(date => {
    const hostSlots = event.timeSlots?.[date] || []
    hostSlots.forEach(slot => {
      const key = `${date}|${slot}`
      scores[key] = participants.filter(p =>
        (p.availability?.[date] || []).includes(slot)
      ).length
    })
  })

  return Object.entries(scores)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .filter(([, count]) => count > 0)
    .map(([key, count]) => {
      const [date, slot] = key.split('|')
      const d = parseKey(date)
      return {
        label: d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
        slot: formatSlot(slot),
        count,
        total: participants.length,
        pct: Math.round((count / participants.length) * 100),
      }
    })
}

export default function HostDashboard() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { event, loadEventFromStorage } = useEvent()
  const [copied, setCopied] = useState(false)
  const [activeDate, setActiveDate] = useState(null)

  // Poll for updates every 3s
  useEffect(() => {
    loadEventFromStorage(id)
    const interval = setInterval(() => loadEventFromStorage(id), 3000)
    return () => clearInterval(interval)
  }, [id])

  const inviteLink = `${window.location.origin}/event/${id}`

  const handleCopy = () => {
    navigator.clipboard.writeText(inviteLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const participants = event.participants || []
  const bestSlots   = getBestSlots(event)

  // Heatmap: for selected date, show slot → count
  const activeSlots = activeDate ? (event.timeSlots?.[activeDate] || []) : []
  const slotCounts = activeDate
    ? Object.fromEntries(
        activeSlots.map(s => [
          s,
          participants.filter(p => (p.availability?.[activeDate] || []).includes(s)).length,
        ])
      )
    : {}
  const maxCount = Math.max(1, ...Object.values(slotCounts))

  if (!event.id) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-slate-400">Loading event…</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-mist">
      {/* Header */}
      <header className="bg-white border-b border-slate-100 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/')} className="text-xl font-bold text-gather-700 tracking-tight">
              gather
            </button>
            <span className="text-slate-300">›</span>
            <h1 className="font-semibold text-ink truncate max-w-xs">{event.name}</h1>
            {event.topic && (
              <span className="px-2.5 py-1 bg-gather-50 text-gather-600 text-xs font-medium rounded-full">
                {event.topic}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              <span className="text-sm text-slate-500">Live</span>
            </div>
            <button
              onClick={handleCopy}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                copied ? 'bg-gather-500 text-white' : 'bg-gather-50 text-gather-700 hover:bg-gather-100'
              }`}
            >
              {copied ? '✓ Link copied!' : '🔗 Share link'}
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Left column */}
        <div className="lg:col-span-2 space-y-6">

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'Participants', value: participants.length, icon: '👥' },
              { label: 'Dates proposed', value: event.selectedDates?.length || 0, icon: '📅' },
              { label: 'Response rate', value: participants.length > 0 ? '100%' : '—', icon: '📊' },
            ].map(stat => (
              <div key={stat.label} className="bg-white rounded-2xl border border-slate-100 p-5">
                <span className="text-2xl mb-2 block">{stat.icon}</span>
                <div className="text-3xl font-bold text-ink">{stat.value}</div>
                <div className="text-sm text-slate-400 mt-1">{stat.label}</div>
              </div>
            ))}
          </div>

          {/* Best times */}
          <div className="bg-white rounded-2xl border border-slate-100 p-6">
            <h2 className="font-bold text-ink mb-4 flex items-center gap-2">
              ✨ Best times
              {participants.length === 0 && (
                <span className="text-xs text-slate-400 font-normal">Waiting for responses…</span>
              )}
            </h2>
            {bestSlots.length === 0 ? (
              <div className="py-8 text-center">
                <div className="text-4xl mb-3">⏳</div>
                <p className="text-slate-400">Share the link to start collecting availability.</p>
                <div className="mt-4 flex items-center gap-2 bg-slate-50 rounded-xl px-4 py-3 max-w-sm mx-auto">
                  <span className="text-slate-400 text-sm font-mono truncate">{inviteLink}</span>
                  <button onClick={handleCopy} className="text-gather-600 text-sm font-semibold shrink-0 hover:text-gather-700">
                    {copied ? '✓' : 'Copy'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {bestSlots.map((s, i) => (
                  <div key={i} className="flex items-center gap-4">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold ${
                      i === 0 ? 'bg-gather-500 text-white' : 'bg-gather-100 text-gather-600'
                    }`}>
                      {i + 1}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold text-ink text-sm">{s.label} · {s.slot}</span>
                        <span className="text-sm text-slate-400">{s.count}/{s.total}</span>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gather-500 rounded-full transition-all duration-500"
                          style={{ width: `${s.pct}%` }}
                        />
                      </div>
                    </div>
                    <span className="text-sm font-bold text-gather-600 w-10 text-right">{s.pct}%</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Availability heatmap */}
          <div className="bg-white rounded-2xl border border-slate-100 p-6">
            <h2 className="font-bold text-ink mb-4">Availability heatmap</h2>
            {event.selectedDates?.length === 0 ? (
              <p className="text-slate-400 text-sm">No dates selected yet.</p>
            ) : (
              <>
                <div className="flex flex-wrap gap-2 mb-5">
                  {event.selectedDates?.map(d => {
                    const obj = parseKey(d)
                    const label = obj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                    return (
                      <button
                        key={d}
                        onClick={() => setActiveDate(activeDate === d ? null : d)}
                        className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                          activeDate === d
                            ? 'bg-gather-600 text-white'
                            : 'bg-gather-50 text-gather-700 hover:bg-gather-100'
                        }`}
                      >
                        {label}
                      </button>
                    )
                  })}
                </div>

                {activeDate ? (
                  <div className="space-y-1 max-h-64 overflow-y-auto">
                    {activeSlots.map(slot => {
                      const count = slotCounts[slot] || 0
                      const pct   = participants.length > 0 ? count / maxCount : 0
                      return (
                        <div key={slot} className="flex items-center gap-3">
                          <span className="text-xs text-slate-400 w-20 shrink-0">{formatSlot(slot)}</span>
                          <div className="flex-1 h-6 bg-slate-50 rounded-lg overflow-hidden">
                            <div
                              className="h-full rounded-lg transition-all duration-300"
                              style={{
                                width: `${pct * 100}%`,
                                background: `rgba(34, 197, 94, ${0.2 + pct * 0.8})`,
                              }}
                            />
                          </div>
                          <span className="text-xs text-slate-400 w-8 text-right">{count}</span>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <p className="text-slate-400 text-sm">Select a date above to see the heatmap.</p>
                )}
              </>
            )}
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-6">
          {/* Participants */}
          <div className="bg-white rounded-2xl border border-slate-100 p-6">
            <h2 className="font-bold text-ink mb-4 flex items-center justify-between">
              Participants
              <span className="text-xs text-slate-400 font-normal">Auto-refreshing</span>
            </h2>
            {participants.length === 0 ? (
              <div className="py-6 text-center">
                <div className="text-3xl mb-2">🌐</div>
                <p className="text-slate-400 text-sm">No responses yet.<br />Share the link below.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {participants.map((p, i) => {
                  const slotCount = (() => {
                    let total = 0
                    Object.values(p.availability || {}).forEach(slots => {
                      if (!slots?.length) return
                      let frames = 1
                      for (let i = 1; i < slots.length; i++) {
                        const [ph, pm] = slots[i-1].split(':').map(Number)
                        const [ch, cm] = slots[i].split(':').map(Number)
                        if ((ch * 60 + cm) - (ph * 60 + pm) > 15) frames++
                      }
                      total += frames
                    })
                    return total
                  })()
                  const colors = ['#4ade80','#60a5fa','#f472b6','#fb923c','#a78bfa','#34d399']
                  return (
                    <div key={p.id || i} className="flex items-center gap-3">
                      <div
                        className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0"
                        style={{ background: colors[i % colors.length] }}
                      >
                        {(p.name || '?')[0].toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-ink text-sm">{p.name}</div>
                        <div className="text-xs text-slate-400">{slotCount} time frame{slotCount !== 1 ? 's' : ''} marked</div>
                      </div>
                      <span className="w-2 h-2 rounded-full bg-green-400" />
                    </div>
                  )
                })}
              </div>
            )}

            {/* Invite link */}
            <div className="mt-5 pt-4 border-t border-slate-50">
              <p className="text-xs text-slate-400 mb-2">Invite link</p>
              <div className="flex gap-2">
                <div className="flex-1 px-3 py-2 bg-slate-50 rounded-lg text-xs text-slate-400 font-mono truncate">
                  {inviteLink}
                </div>
                <button
                  onClick={handleCopy}
                  className="px-3 py-2 bg-gather-50 text-gather-700 text-xs font-semibold rounded-lg hover:bg-gather-100 transition-colors"
                >
                  {copied ? '✓' : 'Copy'}
                </button>
              </div>
            </div>
          </div>

          {/* Event details */}
          <div className="bg-white rounded-2xl border border-slate-100 p-6">
            <h2 className="font-bold text-ink mb-4">Event details</h2>
            <dl className="space-y-3 text-sm">
              <div>
                <dt className="text-slate-400">Name</dt>
                <dd className="font-semibold text-ink mt-0.5">{event.name}</dd>
              </div>
              {event.topic && (
                <div>
                  <dt className="text-slate-400">Topic</dt>
                  <dd className="font-semibold text-ink mt-0.5">{event.topic}</dd>
                </div>
              )}
              <div>
                <dt className="text-slate-400">Format</dt>
                <dd className="font-semibold text-ink mt-0.5 capitalize">{event.type}</dd>
              </div>
              <div>
                <dt className="text-slate-400">Hosted by</dt>
                <dd className="font-semibold text-ink mt-0.5">{event.user?.name || 'Guest'}</dd>
              </div>
              <div>
                <dt className="text-slate-400">Created</dt>
                <dd className="font-semibold text-ink mt-0.5">
                  {event.createdAt ? new Date(event.createdAt).toLocaleDateString() : '—'}
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </div>
    </div>
  )
}
