import { useState, useEffect, useRef } from 'react'

const DAYS   = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']

const SLOT_DURATIONS = [
  { label: '15 min', value: 15 },
  { label: '30 min', value: 30 },
  { label: '45 min', value: 45 },
  { label: '1 hr',   value: 60 },
  { label: '90 min', value: 90 },
  { label: '2 hr',   value: 120 },
]

// All 15-min slots for the full day
const ALL_SLOTS = (() => {
  const slots = []
  for (let h = 0; h < 24; h++)
    for (let m = 0; m < 60; m += 15)
      slots.push(`${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`)
  return slots
})()

// Common options shown in the time selects (every 15 min, 6 AM – 11 PM)
const TIME_OPTIONS = ALL_SLOTS.filter(s => {
  const h = parseInt(s)
  return h >= 6 && h <= 23
})

function formatSlot(slot) {
  if (!slot) return ''
  const [h, m] = slot.split(':').map(Number)
  const ampm = h < 12 ? 'AM' : 'PM'
  const hour = h === 0 ? 12 : h > 12 ? h - 12 : h
  return `${hour}:${String(m).padStart(2,'0')} ${ampm}`
}

function parseTypedTime(raw) {
  const s = raw.trim().toLowerCase().replace(/\s/g, '')
  if (!s) return null
  const m = s.match(/^(\d{1,2})(?::(\d{2}))?([ap]m?)?$/)
  if (!m) return null
  let h = parseInt(m[1])
  const min = m[2] ? parseInt(m[2]) : 0
  const ampm = m[3]
  if (ampm === 'pm' || ampm === 'p') { if (h !== 12) h += 12 }
  else if (ampm === 'am' || ampm === 'a') { if (h === 12) h = 0 }
  else if (h < 7) h += 12
  if (h < 0 || h > 23 || min < 0 || min > 59) return null
  const snapped = Math.round(min / 15) * 15
  const finalH = snapped === 60 ? h + 1 : h
  const finalM = snapped === 60 ? 0 : snapped
  if (finalH > 23) return null
  return `${String(finalH).padStart(2,'0')}:${String(finalM).padStart(2,'0')}`
}

