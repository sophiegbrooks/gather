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

          {/* Availability columns */}
          <div className="bg-white rounded-2xl border border-slate-100 p-6">
            <h2 className="font-bold text-ink mb-1">Availability</h2>
            <p className="text-xs text-slate-400 mb-5">
              {participants.length === 0
                ? 'Waiting for responses — share the invite link below.'
                : `Showing who's free for each proposed time.`}
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
                <div className="flex gap-4 min-w-max">
                  {(event.selectedDates || []).map(date => {
                    const hostSlots = [...(event.timeSlots?.[date] || [])].sort()
                    const blocks    = getBlocks(hostSlots)
                    const dateObj   = parseKey(date)
                    const weekday   = dateObj.toLocaleDateString('en-US', { weekday: 'short' })
                    const monthDay  = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

                    return (
                      <div key={date} className="w-52 shrink-0">
                        {/* Date header */}
                        <div className="text-center mb-3 pb-2 border-b border-slate-100">
                          <div className="font-bold text-ink text-sm">{weekday}</div>
                          <div className="text-xs text-slate-400">{monthDay}</div>
                        </div>

                        {hostSlots.length === 0 ? (
                          <p className="text-xs text-slate-300 text-center py-4 italic">No times set</p>
                        ) : (
                          <div className="space-y-2">
                            {blocks.map((block, bi) => {
                              const availablePs = participants.filter(p =>
                                block.some(s => (p.availability?.[date] || []).includes(s))
                              )
                              const count  = availablePs.length
                              const pct    = participants.length > 0 ? count / participants.length : 0
                              const isBest = `${date}|${bi}` === bestBlockKey && count > 0
                              const allFree = count === participants.length && count > 0

                              return (
                                <div
                                  key={bi}
                                  className={`rounded-xl border overflow-hidden ${
                                    isBest ? 'border-green-200' : 'border-slate-100'
                                  }`}
                                >
                                  {/* Block header */}
                                  <div className={`px-3 py-1.5 flex items-center justify-between ${
                                    isBest ? 'bg-green-50' : 'bg-slate-50'
                                  }`}>
                                    <span className="text-xs font-semibold text-slate-600">
                                      {formatBlockRange(block)}
                                    </span>
                                    {isBest && (
                                      <span className="text-[10px] font-bold text-green-600 uppercase tracking-wide ml-2 shrink-0">
                                        Best
                                      </span>
                                    )}
                                  </div>

                                  {/* Block body */}
                                  <div className="px-3 py-2.5">
                                    <div className="flex items-center justify-between mb-1.5">
                                      <span className={`text-xs font-semibold ${
                                        allFree ? 'text-green-600' : 'text-slate-500'
                                      }`}>
                                        {count}/{participants.length} {count === 1 ? 'person' : 'people'}
                                      </span>
                                    </div>
                                    <div className="h-1.5 bg-slate-100 rounded-full mb-2.5">
                                      <div
                                        className={`h-full rounded-full transition-all duration-300 ${
                                          allFree ? 'bg-green-400' : 'bg-gather-400'
                                        }`}
                                        style={{ width: `${pct * 100}%` }}
                                      />
                                    </div>
                                    {availablePs.length > 0 && (
                                      <div className="flex flex-wrap gap-1">
                                        {availablePs.map(p => {
                                          const pi = participants.indexOf(p)
                                          return (
                                            <div
                                              key={p.id || pi}
                                              className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0"
                                              style={{ background: COLORS[pi % COLORS.length] }}
                                              title={p.name}
                                            >
                                              {(p.name || '?')[0].toUpperCase()}
                                            </div>
                                          )
                                        })}
                                      </div>
                                    )}
                                  </div>
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
