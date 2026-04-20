import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useEvent } from '../context/EventContext'
import { supabase } from '../lib/supabase'
import CalendarStep from '../components/steps/CalendarStep'

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
// Uses sqrt scaling so even 1 person out of many shows clear color
function heatColor(pct) {
  if (pct <= 0) return '#f1f5f9' // slate-100 for zero
  const scaled = Math.sqrt(pct)
  const r = Math.round(220 + (21  - 220) * scaled)
  const g = Math.round(252 + (128 - 252) * scaled)
  const b = Math.round(231 + (61  - 231) * scaled)
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
  const { event, loadEventFromStorage, updateEventTiming } = useEvent()
  const [copied, setCopied]               = useState(false)
  const [inviteDropdown, setInviteDropdown] = useState(false)
  const [copiedResults, setCopiedResults] = useState(false)
  const [resultsDropdown, setResultsDropdown] = useState(false)
  const [authUser, setAuthUser]           = useState(undefined)
  const [selectedPId, setSelectedPId]     = useState(null)
  const [editOpen, setEditOpen]           = useState(false)
  const [editDates, setEditDates]         = useState([])
  const [editSlots, setEditSlots]         = useState({})
  const [editTimezone, setEditTimezone]   = useState('')
  const [saving, setSaving]               = useState(false)

  useEffect(() => {
    loadEventFromStorage(id)
    const interval = setInterval(() => loadEventFromStorage(id), 3000)
    return () => clearInterval(interval)
  }, [id])

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setAuthUser(data?.user ?? null))
  }, [])

  const inviteLink   = `${window.location.origin}/event/${id}`
  const resultsLink  = `${window.location.origin}/event/${id}/dashboard`
  const participants = event.participants || []

  const handleCopy = () => {
    navigator.clipboard.writeText(inviteLink)
    setCopied(true)
    setInviteDropdown(false)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleCopyResults = () => {
    navigator.clipboard.writeText(resultsLink)
    setCopiedResults(true)
    setResultsDropdown(false)
    setTimeout(() => setCopiedResults(false), 2000)
  }

  const openEdit = () => {
    setEditDates([...(event.selectedDates || [])])
    setEditSlots({ ...(event.timeSlots || {}) })
    setEditTimezone(event.timezone || '')
    setEditOpen(true)
  }

  const saveEdit = async () => {
    setSaving(true)
    await updateEventTiming(event.id, editDates, editSlots)
    setSaving(false)
    setEditOpen(false)
  }

  // bestBlockKey: for heatmap ring highlight — uses host blocks with numeric bi
  let bestBlockKey = null
  let _bestCount   = 0
  ;(event.selectedDates || []).forEach(date => {
    const slots = [...(event.timeSlots?.[date] || [])].sort()
    getBlocks(slots).forEach((block, bi) => {
      const count = participants.filter(p =>
        block.some(s => (p.availability?.[date] || []).includes(s))
      ).length
      if (count > _bestCount) { _bestCount = count; bestBlockKey = `${date}|${bi}` }
    })
  })

  // topBlocks: slot-by-slot peak windows for the Best Times panel
  const rankedBlocks = []
  ;(event.selectedDates || []).forEach(date => {
    const hostSlots = [...(event.timeSlots?.[date] || [])].sort()
    if (!hostSlots.length || !participants.length) return

    // Count participants free at each individual slot
    const counts = Object.fromEntries(
      hostSlots.map(slot => [
        slot,
        participants.filter(p => (p.availability?.[date] || []).includes(slot)).length
      ])
    )

    const maxCount = Math.max(0, ...Object.values(counts))
    if (maxCount === 0) return

    // Walk from highest overlap down, collecting contiguous peak windows
    const processed = new Set()
    for (let threshold = maxCount; threshold >= 1; threshold--) {
      const peakSlots = hostSlots.filter(s => counts[s] >= threshold && !processed.has(s))
      getBlocks(peakSlots).forEach(block => {
        const names = participants
          .filter(p => block.every(s => (p.availability?.[date] || []).includes(s)))
          .map(p => p.name)
        block.forEach(s => processed.add(s))
        rankedBlocks.push({ date, block, count: threshold, names })
      })
    }
  })
  rankedBlocks.sort((a, b) => b.count - a.count || a.date.localeCompare(b.date))
  const topBlocks = rankedBlocks.filter(b => b.count > 0).slice(0, 3)

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
              onClick={openEdit}
              className="px-4 py-2 rounded-xl text-sm font-semibold bg-gather-50 text-gather-700 hover:bg-gather-100 transition-all"
            >
              Edit schedule
            </button>
            <div className="relative">
              <button
                onClick={() => setInviteDropdown(v => !v)}
                className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                  copied ? 'bg-gather-500 text-white' : 'bg-gather-50 text-gather-700 hover:bg-gather-100'
                }`}
              >
                {copied ? '✓ Copied!' : 'Share invite'}
              </button>
              {inviteDropdown && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setInviteDropdown(false)} />
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-2xl shadow-lg border border-slate-100 py-1.5 z-20">
                    <button
                      onClick={handleCopy}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-ink hover:bg-slate-50 transition-colors"
                    >
                      <svg className="w-4 h-4 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      Copy link
                    </button>
                    <a
                      href={`mailto:?subject=${encodeURIComponent(`You're invited: ${event.name}`)}&body=${encodeURIComponent(`Hi!\n\nYou've been invited to share your availability for "${event.name}".\n\nClick the link below to pick your times — no sign-up needed:\n${inviteLink}\n\nThanks!`)}`}
                      onClick={() => setInviteDropdown(false)}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-ink hover:bg-slate-50 transition-colors"
                    >
                      <svg className="w-4 h-4 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      Send via email
                    </a>
                    {typeof navigator !== 'undefined' && navigator.share && (
                      <button
                        onClick={() => { navigator.share({ title: event.name, text: `You're invited to "${event.name}"! Pick your availability here:`, url: inviteLink }); setInviteDropdown(false) }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-ink hover:bg-slate-50 transition-colors"
                      >
                        <svg className="w-4 h-4 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                        </svg>
                        Share
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
            <div className="relative">
              <button
                onClick={() => setResultsDropdown(v => !v)}
                className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                  copiedResults ? 'bg-gather-500 text-white' : 'bg-gather-50 text-gather-700 hover:bg-gather-100'
                }`}
              >
                {copiedResults ? '✓ Copied!' : 'Share results'}
              </button>
              {resultsDropdown && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setResultsDropdown(false)} />
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-2xl shadow-lg border border-slate-100 py-1.5 z-20">
                    <button
                      onClick={handleCopyResults}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-ink hover:bg-slate-50 transition-colors"
                    >
                      <svg className="w-4 h-4 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      Copy link
                    </button>
                    <a
                      href={`mailto:?subject=${encodeURIComponent(`Results: ${event.name}`)}&body=${encodeURIComponent(`Here are the live results for "${event.name}":\n\n${resultsLink}`)}`}
                      onClick={() => setResultsDropdown(false)}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-ink hover:bg-slate-50 transition-colors"
                    >
                      <svg className="w-4 h-4 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      Send via email
                    </a>
                  </div>
                </>
              )}
            </div>
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

          {/* Invite friends — hidden once someone responds */}
          {participants.length === 0 && <div className="bg-gather-600 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="font-bold text-white text-base">Invite friends</h2>
                <p className="text-gather-200 text-xs mt-0.5">Share the link so they can submit availability</p>
              </div>
              <div className="flex gap-2 shrink-0">
                <a
                  href={`mailto:?subject=${encodeURIComponent(`You're invited: ${event.name}`)}&body=${encodeURIComponent(`Hi!\n\nYou've been invited to share your availability for "${event.name}".\n\nClick the link below to pick your times — no sign-up needed:\n${inviteLink}\n\nThanks!`)}`}
                  className="flex items-center gap-2 px-4 py-2 bg-white text-gather-700 text-sm font-semibold rounded-xl hover:bg-gather-50 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  Email
                </a>
                {typeof navigator !== 'undefined' && navigator.share && (
                  <button
                    onClick={() => navigator.share({ title: event.name, text: `You're invited to "${event.name}"! Pick your availability here:`, url: inviteLink })}
                    className="flex items-center gap-2 px-4 py-2 bg-white text-gather-700 text-sm font-semibold rounded-xl hover:bg-gather-50 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                    </svg>
                    Share
                  </button>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              <div className="flex-1 px-3 py-2.5 bg-gather-700/50 rounded-xl text-xs text-gather-100 font-mono truncate">
                {inviteLink}
              </div>
              <button
                onClick={handleCopy}
                className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all shrink-0 ${
                  copied ? 'bg-green-400 text-white' : 'bg-gather-500 text-white hover:bg-gather-400'
                }`}
              >
                {copied ? '✓ Copied!' : 'Copy link'}
              </button>
            </div>
          </div>}

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
                : selectedPId
                ? `Showing availability for ${participants.find(p => p.id === selectedPId)?.name}. Click their name again to reset.`
                : `Darker = more people available. Click a participant to highlight their slots.`}
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
                  {/* Time axis — built from the union of all slots across all dates */}
                  {(() => {
                    const allSlots = [...new Set(
                      (event.selectedDates || []).flatMap(d => event.timeSlots?.[d] || [])
                    )].sort()
                    const axisBlocks = getBlocks(allSlots)
                    return (
                      <div className="shrink-0 flex flex-col">
                        {/* Spacer matching date header height */}
                        <div className="mb-3 h-[39px]" />
                        <div className="flex flex-col gap-px w-16">
                          {axisBlocks.map((block, bi) => (
                            <div key={bi} className="flex flex-col gap-px">
                              {block.map((slot) => {
                                const isHour    = slot.endsWith(':00')
                                const isHalf    = slot.endsWith(':30')
                                const isQuarter = slot.endsWith(':15') || slot.endsWith(':45')
                                return (
                                  <div key={slot} className="h-8 relative">
                                    {/* Tick line at the top of the cell */}
                                    {isHour    && <div className="absolute inset-x-0 top-0 h-px bg-slate-400" />}
                                    {isHalf    && <div className="absolute right-0 top-0 w-3 h-px bg-slate-300" />}
                                    {isQuarter && <div className="absolute right-0 top-0 w-2 h-px bg-slate-200" />}
                                    {/* Label floats above the line */}
                                    {isHour && (
                                      <span className="absolute right-1 text-[10px] text-slate-500 whitespace-nowrap leading-none font-medium" style={{ top: 0, transform: 'translateY(-100%)' }}>
                                        {formatSlot(slot)}
                                      </span>
                                    )}
                                    {isHalf && (
                                      <span className="absolute right-1 text-[9px] text-slate-300 whitespace-nowrap leading-none" style={{ top: 0, transform: 'translateY(-100%)' }}>
                                        :30
                                      </span>
                                    )}
                                  </div>
                                )
                              })}
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  })()}

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
                              const isBestBlock = `${date}|${bi}` === bestBlockKey
                              return (
                                <div key={bi} className={`flex flex-col gap-px ${isBestBlock ? 'ring-2 ring-green-500 ring-offset-1 rounded-sm' : ''}`}>
                                  {block.map(slot => {
                                    const isHour    = slot.endsWith(':00')
                                    const isHalf    = slot.endsWith(':30')
                                    const isQuarter = slot.endsWith(':15') || slot.endsWith(':45')
                                    const selectedP = selectedPId ? participants.find(p => p.id === selectedPId) : null
                                    let bg, tooltip, overlayText
                                    if (selectedP) {
                                      const free = (selectedP.availability?.[date] || []).includes(slot)
                                      bg = free ? heatColor(1) : '#f1f5f9'
                                      tooltip = `${formatSlot(slot)} — ${free ? `${selectedP.name} is free` : `${selectedP.name} is busy`}`
                                      overlayText = null
                                    } else {
                                      const availablePs = participants.filter(p =>
                                        (p.availability?.[date] || []).includes(slot)
                                      )
                                      const count = availablePs.length
                                      const pct   = participants.length > 0 ? count / participants.length : 0
                                      bg = heatColor(pct)
                                      tooltip = count === 0
                                        ? `${formatSlot(slot)} — nobody free`
                                        : `${formatSlot(slot)} — ${count}/${participants.length}: ${availablePs.map(p => p.name).join(', ')}`
                                      overlayText = { text: `${count}/${participants.length}`, light: pct > 0.5 }
                                    }
                                    return (
                                      <div
                                        key={slot}
                                        className="h-8 w-full rounded-sm transition-all duration-200 cursor-default relative group"
                                        style={{ background: bg }}
                                        title={tooltip}
                                      >
                                        {/* Grid lines at hour / half / quarter marks */}
                                        {isHour    && <div className="absolute inset-x-0 top-0 h-0.5 bg-white/70 pointer-events-none" />}
                                        {isHalf    && <div className="absolute inset-x-0 top-0 h-px bg-white/50 pointer-events-none" />}
                                        {isQuarter && <div className="absolute inset-x-0 top-0 h-px bg-white/30 pointer-events-none" />}
                                        {overlayText && (
                                          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                            <span className={`text-[10px] font-bold ${overlayText.light ? 'text-white' : 'text-slate-600'}`}>
                                              {overlayText.text}
                                            </span>
                                          </div>
                                        )}
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

          {/* Participants */}
          <div className="bg-white rounded-2xl border border-slate-100 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-ink">Participants</h2>
              <span className="text-xs text-slate-400">Auto-refreshing</span>
            </div>

            {participants.length === 0 ? (
              <div className="py-6 text-center">
                <p className="text-slate-400 text-sm">No responses yet.<br />Share the link above.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-50">
                {participants.map((p, i) => {
                  const datesAvail = (event.selectedDates || []).filter(d =>
                    (p.availability?.[d] || []).length > 0
                  )
                  const isSelected = selectedPId === p.id
                  return (
                    <button
                      key={p.id || i}
                      onClick={() => setSelectedPId(isSelected ? null : p.id)}
                      className={`w-full flex items-start gap-3 py-3 first:pt-0 last:pb-0 rounded-xl px-2 -mx-2 transition-colors text-left ${
                        isSelected ? 'bg-slate-50' : 'hover:bg-slate-50/60'
                      }`}
                    >
                      <div
                        className={`w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0 mt-0.5 transition-all ${
                          isSelected ? 'ring-2 ring-offset-2' : ''
                        }`}
                        style={{ background: COLORS[i % COLORS.length], ...(isSelected ? { ringColor: COLORS[i % COLORS.length] } : {}) }}
                      >
                        {(p.name || '?')[0].toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className={`font-semibold text-sm leading-tight ${isSelected ? 'text-gather-700' : 'text-ink'}`}>
                          {p.name}
                          {isSelected && <span className="ml-1.5 text-[10px] font-normal text-slate-400">click to reset</span>}
                        </div>
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
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* Best times panel */}
          {participants.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-100 p-6">
              <h2 className="font-bold text-ink mb-1">Best times</h2>
              <p className="text-xs text-slate-400 mb-4">
                {topBlocks.length === 0
                  ? 'No overlap found yet — waiting for more responses.'
                  : 'Top slots ranked by how many people are free.'}
              </p>
              {topBlocks.length === 0 ? (
                <p className="text-sm text-slate-300 italic text-center py-3">No overlap yet</p>
              ) : (
                <div className="space-y-3">
                  {topBlocks.map(({ date, block, count, names }, i) => {
                    const medals  = ['🥇', '🥈', '🥉']
                    const dateObj = parseKey(date)
                    const dateLabel = dateObj.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
                    const timeLabel = formatBlockRange(block)
                    const pct = participants.length > 0 ? count / participants.length : 0
                    const barW = Math.round(pct * 100)
                    return (
                      <div key={`${date}-${i}`} className="flex items-start gap-3">
                        <span className="text-xl leading-none mt-0.5">{medals[i]}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-baseline justify-between gap-2 mb-1">
                            <div>
                              <span className="text-sm font-semibold text-ink">{dateLabel}</span>
                              <span className="text-xs text-slate-400 ml-2">{timeLabel}</span>
                            </div>
                            <span className="text-xs font-bold text-gather-700 shrink-0">
                              {count}/{participants.length}
                            </span>
                          </div>
                          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-500"
                              style={{ width: `${barW}%`, background: heatColor(pct) }}
                            />
                          </div>
                          <p className="text-[10px] text-slate-400 mt-1 truncate">{names.join(', ')}</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </div>

      </div>

      {/* ── Edit schedule modal ── */}
      {editOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 backdrop-blur-sm overflow-y-auto py-8 px-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl p-8 relative">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-ink">Edit schedule</h2>
                <p className="text-sm text-slate-400 mt-0.5">Changes will update for all participants immediately.</p>
              </div>
              <button
                onClick={() => setEditOpen(false)}
                className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-400 transition-colors"
              >✕</button>
            </div>
            <CalendarStep
              selectedDates={editDates}
              timeSlots={editSlots}
              timezone={editTimezone}
              onDatesChange={setEditDates}
              onTimeSlotsChange={setEditSlots}
              onTimezoneChange={setEditTimezone}
              onNext={saveEdit}
              onBack={() => setEditOpen(false)}
            />
            {saving && (
              <p className="text-center text-sm text-slate-400 mt-2">Saving…</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
