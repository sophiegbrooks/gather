import { useState, useRef, useEffect } from 'react'

const DAYS   = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']

// Generate time slots from 6:00 AM to 10:45 PM in 15-min increments
const ALL_SLOTS = (() => {
  const slots = []
  for (let h = 6; h <= 22; h++) {
    slots.push(`${String(h).padStart(2,'0')}:00`)
    slots.push(`${String(h).padStart(2,'0')}:15`)
    if (h < 22) {
      slots.push(`${String(h).padStart(2,'0')}:30`)
      slots.push(`${String(h).padStart(2,'0')}:45`)
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

// ── Time panel for a single day ──────────────────────────────────────────────
const SLOT_H = 14   // px per 15-min row

function TimePanel({ date, slots, onChange, onClose, hasPrev, hasNext, onPrevDay, onNextDay }) {
  const [pendingSlots, setPendingSlots] = useState(new Set(slots))
  const [hoverIdx, setHoverIdx]         = useState(null)
  const [dragStart, setDragStart]       = useState(null)
  const [dragMode, setDragMode]         = useState('add')
  const dragging  = useRef(false)
  const scrollRef = useRef(null)

  const dateObj = parseKey(date)
  const label   = dateObj.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })

  // Re-sync slots + scroll to 8 AM whenever the date changes
  useEffect(() => {
    setPendingSlots(new Set(slots))
    if (scrollRef.current) {
      // 8 AM = (8-6) hours × 4 slots × SLOT_H px
      scrollRef.current.scrollTop = 2 * 4 * SLOT_H
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
  const ranges       = getSelectedRanges(pendingSlots)
  const totalMins    = pendingSlots.size * 15
  const durationLabel = totalMins >= 60
    ? `${Math.floor(totalMins / 60)}h${totalMins % 60 ? ` ${totalMins % 60}m` : ''}`
    : totalMins > 0 ? `${totalMins}m` : null

  // ── save helpers ───────────────────────────────────────────────────────────
  const save = () => onChange(date, [...pendingSlots].sort())

  const saveAndClose    = () => { save(); onClose() }
  const saveAndNext     = () => { save(); onNextDay() }
  const saveAndPrev     = () => { save(); onPrevDay() }

  // ── presets ────────────────────────────────────────────────────────────────
  const PRESETS = [
    { label: 'Morning',      test: h => h >= 8  && h < 12 },
    { label: 'Afternoon',    test: h => h >= 12 && h < 17 },
    { label: 'Business hrs', test: h => h >= 9  && h < 17 },
    { label: 'Evening',      test: h => h >= 17 && h < 21 },
  ]

  return (
    <div className="flex flex-col h-full select-none">

      {/* ── Header ── */}
      <div className="flex items-start justify-between mb-3 shrink-0">
        <div>
          <h3 className="font-bold text-ink text-base leading-tight">{label}</h3>
          <p className="text-xs text-slate-400 mt-0.5">
            {durationLabel ? `${pendingSlots.size} slots · ${durationLabel}` : 'Drag to select your availability'}
          </p>
        </div>
        <button
          onClick={saveAndClose}
          className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-400 text-xs transition-colors shrink-0"
        >✕</button>
      </div>

      {/* ── Selected time-window chips ── */}
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
          {durationLabel ? `Save ${durationLabel} for this day ✓` : 'Save (no times) ✓'}
        </button>
      </div>
    </div>
  )
}

export default function CalendarStep({ selectedDates, timeSlots, onDatesChange, onTimeSlotsChange, onNext, onBack }) {
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
          4 → Dates &amp; Times
        </p>
        <h2 className="text-3xl md:text-4xl font-bold text-ink mb-2 leading-tight">
          When might you meet?
        </h2>
        <p className="text-slate-400 text-sm mb-6">Click and drag to select multiple dates. Then click a date to set times.</p>

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
