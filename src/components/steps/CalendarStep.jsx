import { useState, useCallback, useEffect } from 'react'

const DAYS   = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']

// Generate time slots from 6:00 AM to 10:30 PM in 30-min increments
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

function toKey(year, month, day) {
  return `${year}-${String(month + 1).padStart(2,'0')}-${String(day).padStart(2,'0')}`
}

function parseKey(key) {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d)
}

// Time panel for a single day
function TimePanel({ date, slots, onChange, onClose }) {
  const [dragging, setDragging]   = useState(false)
  const [dragMode, setDragMode]   = useState('add')
  const [dragStart, setDragStart] = useState(null)
  const [hoverIdx, setHoverIdx]   = useState(null)
  const [pendingSlots, setPendingSlots] = useState(new Set(slots))

  const dateObj = parseKey(date)
  const label   = dateObj.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })

  const getRange = (a, b) => {
    const [lo, hi] = [Math.min(a, b), Math.max(a, b)]
    return ALL_SLOTS.slice(lo, hi + 1)
  }

  const handleMouseDown = (idx) => {
    const slot = ALL_SLOTS[idx]
    const mode = pendingSlots.has(slot) ? 'remove' : 'add'
    setDragMode(mode)
    setDragStart(idx)
    setDragging(true)
    setPendingSlots(prev => {
      const next = new Set(prev)
      mode === 'add' ? next.add(slot) : next.delete(slot)
      return next
    })
  }

  const handleMouseEnter = (idx) => {
    setHoverIdx(idx)
    if (!dragging || dragStart === null) return
    const range = getRange(dragStart, idx)
    setPendingSlots(prev => {
      const next = new Set(prev)
      range.forEach(s => dragMode === 'add' ? next.add(s) : next.delete(s))
      return next
    })
  }

  const handleMouseUp = () => setDragging(false)

  useEffect(() => {
    window.addEventListener('mouseup', handleMouseUp)
    return () => window.removeEventListener('mouseup', handleMouseUp)
  }, [])

  const confirm = () => {
    onChange(date, [...pendingSlots].sort())
    onClose()
  }

  // Group into AM / PM
  const amSlots  = ALL_SLOTS.filter(s => parseInt(s) < 12)
  const pmSlots  = ALL_SLOTS.filter(s => parseInt(s) >= 12)

  const SlotRow = ({ slot }) => {
    const idx = ALL_SLOTS.indexOf(slot)
    const selected = pendingSlots.has(slot)
    const isHourMark = slot.endsWith(':00')
    return (
      <div
        onMouseDown={() => handleMouseDown(idx)}
        onMouseEnter={() => handleMouseEnter(idx)}
        className={`
          relative flex items-center gap-3 px-4 py-1.5 cursor-pointer no-select rounded-lg transition-colors
          ${selected ? 'bg-gather-500 text-white' : 'hover:bg-gather-50 text-slate-600'}
        `}
      >
        {isHourMark && (
          <span className={`text-xs font-medium w-14 shrink-0 ${selected ? 'text-white/80' : 'text-slate-400'}`}>
            {formatSlot(slot)}
          </span>
        )}
        {!isHourMark && <span className="w-14 shrink-0" />}
        <div className={`flex-1 h-5 rounded ${selected ? 'bg-white/20' : 'bg-slate-100'} transition-colors`} />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-4 px-1">
        <div>
          <h3 className="font-bold text-ink text-lg leading-tight">{label}</h3>
          <p className="text-sm text-slate-400">
            {pendingSlots.size > 0 ? `${pendingSlots.size} time slots selected` : 'Drag to select availability'}
          </p>
        </div>
        <button onClick={onClose} className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors">
          ✕
        </button>
      </div>

      {/* Quick presets */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {[
          { label: 'Morning', slots: ALL_SLOTS.filter(s => { const h = parseInt(s); return h >= 8 && h < 12 }) },
          { label: 'Afternoon', slots: ALL_SLOTS.filter(s => { const h = parseInt(s); return h >= 12 && h < 17 }) },
          { label: 'Business hours', slots: ALL_SLOTS.filter(s => { const h = parseInt(s); return h >= 9 && h < 17 }) },
        ].map(preset => (
          <button
            key={preset.label}
            onClick={() => setPendingSlots(new Set(preset.slots))}
            className="px-3 py-1.5 bg-slate-100 hover:bg-gather-100 hover:text-gather-700 text-slate-500 text-xs font-medium rounded-full transition-colors"
          >
            {preset.label}
          </button>
        ))}
        <button
          onClick={() => setPendingSlots(new Set())}
          className="px-3 py-1.5 bg-slate-100 hover:bg-red-50 hover:text-red-500 text-slate-500 text-xs font-medium rounded-full transition-colors"
        >
          Clear
        </button>
      </div>

      {/* Time grid */}
      <div className="flex-1 overflow-y-auto pr-1" onMouseLeave={() => setHoverIdx(null)}>
        <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-4 py-1 mb-1">Morning</div>
        {amSlots.map(slot => <SlotRow key={slot} slot={slot} />)}
        <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-4 py-2 mt-1 mb-1">Afternoon & Evening</div>
        {pmSlots.map(slot => <SlotRow key={slot} slot={slot} />)}
      </div>

      <button
        onClick={confirm}
        className="mt-4 w-full py-3 bg-gather-600 text-white font-semibold rounded-xl hover:bg-gather-700 transition-all shadow-md shadow-gather-100"
      >
        {pendingSlots.size > 0 ? `Confirm ${pendingSlots.size} slots →` : 'Save (none selected) →'}
      </button>
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
      {activeDay && (
        <div className="w-80 shrink-0 bg-white rounded-2xl border border-slate-100 shadow-xl p-5 h-[560px] flex flex-col animate-panel-in">
          <TimePanel
            date={activeDay}
            slots={timeSlots[activeDay] || []}
            onChange={(date, slots) => {
              onTimeSlotsChange({ ...timeSlots, [date]: slots })
            }}
            onClose={() => setActiveDay(null)}
          />
        </div>
      )}
    </div>
  )
}
