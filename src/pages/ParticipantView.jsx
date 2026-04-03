import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useEvent } from '../context/EventContext'

const ALL_SLOTS = (() => {
  const slots = []
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 15) {
      slots.push(`${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`)
    }
  }
  return slots
})()

const TZ_OPTIONS = [
  { label: 'Local (auto-detect)', value: '' },
  { label: '─── Americas ───', value: '', disabled: true },
  { label: 'Pacific Time (PT)',      value: 'America/Los_Angeles' },
  { label: 'Mountain Time (MT)',     value: 'America/Denver' },
  { label: 'Central Time (CT)',      value: 'America/Chicago' },
  { label: 'Eastern Time (ET)',      value: 'America/New_York' },
  { label: 'Atlantic Time (AT)',     value: 'America/Halifax' },
  { label: 'São Paulo (BRT)',        value: 'America/Sao_Paulo' },
  { label: '─── Europe ───', value: '', disabled: true },
  { label: 'London (GMT/BST)',       value: 'Europe/London' },
  { label: 'Paris / Berlin (CET)',   value: 'Europe/Paris' },
  { label: 'Helsinki (EET)',         value: 'Europe/Helsinki' },
  { label: 'Moscow (MSK)',           value: 'Europe/Moscow' },
  { label: '─── Asia / Pacific ───', value: '', disabled: true },
  { label: 'Dubai (GST)',            value: 'Asia/Dubai' },
  { label: 'India (IST)',            value: 'Asia/Kolkata' },
  { label: 'Bangkok (ICT)',          value: 'Asia/Bangkok' },
  { label: 'Singapore / KL (SGT)',   value: 'Asia/Singapore' },
  { label: 'Tokyo (JST)',            value: 'Asia/Tokyo' },
  { label: 'Sydney (AEST)',          value: 'Australia/Sydney' },
  { label: 'Auckland (NZST)',        value: 'Pacific/Auckland' },
]

// Convert a "HH:MM" slot from one IANA timezone to another, returning "HH:MM"
function convertSlot(slot, fromTz, toTz) {
  if (!fromTz || !toTz || fromTz === toTz) return slot
  try {
    // Use an arbitrary fixed date (doesn't matter which, we only care about time offset)
    const [h, m] = slot.split(':').map(Number)
    const dateStr = `2000-01-15T${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:00`
    // Parse as if in fromTz
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: fromTz,
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
    }).formatToParts(new Date(dateStr))
    // Build a UTC date from the fromTz reading
    const get = (type) => parts.find(p => p.type === type)?.value
    const utcDate = new Date(Date.UTC(
      parseInt(get('year')), parseInt(get('month')) - 1, parseInt(get('day')),
      parseInt(get('hour')), parseInt(get('minute')), 0
    ))
    // Now format in toTz
    const converted = new Intl.DateTimeFormat('en-US', {
      timeZone: toTz, hour: '2-digit', minute: '2-digit', hour12: false,
    }).format(utcDate)
    return converted.replace(',', '').trim()
  } catch {
    return slot
  }
}

function formatSlot(slot) {
  const [h, m] = slot.split(':').map(Number)
  const ampm = h < 12 ? 'AM' : 'PM'
  const hour = h === 0 ? 12 : h > 12 ? h - 12 : h
  return `${hour}:${String(m).padStart(2,'0')} ${ampm}`
}

function formatHour(slot) {
  const [h] = slot.split(':').map(Number)
  const ampm = h < 12 ? 'AM' : 'PM'
  const hour = h === 0 ? 12 : h > 12 ? h - 12 : h
  return `${hour} ${ampm}`
}

function addFifteen(slot) {
  const [h, m] = slot.split(':').map(Number)
  const total  = h * 60 + m + 15
  return `${String(Math.floor(total / 60)).padStart(2,'0')}:${String(total % 60).padStart(2,'0')}`
}

