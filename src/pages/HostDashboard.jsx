import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useEvent } from '../context/EventContext'
import { supabase } from '../lib/supabase'

const COLORS = ['#4ade80','#60a5fa','#f472b6','#fb923c','#a78bfa','#34d399']

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

function addFifteen(slot) {
  const [h, m] = slot.split(':').map(Number)
  const total = h * 60 + m + 15
  return `${String(Math.floor(total / 60)).padStart(2,'0')}:${String(total % 60).padStart(2,'0')}`
}

// Group sorted slot strings into contiguous runs (gap > 15 min = new block)
function getBlocks(slots) {
  if (!slots.length) return []
  const sorted = [...slots].sort()
  const blocks = []
  let block = [sorted[0]]
  for (let i = 1; i < sorted.length; i++) {
    const [ph, pm] = block[block.length - 1].split(':').map(Number)
    const [ch, cm] = sorted[i].split(':').map(Number)
    if ((ch * 60 + cm) - (ph * 60 + pm) <= 15) {
      block.push(sorted[i])
    } else {
      blocks.push(block)
      block = [sorted[i]]
    }
  }
  blocks.push(block)
  return blocks
}

// Returns a green color interpolated from near-white (pct=0) to deep green (pct=1)
function heatColor(pct) {
  if (pct <= 0) return '#f1f5f9' // slate-100 for zero
  // Interpolate from light green (#bbf7d0, green-200) to deep green (#15803d, green-700)
  const r = Math.round(187 + (21  - 187) * pct)
  const g = Math.round(247 + (128 - 247) * pct)
  const b = Math.round(208 + (61  - 208) * pct)
  return `rgb(${r},${g},${b})`
}

function formatBlockRange(block) {
  const start = formatSlot(block[0])
  const end   = formatSlot(addFifteen(block[block.length - 1]))
  const sAp = start.slice(-2), eAp = end.slice(-2)
  return sAp === eAp
    ? `${start.slice(0, -3)} – ${end}`
    : `${start} – ${end}`
}

