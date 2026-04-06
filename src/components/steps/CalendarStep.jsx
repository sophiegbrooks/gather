import { useState, useRef, useEffect } from 'react'

const DAYS   = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']

// Generate time slots for the full 24 hours in 15-min increments
const ALL_SLOTS = (() => {
  const slots = []
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 15) {
      slots.push(`${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`)
    }
  }
  return slots
})()

function formatHour(slot) {
  const [h] = slot.split(':').map(Number)
  const ampm = h < 12 ? 'AM' : 'PM'
  const hour = h === 0 ? 12 : h > 12 ? h - 12 : h
  return `${hour} ${ampm}`
}

function formatSlot(slot) {
  if (!slot) return ''
  const [h, m] = slot.split(':').map(Number)
  const ampm = h < 12 ? 'AM' : 'PM'
  const hour = h === 0 ? 12 : h > 12 ? h - 12 : h
  return `${hour}:${String(m).padStart(2,'0')} ${ampm}`
}

function toKey(year, month, day) {
  return `${year}-${String(month + 1).padStart(2,'0')}-${String(day).padStart(2,'0')}`
}

function parseKey(key) {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d)
}

// ── Helpers ───────────────────────────────────────────────────────────────
function addFifteen(slot) {
  const [h, m] = slot.split(':').map(Number)
  const total  = h * 60 + m + 15
  return `${String(Math.floor(total / 60)).padStart(2,'0')}:${String(total % 60).padStart(2,'0')}`
}

// Return [{start, end}, …] for every contiguous selected block
function getSelectedRanges(pendingSlots) {
  const sorted = ALL_SLOTS.filter(s => pendingSlots.has(s))
  if (!sorted.length) return []
  const ranges = []
  let start = sorted[0], prev = sorted[0]
  for (let i = 1; i < sorted.length; i++) {
    if (ALL_SLOTS.indexOf(sorted[i]) - ALL_SLOTS.indexOf(prev) > 1) {
      ranges.push({ start, end: prev })
      start = sorted[i]
    }
    prev = sorted[i]
  }
  ranges.push({ start, end: prev })
  return ranges
}

function formatRange({ start, end }) {
  // e.g.  "1:00 – 3:15 PM"
  const s = formatSlot(start)
  const e = formatSlot(addFifteen(end))
  // trim duplicate AM/PM when both are same
  const sAp = s.slice(-2), eAp = e.slice(-2)
  return sAp === eAp
    ? `${s.slice(0, -3)} – ${e}`   // "1:00 – 3:15 PM"
    : `${s} – ${e}`
}

// ── Parses typed time strings like "9am", "9:30", "14:00", "2:30pm" ─────────
function parseTypedTime(raw) {
  const s = raw.trim().toLowerCase().replace(/\s/g, '')
  if (!s) return null
  // Match patterns: 9, 9am, 9:30, 9:30am, 14, 14:30
  const m = s.match(/^(\d{1,2})(?::(\d{2}))?([ap]m?)?$/)
  if (!m) return null
  let h = parseInt(m[1])
  const min = m[2] ? parseInt(m[2]) : 0
  const ampm = m[3]
  if (ampm === 'pm' || ampm === 'p') { if (h !== 12) h += 12 }
  else if (ampm === 'am' || ampm === 'a') { if (h === 12) h = 0 }
  else if (h < 7) h += 12  // assume PM for ambiguous times like "2" or "3:30"
  if (h < 0 || h > 23 || min < 0 || min > 59) return null
  // Snap to nearest 15-min slot
  const snapped = Math.round(min / 15) * 15
  const finalH = snapped === 60 ? h + 1 : h
  const finalM = snapped === 60 ? 0 : snapped
  if (finalH > 23) return null
  return `${String(finalH).padStart(2,'0')}:${String(finalM).padStart(2,'0')}`
}