function parseKey(key) {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function slotsInRange(start, end, available) {
  const startIdx = available.indexOf(start)
  const endIdx   = available.indexOf(end)
  if (startIdx === -1 || endIdx === -1 || endIdx <= startIdx) return []
  return available.slice(startIdx, endIdx)
}

function getSelectedRanges(pendingSlots, available) {
  const sorted = available.filter(s => pendingSlots.has(s))
  if (!sorted.length) return []
  const ranges = []
  let start = sorted[0], prev = sorted[0]
  for (let i = 1; i < sorted.length; i++) {
    if (available.indexOf(sorted[i]) - available.indexOf(prev) > 1) {
      ranges.push({ start, end: prev })
      start = sorted[i]
    }
    prev = sorted[i]
  }
  ranges.push({ start, end: prev })
  return ranges
}

function formatRange({ start, end }) {
  const s = formatSlot(start)
  const e = formatSlot(addFifteen(end))
  const sAp = s.slice(-2), eAp = e.slice(-2)
  return sAp === eAp ? `${s.slice(0, -3)} – ${e}` : `${s} – ${e}`
}

const SLOT_H = 14

// Heatmap helpers (mirrored from HostDashboard)
function heatColor(pct) {
  if (pct <= 0) return '#f1f5f9'
  const r = Math.round(187 + (21  - 187) * pct)
  const g = Math.round(247 + (128 - 247) * pct)
  const b = Math.round(208 + (61  - 208) * pct)
  return `rgb(${r},${g},${b})`
}

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

function TimePanel({ date, slots, hostSlots, onChange, onClose, hostTz, viewTz }) {
  // Convert a slot label from hostTz to viewTz for display
  const displaySlot = (slot) => {
    if (!hostTz || !viewTz || hostTz === viewTz) return formatSlot(slot)
    const converted = convertSlot(slot, hostTz, viewTz)
    return formatSlot(converted)
  }
  const displayHour = (slot) => {
    if (!hostTz || !viewTz || hostTz === viewTz) return formatHour(slot)
    const converted = convertSlot(slot, hostTz, viewTz)
    return formatHour(converted)
  }
  const AVAILABLE = ALL_SLOTS

  const [mode, setMode]             = useState('range')
  const [pending, setPending]       = useState(new Set(slots))
  const [hoverIdx, setHoverIdx]     = useState(null)
  const [dragStart, setDragStart]   = useState(null)
  const [dragMode, setDragMode]     = useState('add')
  const [rangeStart, setRangeStart] = useState('09:00')
  const [rangeEnd, setRangeEnd]     = useState('17:00')
  const dragging  = useRef(false)
  const scrollRef = useRef(null)

  const dateObj = parseKey(date)
  const label   = dateObj.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })

  useEffect(() => {
    if (scrollRef.current) {
      // Scroll to 8 AM = 8 hours × 4 slots
      scrollRef.current.scrollTop = 8 * 4 * SLOT_H
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const applyDrag = (from, to, mode, base) => {
    const [lo, hi] = [Math.min(from, to), Math.max(from, to)]
    const next = new Set(base)
    AVAILABLE.slice(lo, hi + 1).forEach(s => mode === 'add' ? next.add(s) : next.delete(s))
    return next
  }

  const handleMouseDown = (idx) => {
    const m = pending.has(AVAILABLE[idx]) ? 'remove' : 'add'
    dragging.current = true
    setDragMode(m)
    setDragStart(idx)
    setPending(applyDrag(idx, idx, m, pending))
  }

  const handleMouseEnter = (idx) => {
    setHoverIdx(idx)
    if (!dragging.current || dragStart === null) return
    setPending(prev => applyDrag(dragStart, idx, dragMode, prev))
  }

  useEffect(() => {
    const up = () => { dragging.current = false }
    window.addEventListener('mouseup', up)
    return () => window.removeEventListener('mouseup', up)
  }, [])

  const ranges = getSelectedRanges(pending, AVAILABLE)

  const addRange = () => {
    const toAdd = slotsInRange(rangeStart, rangeEnd, AVAILABLE)
    if (toAdd.length === 0) return
    setPending(prev => {
      const next = new Set(prev)
      toAdd.forEach(s => next.add(s))
      return next
    })
  }

  const PRESETS = [
    { label: 'Morning',   test: h => h >= 8  && h < 12 },
    { label: 'Afternoon', test: h => h >= 12 && h < 17 },
    { label: 'All day',   test: h => h >= 9  && h < 17 },
    { label: 'Evening',   test: h => h >= 17 && h < 21 },
  ]

  const confirm = () => {
    onChange(date, [...pending].sort())
    onClose()
  }

  return (
    <div className="flex flex-col h-full select-none">
      {/* Header */}
      <div className="flex items-start justify-between mb-3 shrink-0">
        <div>
          <h3 className="font-bold text-ink text-base leading-tight">{label}</h3>
          <p className="text-xs text-slate-400 mt-0.5">
            {ranges.length > 0
              ? `${ranges.length} time frame${ranges.length !== 1 ? 's' : ''} selected`
              : 'Select your available times'}
          </p>
        </div>
        <button
          onClick={onClose}
          className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-400 text-xs transition-colors shrink-0"
        >✕</button>
      </div>

      {/* Mode tabs */}
      <div className="flex gap-1 mb-3 shrink-0 bg-slate-100 rounded-lg p-0.5">
        {[{ id: 'range', label: 'Start / End' }, { id: 'drag', label: 'Drag' }].map(t => (
          <button
            key={t.id}
            onClick={() => setMode(t.id)}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all ${
              mode === t.id ? 'bg-white text-ink shadow-sm' : 'text-slate-400 hover:text-slate-600'
            }`}
          >{t.label}</button>
        ))}
      </div>

      {mode === 'range' ? (
        <div className="flex-1 flex flex-col gap-3 overflow-y-auto">
          {/* Added ranges */}
          {ranges.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">Added time slots</p>
              {ranges.map((r, i) => (
                <div key={i} className="flex items-center justify-between px-3 py-2 bg-gather-50 rounded-lg border border-gather-100">
                  <span className="text-sm font-semibold text-gather-700">{formatRange(r)}</span>
                  <button
                    onClick={() => {
                      const toRemove = slotsInRange(r.start, addFifteen(r.end), AVAILABLE)
                      setPending(prev => {
                        const next = new Set(prev)
                        toRemove.forEach(s => next.delete(s))
                        next.delete(r.end)
                        return next
                      })
                    }}
                    className="text-slate-300 hover:text-red-400 transition-colors text-sm font-bold ml-2"
                  >×</button>
                </div>
              ))}
            </div>
          )}

          {/* Range pickers */}
          <div>
            <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest mb-2">
              {ranges.length > 0 ? 'Add another slot' : 'Select a time slot'}
            </p>
            <div className="flex gap-2 items-end">
              <div className="flex-1">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Start</label>
                <select
                  value={rangeStart}
                  onChange={e => setRangeStart(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-ink bg-white focus:border-gather-400 outline-none"
                >
                  {AVAILABLE.map(s => (
                    <option key={s} value={s}>{displaySlot(s)}</option>
                  ))}
                </select>
              </div>
              <div className="flex-1">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">End</label>
                <select
                  value={rangeEnd > rangeStart ? rangeEnd : AVAILABLE.find(s => s > rangeStart) || AVAILABLE[AVAILABLE.length - 1]}
                  onChange={e => setRangeEnd(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-ink bg-white focus:border-gather-400 outline-none"
                >
                  {AVAILABLE.filter(s => s > rangeStart).map(s => (
                    <option key={s} value={s}>{displaySlot(s)}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
          <button
            onClick={() => {
              addRange()
              setRangeStart(rangeEnd)
              setRangeEnd(AVAILABLE.find(s => s > rangeEnd) || '23:45')
            }}
            disabled={rangeEnd <= rangeStart}
            className="w-full py-2 bg-gather-100 text-gather-700 font-semibold rounded-lg text-sm hover:bg-gather-200 transition-colors disabled:opacity-40"
          >
            + Add this slot
          </button>
          {ranges.length > 0 && (
            <button
              onClick={() => setPending(new Set())}
              className="w-full py-1.5 text-xs text-slate-400 hover:text-red-400 transition-colors"
            >
              Clear all
            </button>
          )}
        </div>
      ) : (
        <>
          {/* Drag mode: selected chips */}
          <div className="mb-3 shrink-0 min-h-[28px]">
            {ranges.length > 0 ? (
              <>
                <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest mb-1.5">Selected</p>
                <div className="flex flex-wrap gap-1.5">
                  {ranges.map((r, i) => (
                    <span key={i} className="px-2.5 py-1 bg-gather-100 text-gather-700 rounded-full text-xs font-semibold">
                      {formatRange(r)}
                    </span>
                  ))}
                </div>
              </>
            ) : (
              <p className="text-[11px] text-slate-300 italic">No times selected yet</p>
            )}
          </div>

          {/* Presets */}
          <div className="flex gap-1.5 mb-3 flex-wrap shrink-0">
            {PRESETS.map(p => {
              const ps     = AVAILABLE.filter(s => p.test(parseInt(s)))
              const active = ps.length > 0 && ps.every(s => pending.has(s))
              return (
                <button
                  key={p.label}
                  onClick={() => setPending(prev => {
                    const next = new Set(prev)
                    active ? ps.forEach(s => next.delete(s)) : ps.forEach(s => next.add(s))
                    return next
                  })}
                  className={`px-2.5 py-1 text-xs font-medium rounded-full border transition-all ${
                    active
                      ? 'bg-gather-500 text-white border-gather-500'
                      : 'bg-white text-slate-500 border-slate-200 hover:border-gather-300 hover:text-gather-600'
                  }`}
                >{p.label}</button>
              )
            })}
            <button
              onClick={() => setPending(new Set())}
              className="px-2.5 py-1 text-xs font-medium rounded-full border border-slate-200 text-slate-400 hover:border-red-200 hover:text-red-400 transition-all bg-white"
            >Clear</button>
          </div>

          {/* Scrollable time grid */}
          <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto"
            onMouseLeave={() => setHoverIdx(null)}
          >
            {AVAILABLE.map((slot, idx) => {
              const selected   = pending.has(slot)
              const isHov      = hoverIdx === idx && !dragging.current
              const min        = parseInt(slot.split(':')[1])
              const isHourMark = min === 0
              const isHalfMark = min === 30
              const prevSel = idx > 0                    && pending.has(AVAILABLE[idx - 1])
              const nextSel = idx < AVAILABLE.length - 1 && pending.has(AVAILABLE[idx + 1])
              const isTop   = selected && !prevSel
              const isBot   = selected && !nextSel
              return (
                <div
                  key={slot}
                  onMouseDown={() => handleMouseDown(idx)}
                  onMouseEnter={() => handleMouseEnter(idx)}
                  style={{ height: `${SLOT_H}px` }}
                  className={`flex items-center cursor-pointer ${isHourMark ? 'border-t border-slate-100' : ''}`}
                >
                  <div className="w-14 shrink-0 flex items-center justify-end pr-2 pointer-events-none">
                    {isHourMark && (
                      <span className="text-[10px] text-slate-400 font-medium leading-none -mt-[1px]">
                        {displayHour(slot)}
                      </span>
                    )}
                    {isHalfMark && (
                      <span className="text-[9px] text-slate-300 leading-none">:30</span>
                    )}
                  </div>
                  <div
                    className={`
                      flex-1 h-full mr-2 transition-colors duration-75
                      ${isTop ? 'rounded-t-md' : ''}
                      ${isBot ? 'rounded-b-md' : ''}
                      ${selected ? 'bg-gather-400' : isHov ? 'bg-gather-100' : 'bg-slate-50'}
                    `}
                  />
                </div>
              )
            })}
          </div>
        </>
      )}

      {/* Footer */}
      <button
        onClick={confirm}
        className="mt-4 shrink-0 w-full py-3 bg-gather-600 text-white font-semibold rounded-xl hover:bg-gather-700 transition-all shadow-md shadow-gather-100 text-sm"
      >
        {ranges.length > 0
          ? `Save ${ranges.length} time frame${ranges.length !== 1 ? 's' : ''} ✓`
          : 'Save (no times) ✓'}
      </button>
    </div>
  )
}

export default function ParticipantView() {
  const { id }   = useParams()
  const navigate = useNavigate()
  const { event, loadEventFromStorage, addParticipant } = useEvent()

  const [name, setName]             = useState('')
  const [nameSubmitted, setSubmit]  = useState(false)
  const [availability, setAvail]    = useState({})
  const [activeDate, setActiveDate] = useState(null)
  const [submitted, setSubmitted]   = useState(false)
  const [viewTz, setViewTz]         = useState(Intl.DateTimeFormat().resolvedOptions().timeZone)

  useEffect(() => {
    loadEventFromStorage(id)
    // Keep refreshing after submit so the heatmap stays live
    const interval = setInterval(() => loadEventFromStorage(id), 3000)
    return () => clearInterval(interval)
  }, [id])

  const handleNameSubmit = () => {
    if (name.trim().length < 1) return
    setSubmit(true)
  }

  const handleTimeChange = (date, slots) => {
    setAvail(prev => ({ ...prev, [date]: slots }))
  }

  const handleSubmit = () => {
    const participant = {
      id: `p_${Date.now()}`,
      name: name.trim(),
      availability,
    }
    addParticipant(id, participant)
    setSubmitted(true)
  }

  const totalSlots = Object.values(availability).reduce((a, v) => a + v.length, 0)

  if (submitted) {
    const participants = event.participants || []
    return (
      <div className="min-h-screen bg-mist">
        <header className="bg-white border-b border-slate-100 px-6 py-4">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-xl font-bold text-gather-700 tracking-tight">gather</span>
              <span className="text-slate-300">›</span>
              <h1 className="font-semibold text-ink">{event.name}</h1>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              <span className="text-sm text-slate-500">Live</span>
            </div>
          </div>
        </header>

        <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">
          {/* Confirmation banner */}
          <div className="bg-gather-50 border border-gather-100 rounded-2xl px-6 py-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-gather-500 flex items-center justify-center text-white font-bold text-lg shrink-0">✓</div>
            <div>
              <p className="font-bold text-gather-800">You're in, {name}!</p>
              <p className="text-sm text-gather-600 mt-0.5">Your availability has been submitted. Here's how the group looks so far.</p>
            </div>
            <button onClick={() => navigate('/')} className="ml-auto shrink-0 px-4 py-2 bg-white border border-gather-200 text-gather-700 text-sm font-semibold rounded-xl hover:bg-gather-50 transition-colors">
              Create your own →
            </button>
          </div>

          {/* Heatmap */}
          <div className="bg-white rounded-2xl border border-slate-100 p-6">
            <div className="flex items-center justify-between mb-1">
              <h2 className="font-bold text-ink">Group availability</h2>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-slate-400">0%</span>
                <div className="flex gap-px">
                  {[0.15, 0.35, 0.55, 0.75, 1].map(v => (
                    <div key={v} className="w-4 h-3 rounded-sm" style={{ background: heatColor(v) }} />
                  ))}
                </div>
                <span className="text-[10px] text-slate-400">100%</span>
              </div>
            </div>
            <p className="text-xs text-slate-400 mb-5">
              {participants.length === 0
                ? 'No responses yet.'
                : `${participants.length} ${participants.length === 1 ? 'person has' : 'people have'} responded. Darker = more overlap.`}
            </p>

            {participants.length === 0 ? (
              <p className="text-slate-300 text-sm text-center py-6 italic">Waiting for responses…</p>
            ) : (
              <div className="overflow-x-auto -mx-6 px-6 pb-2">
                <div className="flex gap-3 min-w-max">
                  {/* Time axis */}
                  {(() => {
                    const allSlots = [...new Set(
                      (event.selectedDates || []).flatMap(d => event.timeSlots?.[d] || [])
                    )].sort()
                    return (
                      <div className="shrink-0 flex flex-col">
                        <div className="mb-3 h-[52px]" />
                        <div className="flex flex-col gap-px">
                          {getBlocks(allSlots).map((block, bi) => (
                            <div key={bi} className="flex flex-col gap-px">
                              {block.map(slot => {
                                const isHour = slot.endsWith(':00')
                                return (
                                  <div key={slot} className={`h-8 flex items-center justify-end pr-2 ${isHour ? 'border-t border-slate-200' : ''}`}>
                                    {isHour && (
                                      <span className="text-[10px] text-slate-400 whitespace-nowrap leading-none -mt-px">
                                        {formatSlot(slot)}
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
                        <div className="text-center mb-3">
                          <div className="text-xs text-slate-400">{monthDay}</div>
                          <div className="font-bold text-ink text-lg leading-tight">{weekday}</div>
                        </div>
                        {hostSlots.length === 0 ? (
                          <p className="text-xs text-slate-300 text-center py-4 italic w-24">No times</p>
                        ) : (
                          <div className="flex flex-col gap-px w-28">
                            {blocks.map((block, bi) => (
                              <div key={bi} className="flex flex-col gap-px">
                                {block.map(slot => {
                                  const count = participants.filter(p =>
                                    (p.availability?.[date] || []).includes(slot)
                                  ).length
                                  const pct = participants.length > 0 ? count / participants.length : 0
                                  const isHour = slot.endsWith(':00')
                                  const availNames = participants
                                    .filter(p => (p.availability?.[date] || []).includes(slot))
                                    .map(p => p.name).join(', ')
                                  return (
                                    <div
                                      key={slot}
                                      className={`h-8 w-full rounded-sm cursor-default relative group ${isHour ? 'border-t-2 border-white/60' : ''}`}
                                      style={{ background: heatColor(pct) }}
                                      title={count === 0
                                        ? `${formatSlot(slot)} — nobody free`
                                        : `${formatSlot(slot)} — ${count}/${participants.length}: ${availNames}`}
                                    >
                                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                        <span className={`text-[10px] font-bold ${pct > 0.5 ? 'text-white' : 'text-slate-600'}`}>
                                          {count}/{participants.length}
                                        </span>
                                      </div>
                                    </div>
                                  )
                                })}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Participant list */}
          {participants.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-100 p-6">
              <h2 className="font-bold text-ink mb-4">Who's responded ({participants.length})</h2>
              <div className="flex flex-wrap gap-2">
                {participants.map((p, i) => (
                  <div key={p.id || i} className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded-full">
                    <div
                      className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0"
                      style={{ background: ['#4ade80','#60a5fa','#f472b6','#fb923c','#a78bfa','#34d399'][i % 6] }}
                    >
                      {(p.name || '?')[0].toUpperCase()}
                    </div>
                    <span className="text-sm font-medium text-ink">{p.name}</span>
                    {p.name === name && <span className="text-[10px] text-slate-400">(you)</span>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  if (!event.id) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-slate-400">Loading event…</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-mist">
      <header className="bg-white border-b border-slate-100 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center gap-3">
          <span className="text-xl font-bold text-gather-700 tracking-tight">gather</span>
          <span className="text-slate-300">›</span>
          <h1 className="font-semibold text-ink">{event.name}</h1>
          {event.topic && (
            <span className="px-2.5 py-1 bg-gather-50 text-gather-600 text-xs font-medium rounded-full">
              {event.topic}
            </span>
          )}
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Name entry */}
        {!nameSubmitted ? (
          <div className="max-w-md mx-auto animate-slide-up">
            <h2 className="text-3xl font-bold text-ink mb-2">Mark your availability</h2>
            <p className="text-slate-400 mb-8">
              No sign-up needed. Just tell us your name and when you're free.
            </p>
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
              <label className="block text-sm font-semibold text-slate-600 mb-2">Your name</label>
              <input
                autoFocus
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleNameSubmit()}
                placeholder="e.g. Alex Johnson"
                className="w-full px-4 py-3.5 border-2 border-slate-200 focus:border-gather-500 rounded-xl outline-none text-ink font-medium transition-colors mb-4"
              />
              <button
                onClick={handleNameSubmit}
                disabled={name.trim().length < 1}
                className="w-full py-3 bg-gather-600 text-white font-semibold rounded-xl disabled:opacity-30 hover:bg-gather-700 transition-all"
              >
                Continue →
              </button>
            </div>
          </div>
        ) : (
          <div className="flex gap-6 items-start animate-fade-in">
            {/* Calendar */}
            <div className="flex-1 min-w-0">
              <div className="mb-4">
                <h2 className="text-2xl font-bold text-ink">Hi {name}! When are you free?</h2>
                <p className="text-slate-400 text-sm mt-1">Click any proposed date to mark your availability.</p>

                {/* Timezone sync row */}
                <div className="flex flex-wrap items-center gap-2 mt-3 p-3 bg-white border border-slate-100 rounded-xl">
                  {event.timezone && event.timezone !== viewTz && (
                    <span className="text-xs text-slate-500">
                      Host: <span className="font-medium">{event.timezone}</span>
                    </span>
                  )}
                  <span className="text-xs font-semibold text-slate-400 shrink-0">Your timezone:</span>
                  <select
                    value={viewTz}
                    onChange={e => setViewTz(e.target.value || Intl.DateTimeFormat().resolvedOptions().timeZone)}
                    className="flex-1 min-w-0 max-w-xs px-2 py-1 border border-slate-200 rounded-lg text-xs text-ink bg-white focus:border-gather-400 outline-none"
                  >
                    {TZ_OPTIONS.map((tz, i) => (
                      <option key={i} value={tz.value} disabled={tz.disabled}>{tz.label}</option>
                    ))}
                  </select>
                  {event.timezone && event.timezone !== viewTz && (
                    <span className="text-[10px] text-gather-600 bg-gather-50 px-2 py-0.5 rounded-full shrink-0">
                      Times converted
                    </span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {event.selectedDates?.map(date => {
                  const obj = parseKey(date)
                  const label = obj.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
                  const mySlots = availability[date] || []
                  const hostSlots = event.timeSlots?.[date] || []
                  return (
                    <button
                      key={date}
                      onClick={() => setActiveDate(activeDate === date ? null : date)}
                      className={`p-4 rounded-2xl border-2 text-left transition-all hover:scale-[1.01] ${
                        activeDate === date
                          ? 'border-gather-500 bg-gather-50 shadow-md shadow-gather-100'
                          : mySlots.length > 0
                          ? 'border-gather-200 bg-gather-50'
                          : 'border-slate-200 bg-white hover:border-gather-200'
                      }`}
                    >
                      <div className="font-semibold text-ink text-sm">{label}</div>
                      <div className="text-xs text-slate-400 mt-1">
                        Click to mark your availability
                      </div>
                      {mySlots.length > 0 ? (
                        <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 bg-gather-100 text-gather-700 text-xs font-semibold rounded-full">
                          ✓ {mySlots.length} times selected
                        </div>
                      ) : (
                        <div className="mt-2 text-xs text-slate-400">Click to select times</div>
                      )}
                    </button>
                  )
                })}
              </div>

              {/* Submit */}
              <div className="mt-8 flex items-center justify-between">
                <span className="text-sm text-slate-400">
                  {totalSlots > 0
                    ? `${totalSlots} time slots selected across ${Object.keys(availability).filter(d => availability[d].length > 0).length} dates`
                    : 'Select your available times above'}
                </span>
                <button
                  onClick={handleSubmit}
                  disabled={totalSlots === 0}
                  className="px-8 py-3 bg-gather-600 text-white font-semibold rounded-xl disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gather-700 transition-all shadow-md shadow-gather-100"
                >
                  Submit availability →
                </button>
              </div>
            </div>

            {/* Time panel */}
            {activeDate && (
              <div className="w-72 shrink-0 bg-white rounded-2xl border border-slate-100 shadow-xl p-5 h-[580px] flex flex-col animate-panel-in">
                <TimePanel
                  date={activeDate}
                  slots={availability[activeDate] || []}
                  hostSlots={event.timeSlots?.[activeDate] || []}
                  onChange={handleTimeChange}
                  onClose={() => setActiveDate(null)}
                  hostTz={event.timezone}
                  viewTz={viewTz}
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