export default function HostDashboard() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { event, loadEventFromStorage } = useEvent()
  const [copied, setCopied]     = useState(false)
  const [authUser, setAuthUser] = useState(undefined)

  useEffect(() => {
    loadEventFromStorage(id)
    const interval = setInterval(() => loadEventFromStorage(id), 3000)
    return () => clearInterval(interval)
  }, [id])

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setAuthUser(data?.user ?? null))
  }, [])

  const inviteLink   = `${window.location.origin}/event/${id}`
  const participants = event.participants || []

  const handleCopy = () => {
    navigator.clipboard.writeText(inviteLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // Find the single global best block (highest participant overlap, earliest date wins ties)
  let bestBlockKey = null
  let bestCount    = 0
  ;(event.selectedDates || []).forEach(date => {
    const slots = [...(event.timeSlots?.[date] || [])].sort()
    getBlocks(slots).forEach((block, bi) => {
      const count = participants.filter(p =>
        block.some(s => (p.availability?.[date] || []).includes(s))
      ).length
      if (count > bestCount) {
        bestCount    = count
        bestBlockKey = `${date}|${bi}`
      }
    })
  })

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
              {copied ? '✓ Link copied!' : 'Share link'}
            </button>
            {authUser ? (
              <button
                onClick={() => navigate('/profile')}
                className="flex items-center gap-2 group"
                title="Go to your profile"
              >
                <div className="w-8 h-8 rounded-full bg-gather-500 flex items-center justify-center text-white text-sm font-bold group-hover:bg-gather-600 transition-colors">
                  {(authUser.user_metadata?.full_name || authUser.email || '?')[0].toUpperCase()}
                </div>
              </button>
            ) : authUser === null && (
              <button
                onClick={() => navigate('/login?signup=1')}
                className="px-4 py-2 border-2 border-gather-200 text-gather-700 text-sm font-semibold rounded-xl hover:bg-gather-50 transition-all"
              >
                Save events — sign up
              </button>
            )}
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ── Left column ── */}
        <div className="lg:col-span-2 space-y-6">

          {/* Stats row */}
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: 'Participants', value: participants.length },
              { label: 'Dates proposed', value: event.selectedDates?.length || 0 },
            ].map(stat => (
              <div key={stat.label} className="bg-white rounded-2xl border border-slate-100 p-5">
                <div className="text-3xl font-bold text-ink">{stat.value}</div>
                <div className="text-sm text-slate-400 mt-1">{stat.label}</div>
              </div>
            ))}
          </div>

          {/* Availability heatmap */}
          <div className="bg-white rounded-2xl border border-slate-100 p-6">
            <div className="flex items-center justify-between mb-1">
              <h2 className="font-bold text-ink">Availability</h2>
              {participants.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-slate-400">0%</span>
                  <div className="flex gap-px">
                    {[0.15, 0.35, 0.55, 0.75, 1].map(v => (
                      <div
                        key={v}
                        className="w-4 h-3 rounded-sm"
                        style={{ background: heatColor(v) }}
                      />
                    ))}
                  </div>
                  <span className="text-[10px] text-slate-400">100%</span>
                </div>
              )}
            </div>
            <p className="text-xs text-slate-400 mb-5">
              {participants.length === 0
                ? 'Waiting for responses — share the invite link below.'
                : `Darker = more people available. Hover a slot to see who's free.`}
            </p>

            {participants.length === 0 ? (
              <div className="py-6 text-center">
                <div className="flex items-center gap-2 bg-slate-50 rounded-xl px-4 py-3 max-w-sm mx-auto">
                  <span className="text-slate-400 text-sm font-mono truncate">{inviteLink}</span>
                  <button onClick={handleCopy} className="text-gather-600 text-sm font-semibold shrink-0 hover:text-gather-700">
                    {copied ? '✓' : 'Copy'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto -mx-6 px-6 pb-2">
                <div className="flex gap-3 min-w-max">
                  {(event.selectedDates || []).map(date => {
                    const hostSlots = [...(event.timeSlots?.[date] || [])].sort()
                    const blocks    = getBlocks(hostSlots)
                    const dateObj   = parseKey(date)
                    const weekday   = dateObj.toLocaleDateString('en-US', { weekday: 'short' })
                    const monthDay  = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

                    return (
                      <div key={date} className="shrink-0">
                        {/* Date header */}
                        <div className="text-center mb-3">
                          <div className="text-xs text-slate-400">{monthDay}</div>
                          <div className="font-bold text-ink text-lg leading-tight">{weekday}</div>
                        </div>

                        {hostSlots.length === 0 ? (
                          <p className="text-xs text-slate-300 text-center py-4 italic w-24">No times</p>
                        ) : (
                          <div className="flex flex-col gap-px w-28">
                            {blocks.map((block, bi) => {
                              const isBestBlock = `${date}|${bi}` === bestBlockKey && bestCount > 0
                              return (
                                <div key={bi} className={`flex flex-col gap-px ${isBestBlock ? 'ring-2 ring-green-500 ring-offset-1 rounded-sm' : ''}`}>
                                  {block.map(slot => {
                                    const availablePs = participants.filter(p =>
                                      (p.availability?.[date] || []).includes(slot)
                                    )
                                    const count = availablePs.length
                                    const pct   = participants.length > 0 ? count / participants.length : 0
                                    const tooltipNames = availablePs.map(p => p.name).join(', ')
                                    return (
                                      <div
                                        key={slot}
                                        className="h-8 w-full rounded-sm transition-all duration-200 cursor-default relative group"
                                        style={{ background: heatColor(pct) }}
                                        title={count === 0
                                          ? `${formatSlot(slot)} — nobody free`
                                          : `${formatSlot(slot)} — ${count}/${participants.length}: ${tooltipNames}`}
                                      >
                                        {/* Hover overlay showing count */}
                                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                          <span className={`text-[10px] font-bold ${pct > 0.5 ? 'text-white' : 'text-slate-600'}`}>
                                            {count}/{participants.length}
                                          </span>
                                        </div>
                                      </div>
                                    )
                                  })}
                                </div>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Right column ── */}
        <div className="space-y-6">

          {/* Participants */}
          <div className="bg-white rounded-2xl border border-slate-100 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-ink">Participants</h2>
              <span className="text-xs text-slate-400">Auto-refreshing</span>
            </div>

            {participants.length === 0 ? (
              <div className="py-6 text-center">
                <p className="text-slate-400 text-sm">No responses yet.<br />Share the link below.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-50">
                {participants.map((p, i) => {
                  const datesAvail = (event.selectedDates || []).filter(d =>
                    (p.availability?.[d] || []).length > 0
                  )
                  return (
                    <div key={p.id || i} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
                      <div
                        className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0 mt-0.5"
                        style={{ background: COLORS[i % COLORS.length] }}
                      >
                        {(p.name || '?')[0].toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-ink text-sm leading-tight">{p.name}</div>
                        {datesAvail.length === 0 ? (
                          <p className="text-xs text-slate-300 mt-0.5">No availability submitted</p>
                        ) : (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {datesAvail.map(d => (
                              <span
                                key={d}
                                className="px-1.5 py-0.5 bg-gather-50 text-gather-600 rounded-md text-[10px] font-medium"
                              >
                                {parseKey(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
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