// ── Typeable time input with dropdown suggestions ─────────────────────────────
function TimeInput({ value, onChange, placeholder, filterAfter }) {
  const [text, setText]       = useState(formatSlot(value))
  const [open, setOpen]       = useState(false)
  const [focused, setFocused] = useState(false)
  const containerRef          = useRef(null)

  // Keep display text in sync when value changes externally
  useEffect(() => { if (!focused) setText(formatSlot(value)) }, [value, focused])

  // Close on outside click
  useEffect(() => {
    const handler = e => { if (!containerRef.current?.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const suggestions = ALL_SLOTS.filter(s => {
    if (filterAfter && s <= filterAfter) return false
    if (!text || text === formatSlot(value)) return true
    const parsed = parseTypedTime(text)
    // Show slots around typed value
    return formatSlot(s).toLowerCase().includes(text.toLowerCase()) ||
      (parsed && s >= parsed)
  }).slice(0, 12)

  const commit = (raw) => {
    const slot = parseTypedTime(raw)
    if (slot && ALL_SLOTS.includes(slot) && (!filterAfter || slot > filterAfter)) {
      onChange(slot)
      setText(formatSlot(slot))
    } else {
      setText(formatSlot(value)) // revert
    }
    setOpen(false)
  }

  return (
    <div ref={containerRef} className="relative">
      <input
        type="text"
        value={text}
        placeholder={placeholder}
        onFocus={() => { setFocused(true); setText(''); setOpen(true) }}
        onBlur={() => { setFocused(false); commit(text) }}
        onChange={e => { setText(e.target.value); setOpen(true) }}
        onKeyDown={e => {
          if (e.key === 'Enter') { commit(text); e.target.blur() }
          if (e.key === 'Escape') { setText(formatSlot(value)); setOpen(false); e.target.blur() }
        }}
        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-ink bg-white focus:border-gather-400 outline-none"
      />
      {open && suggestions.length > 0 && (
        <ul className="absolute z-50 top-full mt-1 left-0 right-0 bg-white border border-slate-200 rounded-lg shadow-lg max-h-44 overflow-y-auto">
          {suggestions.map(s => (
            <li
              key={s}
              onMouseDown={e => { e.preventDefault(); onChange(s); setText(formatSlot(s)); setOpen(false) }}
              className={`px-3 py-1.5 text-sm cursor-pointer hover:bg-gather-50 hover:text-gather-700 ${s === value ? 'bg-gather-50 text-gather-700 font-semibold' : 'text-ink'}`}
            >
              {formatSlot(s)}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

// ── Time panel for a single day ──────────────────────────────────────────────
const SLOT_H = 14   // px per 15-min row


function slotsInRange(start, end) {
  // Returns all ALL_SLOTS entries from start up to (but not including) end
  const startIdx = ALL_SLOTS.indexOf(start)
  const endIdx   = ALL_SLOTS.indexOf(end)
  if (startIdx === -1 || endIdx === -1 || endIdx <= startIdx) return []
  return ALL_SLOTS.slice(startIdx, endIdx)
}

function TimePanel({ date, slots, onChange, onClose, hasPrev, hasNext, onPrevDay, onNextDay }) {
  const [mode, setMode]                 = useState('range')
  const [pendingSlots, setPendingSlots] = useState(new Set(slots))
  const [hoverIdx, setHoverIdx]         = useState(null)
  const [dragStart, setDragStart]       = useState(null)
  const [dragMode, setDragMode]         = useState('add')
  const [rangeStart, setRangeStart]     = useState('')
  const [rangeEnd, setRangeEnd]         = useState('')
  const dragging  = useRef(false)
  const scrollRef = useRef(null)

  const dateObj = parseKey(date)
  const label   = dateObj.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })

  // Re-sync slots + scroll to 8 AM whenever the date changes
  useEffect(() => {
    setPendingSlots(new Set(slots))
    setRangeStart('')
    setRangeEnd('')
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 8 * 4 * SLOT_H
    }
  }, [date]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── drag ──────────────────────────────────────────────────────────────────
  const applyDrag = (from, to, mode, base) => {
    const [lo, hi] = [Math.min(from, to), Math.max(from, to)]
    const next = new Set(base)
    ALL_SLOTS.slice(lo, hi + 1).forEach(s => mode === 'add' ? next.add(s) : next.delete(s))
    return next
  }

  const handleMouseDown = (idx) => {
    const mode = pendingSlots.has(ALL_SLOTS[idx]) ? 'remove' : 'add'
    dragging.current = true
    setDragMode(mode)
    setDragStart(idx)
    setPendingSlots(applyDrag(idx, idx, mode, pendingSlots))
  }

  const handleMouseEnter = (idx) => {
    setHoverIdx(idx)
    if (!dragging.current || dragStart === null) return
    setPendingSlots(prev => applyDrag(dragStart, idx, dragMode, prev))
  }

  useEffect(() => {
    const up = () => { dragging.current = false }
    window.addEventListener('mouseup', up)
    return () => window.removeEventListener('mouseup', up)
  }, [])


  // ── derived display values ─────────────────────────────────────────────────
  const ranges = getSelectedRanges(pendingSlots)

  // ── save helpers ───────────────────────────────────────────────────────────
  // Always include whatever is currently in the pickers when saving
  const buildFinalSlots = () => {
    const final = new Set(pendingSlots)
    if (rangeStart && rangeEnd) slotsInRange(rangeStart, rangeEnd).forEach(s => final.add(s))
    return [...final].sort()
  }

  const saveAndClose = () => { onChange(date, buildFinalSlots()); onClose() }
  const saveAndNext  = () => { onChange(date, buildFinalSlots()); onNextDay() }
  const saveAndPrev  = () => { onChange(date, buildFinalSlots()); onPrevDay() }

  // Count of time frames including the current picker if it forms a valid range
  const currentPickerValid = rangeStart && rangeEnd && rangeEnd > rangeStart
  const totalFrames = ranges.length + (currentPickerValid ? 1 : 0)

  // ── presets ────────────────────────────────────────────────────────────────
  const PRESETS = [
    { label: 'Morning',      test: h => h >= 8  && h < 12 },
    { label: 'Afternoon',    test: h => h >= 12 && h < 17 },
    { label: 'Business hrs', test: h => h >= 9  && h < 17 },
    { label: 'Evening',      test: h => h >= 17 && h < 21 },
  ]

  const addRange = () => {
    const toAdd = slotsInRange(rangeStart, rangeEnd)
    if (toAdd.length === 0) return
    setPendingSlots(prev => {
      const next = new Set(prev)
      toAdd.forEach(s => next.add(s))
      return next
    })
  }

  return (
    <div className="flex flex-col h-full select-none">

      {/* ── Header ── */}
      <div className="flex items-start justify-between mb-3 shrink-0">
        <div>
          <h3 className="font-bold text-ink text-base leading-tight">{label}</h3>
          <p className="text-xs text-slate-400 mt-0.5">
            {totalFrames > 0 ? `${totalFrames} time frame${totalFrames !== 1 ? 's' : ''} selected` : 'Select your available times'}
          </p>
        </div>
        <button
          onClick={saveAndClose}
          className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-400 text-xs transition-colors shrink-0"
        >✕</button>
      </div>

      {/* ── Mode tabs ── */}
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

      {/* ── Selected time-window chips (drag mode only) ── */}
      {mode === 'drag' && (
        <div className="mb-3 shrink-0 min-h-[28px]">
          {ranges.length > 0 ? (
            <>
              <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest mb-1.5">Selected</p>
              <div className="flex flex-wrap gap-1.5">
                {ranges.map((r, i) => (
                  <span
                    key={i}
                    className="px-2.5 py-1 bg-gather-100 text-gather-700 rounded-full text-xs font-semibold"
                  >
                    {formatRange(r)}
                  </span>
                ))}
              </div>
            </>
          ) : (
            <p className="text-[11px] text-slate-300 italic">No times selected yet</p>
          )}
        </div>
      )}

      {mode === 'range' ? (
        /* ── Range picker ── */
        <div className="flex-1 flex flex-col gap-3 overflow-y-auto">
          {/* Added ranges list */}
          {ranges.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">Added time slots</p>
              {ranges.map((r, i) => (
                <div key={i} className="flex items-center justify-between px-3 py-2 bg-gather-50 rounded-lg border border-gather-100">
                  <span className="text-sm font-semibold text-gather-700">{formatRange(r)}</span>
                  <button
                    onClick={() => {
                      const toRemove = slotsInRange(r.start, addFifteen(r.end))
                      setPendingSlots(prev => {
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

          {/* Current range editor */}
          <div>
            <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest mb-2">
              {ranges.length > 1 ? 'Edit latest slot' : 'Time slot'}
            </p>
            <div className="flex gap-2 items-end">
              <div className="flex-1">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Start</label>
                <TimeInput
                  value={rangeStart}
                  onChange={v => { setRangeStart(v); if (v && rangeEnd && rangeEnd <= v) setRangeEnd(ALL_SLOTS.find(s => s > v) || '23:45') }}
                  placeholder="e.g. 9am"
                />
              </div>
              <div className="flex-1">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">End</label>
                <TimeInput
                  value={rangeEnd}
                  onChange={v => setRangeEnd(v)}
                  placeholder="e.g. 5pm"
                  filterAfter={rangeStart}
                />
              </div>
            </div>
          </div>
          <button
            onClick={() => {
              addRange()
              const nextEnd = rangeEnd ? (ALL_SLOTS[Math.min(ALL_SLOTS.indexOf(rangeEnd) + 8, ALL_SLOTS.length - 1)] || '23:45') : ''
              setRangeStart(rangeEnd || '')
              setRangeEnd(nextEnd)
            }}
            disabled={!currentPickerValid}
            className="w-full py-2 bg-gather-100 text-gather-700 font-semibold rounded-lg text-sm hover:bg-gather-200 transition-colors disabled:opacity-40"
          >
            + Add another time slot
          </button>
          {ranges.length > 0 && (
            <button
              onClick={() => setPendingSlots(new Set())}
              className="w-full py-1.5 text-xs text-slate-400 hover:text-red-400 transition-colors"
            >
              Clear all
            </button>
          )}
        </div>
      ) : (
        <>
          {/* ── Presets ── */}
          <div className="flex gap-1.5 mb-3 flex-wrap shrink-0">
            {PRESETS.map(p => {
              const ps     = ALL_SLOTS.filter(s => p.test(parseInt(s)))
              const active = ps.length > 0 && ps.every(s => pendingSlots.has(s))
              return (
                <button
                  key={p.label}
                  onClick={() => setPendingSlots(prev => {
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
              onClick={() => setPendingSlots(new Set())}
              className="px-2.5 py-1 text-xs font-medium rounded-full border border-slate-200 text-slate-400 hover:border-red-200 hover:text-red-400 transition-all bg-white"
            >Clear</button>
          </div>

          {/* ── Vertical time grid ── */}
          <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto"
            onMouseLeave={() => setHoverIdx(null)}
          >
        {ALL_SLOTS.map((slot, idx) => {
          const selected   = pendingSlots.has(slot)
          const isHov      = hoverIdx === idx && !dragging.current
          const min        = parseInt(slot.split(':')[1])
          const isHourMark = min === 0
          const isHalfMark = min === 30

          // Range-edge rounding
          const prevSel = idx > 0                  && pendingSlots.has(ALL_SLOTS[idx - 1])
          const nextSel = idx < ALL_SLOTS.length-1 && pendingSlots.has(ALL_SLOTS[idx + 1])
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
              {/* Time label column */}
              <div className="w-14 shrink-0 flex items-center justify-end pr-2 pointer-events-none">
                {isHourMark && (
                  <span className="text-[10px] text-slate-400 font-medium leading-none -mt-[1px]">
                    {formatHour(slot)}
                  </span>
                )}
                {isHalfMark && (
                  <span className="text-[9px] text-slate-300 leading-none">:30</span>
                )}
              </div>

              {/* Selection bar */}
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

      {/* ── Footer: save + day navigation ── */}
      <div className="shrink-0 mt-3 space-y-2">

        {/* Prev / Next day nav */}
        {(hasPrev || hasNext) && (
          <div className="flex gap-2">
            <button
              onClick={saveAndPrev}
              disabled={!hasPrev}
              className="flex-1 py-2 text-xs font-semibold rounded-xl border border-slate-200 text-slate-400 hover:border-gather-300 hover:text-gather-600 transition-all disabled:opacity-0 disabled:pointer-events-none"
            >← Prev day</button>
            <button
              onClick={saveAndNext}
              disabled={!hasNext}
              className="flex-1 py-2 text-xs font-semibold rounded-xl bg-gather-100 text-gather-700 hover:bg-gather-200 transition-all disabled:opacity-0 disabled:pointer-events-none"
            >Next day →</button>
          </div>
        )}

        {/* Save & close */}
        <button
          onClick={saveAndClose}
          className="w-full py-3 bg-gather-600 text-white font-semibold rounded-xl hover:bg-gather-700 transition-all shadow-md shadow-gather-100 text-sm"
        >
          {totalFrames > 0 ? `Save ${totalFrames} time frame${totalFrames !== 1 ? 's' : ''} for this day ✓` : 'Save (no times) ✓'}
        </button>
      </div>
    </div>
  )
}

// Common IANA timezone list grouped by region
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

export default function CalendarStep({ selectedDates, timeSlots, timezone, onDatesChange, onTimeSlotsChange, onTimezoneChange, onNext, onBack }) {
  const today = new Date()
  const [year,  setYear]  = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())
  const [activeDay, setActiveDay]   = useState(null)
  const [selecting, setSelecting]   = useState(false)
  const [selectMode, setSelectMode] = useState('add')

  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  const prevMonth = () => {
    if (month === 0) { setMonth(11); setYear(y => y - 1) }
    else setMonth(m => m - 1)
  }
  const nextMonth = () => {
    if (month === 11) { setMonth(0); setYear(y => y + 1) }
    else setMonth(m => m + 1)
  }

  const isPast = (day) => {
    const d = new Date(year, month, day)
    d.setHours(0,0,0,0)
    const t = new Date(); t.setHours(0,0,0,0)
    return d < t
  }

  const handleMouseDown = (day) => {
    if (isPast(day)) return
    const key = toKey(year, month, day)
    const mode = selectedDates.includes(key) ? 'remove' : 'add'
    setSelectMode(mode)
    setSelecting(true)
    onDatesChange(
      mode === 'add'
        ? [...new Set([...selectedDates, key])].sort()
        : selectedDates.filter(d => d !== key)
    )
  }

  const handleMouseEnter = (day) => {
    if (!selecting || isPast(day)) return
    const key = toKey(year, month, day)
    onDatesChange(
      selectMode === 'add'
        ? [...new Set([...selectedDates, key])].sort()
        : selectedDates.filter(d => d !== key)
    )
  }

  useEffect(() => {
    const up = () => setSelecting(false)
    window.addEventListener('mouseup', up)
    return () => window.removeEventListener('mouseup', up)
  }, [])

  const canContinue = selectedDates.length > 0

  // Build grid cells (leading empties + day cells)
  const cells = []
  for (let i = 0; i < firstDay; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)
  // Pad to complete last row
  while (cells.length % 7 !== 0) cells.push(null)

  return (
    <div className="w-full max-w-5xl step-enter flex gap-6 items-start">
      {/* Left: calendar */}
      <div className="flex-1 min-w-0">
        <p className="text-gather-600 text-sm font-semibold uppercase tracking-widest mb-4">
          3 → Dates &amp; Times
        </p>
        <h2 className="text-3xl md:text-4xl font-bold text-ink mb-2 leading-tight">
          When might you meet?
        </h2>
        <p className="text-slate-400 text-sm mb-4">Select your dates, then click a date to view and confirm time slots.</p>

        {/* Timezone selector */}
        <div className="flex items-center gap-2 mb-6">
          <span className="text-xs font-semibold text-slate-400 shrink-0">Timezone:</span>
          <select
            value={timezone || ''}
            onChange={e => onTimezoneChange(e.target.value || Intl.DateTimeFormat().resolvedOptions().timeZone)}
            className="flex-1 max-w-xs px-3 py-1.5 border border-slate-200 rounded-lg text-xs text-ink bg-white focus:border-gather-400 outline-none"
          >
            {TZ_OPTIONS.map((tz, i) => (
              <option key={i} value={tz.value} disabled={tz.disabled}>{tz.label}</option>
            ))}
          </select>
          {timezone && (
            <span className="text-[10px] text-slate-400 shrink-0">
              {new Date().toLocaleTimeString('en-US', { timeZone: timezone, hour: '2-digit', minute: '2-digit', hour12: true })} now
            </span>
          )}
        </div>

        {/* Month nav */}
        <div className="flex items-center justify-between mb-4">
          <button onClick={prevMonth} className="w-9 h-9 rounded-xl border border-slate-200 hover:border-gather-300 flex items-center justify-center text-slate-500 hover:text-gather-600 transition-colors">
            ‹
          </button>
          <span className="font-bold text-ink text-lg">{MONTHS[month]} {year}</span>
          <button onClick={nextMonth} className="w-9 h-9 rounded-xl border border-slate-200 hover:border-gather-300 flex items-center justify-center text-slate-500 hover:text-gather-600 transition-colors">
            ›
          </button>
        </div>

        {/* Day headers */}
        <div className="grid grid-cols-7 mb-2">
          {DAYS.map(d => (
            <div key={d} className="text-center text-xs font-semibold text-slate-400 uppercase py-1">{d}</div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-1 no-select">
          {cells.map((day, i) => {
            if (!day) return <div key={`empty-${i}`} />
            const key = toKey(year, month, day)
            const selected = selectedDates.includes(key)
            const past = isPast(day)
            const isToday = new Date(year, month, day).toDateString() === today.toDateString()
            const hasTime = timeSlots[key]?.length > 0
            return (
              <div
                key={day}
                onMouseDown={() => handleMouseDown(day)}
                onMouseEnter={() => handleMouseEnter(day)}
                onClick={() => !past && selected && setActiveDay(activeDay === key ? null : key)}
                className={`
                  relative aspect-square rounded-xl flex flex-col items-center justify-center text-sm font-semibold cursor-pointer transition-all
                  ${past ? 'text-slate-200 cursor-not-allowed' : ''}
                  ${!past && !selected ? 'text-slate-600 hover:bg-gather-50 hover:text-gather-700' : ''}
                  ${selected ? 'bg-gather-500 text-white shadow-md shadow-gather-200 scale-95' : ''}
                  ${activeDay === key ? 'ring-2 ring-gather-400 ring-offset-1' : ''}
                  ${isToday && !selected ? 'ring-2 ring-gather-200' : ''}
                `}
              >
                {day}
                {hasTime && (
                  <span className="absolute bottom-1.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-white/70" />
                )}
              </div>
            )
          })}
        </div>

        {/* Selected dates list */}
        {selectedDates.length > 0 && (
          <div className="mt-5">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              {selectedDates.length} date{selectedDates.length !== 1 ? 's' : ''} selected — click a date to set times
            </p>
            <div className="flex flex-wrap gap-2">
              {selectedDates.map(d => {
                const obj = parseKey(d)
                const label = obj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                const hasT = timeSlots[d]?.length > 0
                return (
                  <button
                    key={d}
                    onClick={() => setActiveDay(activeDay === d ? null : d)}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all ${
                      activeDay === d
                        ? 'bg-gather-600 text-white'
                        : 'bg-gather-100 text-gather-700 hover:bg-gather-200'
                    }`}
                  >
                    {hasT && <span>⏰</span>}
                    {label}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        <div className="flex items-center justify-between mt-8">
          <button onClick={onBack} className="text-slate-400 hover:text-slate-600 transition-colors text-sm font-medium">
            ← Back
          </button>
          <button
            onClick={onNext}
            disabled={!canContinue}
            className="px-6 py-3 bg-gather-600 text-white font-semibold rounded-xl disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gather-700 transition-all hover:scale-[1.02] active:scale-[0.98] shadow-md shadow-gather-100"
          >
            Continue →
          </button>
        </div>
      </div>

      {/* Right: time panel (slides in) */}
      {activeDay && (() => {
        const activeDayIdx = selectedDates.indexOf(activeDay)
        const hasPrev = activeDayIdx > 0
        const hasNext = activeDayIdx < selectedDates.length - 1
        return (
          <div className="w-80 shrink-0 bg-white rounded-2xl border border-slate-100 shadow-xl p-5 h-[580px] flex flex-col animate-panel-in">
            <TimePanel
              date={activeDay}
              slots={timeSlots[activeDay] || []}
              onChange={(date, slots) => onTimeSlotsChange({ ...timeSlots, [date]: slots })}
              onClose={() => setActiveDay(null)}
              hasPrev={hasPrev}
              hasNext={hasNext}
              onPrevDay={() => setActiveDay(selectedDates[activeDayIdx - 1])}
              onNextDay={() => setActiveDay(selectedDates[activeDayIdx + 1])}
            />
          </div>
        )
      })()}
    </div>
  )
}