function TimeInput({ value, onChange, placeholder, filterAfter }) {
  const [text, setText]       = useState(formatSlot(value))
  const [open, setOpen]       = useState(false)
  const [focused, setFocused] = useState(false)
  const containerRef          = useRef(null)

  useEffect(() => { if (!focused) setText(formatSlot(value)) }, [value, focused])

  useEffect(() => {
    const handler = e => { if (!containerRef.current?.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const suggestions = ALL_SLOTS.filter(s => {
    if (filterAfter && s <= filterAfter) return false
    if (!text || text === formatSlot(value)) return true
    const parsed = parseTypedTime(text)
    return formatSlot(s).toLowerCase().includes(text.toLowerCase()) ||
      (parsed && s >= parsed)
  })

  const commit = (raw) => {
    const slot = parseTypedTime(raw)
    if (slot && ALL_SLOTS.includes(slot) && (!filterAfter || slot > filterAfter)) {
      onChange(slot)
      setText(formatSlot(slot))
    } else {
      setText(formatSlot(value))
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

function toKey(year, month, day) {
  return `${year}-${String(month + 1).padStart(2,'0')}-${String(day).padStart(2,'0')}`
}

function parseKey(key) {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d)
}

// Expand a time range into slots of the given duration
function expandSlots(startTime, endTime, durationMin) {
  if (!startTime || !endTime || !durationMin) return []
  const slots = []
  let [h, m] = startTime.split(':').map(Number)
  const [endH, endM] = endTime.split(':').map(Number)
  const endTotal = endH * 60 + endM
  while (true) {
    const total = h * 60 + m
    if (total >= endTotal) break
    slots.push(`${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`)
    m += durationMin
    while (m >= 60) { h++; m -= 60 }
    if (h >= 24) break
  }
  return slots
}

const TZ_OPTIONS = [
  { label: 'Local (auto-detect)', value: '' },
  { label: '─── Americas ───', value: '', disabled: true },
  { label: 'Pacific Time (PT)',   value: 'America/Los_Angeles' },
  { label: 'Mountain Time (MT)', value: 'America/Denver' },
  { label: 'Central Time (CT)',  value: 'America/Chicago' },
  { label: 'Eastern Time (ET)',  value: 'America/New_York' },
  { label: 'Atlantic Time (AT)', value: 'America/Halifax' },
  { label: 'São Paulo (BRT)',    value: 'America/Sao_Paulo' },
  { label: '─── Europe ───', value: '', disabled: true },
  { label: 'London (GMT/BST)',   value: 'Europe/London' },
  { label: 'Paris / Berlin (CET)', value: 'Europe/Paris' },
  { label: 'Helsinki (EET)',     value: 'Europe/Helsinki' },
  { label: 'Moscow (MSK)',       value: 'Europe/Moscow' },
  { label: '─── Asia / Pacific ───', value: '', disabled: true },
  { label: 'Dubai (GST)',        value: 'Asia/Dubai' },
  { label: 'India (IST)',        value: 'Asia/Kolkata' },
  { label: 'Singapore (SGT)',    value: 'Asia/Singapore' },
  { label: 'Tokyo (JST)',        value: 'Asia/Tokyo' },
  { label: 'Sydney (AEST)',      value: 'Australia/Sydney' },
]

export default function SignupScheduleStep({
  selectedDates, startTime, endTime, slotDuration, timezone,
  onDatesChange, onStartTimeChange, onEndTimeChange, onSlotDurationChange, onTimezoneChange,
  onNext, onBack,
}) {
  const today = new Date()
  const [year,  setYear]  = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())
  const [selecting,   setSelecting]   = useState(false)
  const [selectMode,  setSelectMode]  = useState('add')

  useEffect(() => {
    const up = () => setSelecting(false)
    window.addEventListener('mouseup', up)
    return () => window.removeEventListener('mouseup', up)
  }, [])

  const firstDay    = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  const isPast = (day) => {
    const d = new Date(year, month, day)
    d.setHours(0,0,0,0)
    const t = new Date(); t.setHours(0,0,0,0)
    return d < t
  }

  const handleMouseDown = (day) => {
    if (isPast(day)) return
    const key  = toKey(year, month, day)
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

  // Build calendar grid
  const cells = []
  for (let i = 0; i < firstDay; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)
  while (cells.length % 7 !== 0) cells.push(null)

  // Slot preview
  const slots      = expandSlots(startTime, endTime, slotDuration)
  const slotCount  = slots.length
  const timeLabel  = startTime && endTime ? `${formatSlot(startTime)} – ${formatSlot(endTime)}` : ''
  const durLabel   = SLOT_DURATIONS.find(d => d.value === slotDuration)?.label || ''

  const canContinue = selectedDates.length > 0 && slotCount > 0

  return (
    <div className="w-full max-w-5xl step-enter flex gap-8 items-start">

      {/* ── Left: calendar ── */}
      <div className="flex-1 min-w-0">
        <p className="text-gather-600 text-sm font-semibold uppercase tracking-widest mb-4">
          2 → Dates
        </p>
        <h2 className="text-3xl md:text-4xl font-bold text-ink mb-2 leading-tight">
          Which days are available?
        </h2>
        <p className="text-slate-400 text-sm mb-6">Click or drag to select dates. The same time window applies to all selected days.</p>

        {/* Month nav */}
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => month === 0 ? (setMonth(11), setYear(y => y-1)) : setMonth(m => m-1)}
            className="w-9 h-9 rounded-xl border border-slate-200 hover:border-gather-300 flex items-center justify-center text-slate-500 hover:text-gather-600 transition-colors"
          >‹</button>
          <span className="font-bold text-ink text-lg">{MONTHS[month]} {year}</span>
          <button
            onClick={() => month === 11 ? (setMonth(0), setYear(y => y+1)) : setMonth(m => m+1)}
            className="w-9 h-9 rounded-xl border border-slate-200 hover:border-gather-300 flex items-center justify-center text-slate-500 hover:text-gather-600 transition-colors"
          >›</button>
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
            if (!day) return <div key={`e-${i}`} />
            const key      = toKey(year, month, day)
            const selected = selectedDates.includes(key)
            const past     = isPast(day)
            const isToday  = new Date(year, month, day).toDateString() === today.toDateString()
            return (
              <div
                key={day}
                onMouseDown={() => handleMouseDown(day)}
                onMouseEnter={() => handleMouseEnter(day)}
                className={`
                  aspect-square rounded-xl flex items-center justify-center text-sm font-semibold cursor-pointer transition-all
                  ${past     ? 'text-slate-200 cursor-not-allowed' : ''}
                  ${!past && !selected ? 'text-slate-600 hover:bg-gather-50 hover:text-gather-700' : ''}
                  ${selected ? 'bg-gather-500 text-white shadow-md shadow-gather-200 scale-95' : ''}
                  ${isToday && !selected ? 'ring-2 ring-gather-200' : ''}
                `}
              >
                {day}
              </div>
            )
          })}
        </div>

        {/* Selected dates summary */}
        {selectedDates.length > 0 && (
          <div className="mt-5">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              {selectedDates.length} date{selectedDates.length !== 1 ? 's' : ''} selected
            </p>
            <div className="flex flex-wrap gap-2">
              {selectedDates.map(d => {
                const obj   = parseKey(d)
                const label = obj.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
                return (
                  <span
                    key={d}
                    onClick={() => onDatesChange(selectedDates.filter(x => x !== d))}
                    className="px-3 py-1.5 rounded-full text-xs font-semibold bg-gather-100 text-gather-700 cursor-pointer hover:bg-red-50 hover:text-red-500 transition-colors"
                    title="Click to remove"
                  >
                    {label} ×
                  </span>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* ── Right: time config ── */}
      <div className="w-72 shrink-0 flex flex-col gap-6">
        <div>
          <p className="text-gather-600 text-sm font-semibold uppercase tracking-widest mb-4">
            2 → Time &amp; Slots
          </p>
          <h2 className="text-3xl font-bold text-ink mb-2 leading-tight">Configure your slots</h2>
        </div>

        {/* Time window */}
        <div className="bg-white rounded-2xl border border-slate-100 p-5 space-y-4">
          <p className="text-sm font-semibold text-ink">Time window</p>
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <label className="block text-xs text-slate-400 mb-1">Start</label>
              <TimeInput
                value={startTime || '09:00'}
                onChange={v => { onStartTimeChange(v); if (endTime && endTime <= v) onEndTimeChange(ALL_SLOTS.find(s => s > v) || '23:45') }}
                placeholder="e.g. 9am"
              />
            </div>
            <span className="text-slate-300 mt-4">→</span>
            <div className="flex-1">
              <label className="block text-xs text-slate-400 mb-1">End</label>
              <TimeInput
                value={endTime || '17:00'}
                onChange={onEndTimeChange}
                placeholder="e.g. 5pm"
                filterAfter={startTime || '09:00'}
              />
            </div>
          </div>
        </div>

        {/* Slot duration */}
        <div className="bg-white rounded-2xl border border-slate-100 p-5">
          <p className="text-sm font-semibold text-ink mb-3">Slot duration</p>
          <div className="grid grid-cols-3 gap-2">
            {SLOT_DURATIONS.map(d => (
              <button
                key={d.value}
                onClick={() => onSlotDurationChange(d.value)}
                className={`py-2 rounded-xl text-xs font-semibold border-2 transition-all ${
                  slotDuration === d.value
                    ? 'bg-gather-600 border-gather-600 text-white shadow-md shadow-gather-100'
                    : 'bg-white border-slate-200 text-slate-500 hover:border-gather-300 hover:text-gather-600'
                }`}
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>

        {/* Preview */}
        {slotCount > 0 ? (
          <div className="bg-gather-50 border border-gather-100 rounded-2xl p-4 text-center">
            <p className="text-2xl font-bold text-gather-700">{slotCount}</p>
            <p className="text-xs text-gather-600 font-medium mt-0.5">
              {durLabel} slot{slotCount !== 1 ? 's' : ''} per day
            </p>
            <p className="text-xs text-slate-400 mt-1">{timeLabel}</p>
            {selectedDates.length > 1 && (
              <p className="text-xs text-gather-600 font-medium mt-2 pt-2 border-t border-gather-100">
                {slotCount * selectedDates.length} total across {selectedDates.length} days
              </p>
            )}
          </div>
        ) : (
          <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 text-center">
            <p className="text-xs text-slate-400">
              {!startTime || !endTime
                ? 'Set a start and end time to preview slots'
                : 'End time must be after start time'}
            </p>
          </div>
        )}

        {/* Timezone */}
        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Timezone</p>
          <select
            value={timezone || ''}
            onChange={e => onTimezoneChange(e.target.value || Intl.DateTimeFormat().resolvedOptions().timeZone)}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs text-ink bg-white focus:border-gather-400 outline-none"
          >
            {TZ_OPTIONS.map((tz, i) => (
              <option key={i} value={tz.value} disabled={tz.disabled}>{tz.label}</option>
            ))}
          </select>
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between pt-2">
          <button
            onClick={onBack}
            className="text-slate-400 hover:text-slate-600 transition-colors text-sm font-medium"
          >
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
        {!canContinue && (
          <p className="text-xs text-slate-400 text-right -mt-4">
            {selectedDates.length === 0
              ? 'Select at least one date'
              : 'Choose a valid time window and slot duration'}
          </p>
        )}
      </div>
    </div>
  )
}
