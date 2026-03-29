import { useState, useRef, useEffect, useCallback } from 'react'

const DAYS_SHORT  = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS      = ['January','February','March','April','May','June','July','August','September','October','November','December']
const MONTHS_SH   = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

// 15-min slots  6:00 AM → 10:45 PM
const ALL_SLOTS = (() => {
  const s = []
  for (let h = 6; h <= 22; h++) {
    s.push(`${String(h).padStart(2,'0')}:00`)
    s.push(`${String(h).padStart(2,'0')}:15`)
    if (h < 22) {
      s.push(`${String(h).padStart(2,'0')}:30`)
      s.push(`${String(h).padStart(2,'0')}:45`)
    }
  }
  return s
})()

const HOURS = Array.from({ length: 17 }, (_, i) => i + 6) // 6..22

function fmtHour(h) {
  const ap = h < 12 ? 'AM' : 'PM'
  const hr = h === 0 ? 12 : h > 12 ? h - 12 : h
  return `${hr} ${ap}`
}

function dateKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

function ymdKey(y, m, d) {
  return `${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`
}

function parseKey(key) {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function weekStartOf(date) {
  const d = new Date(date)
  const dow = d.getDay()
  d.setDate(d.getDate() - (dow === 0 ? 6 : dow - 1)) // Monday start
  d.setHours(0, 0, 0, 0)
  return d
}

function isPastDate(d) {
  const dd = new Date(d); dd.setHours(0,0,0,0)
  const now = new Date(); now.setHours(0,0,0,0)
  return dd < now
}

// ── Mini month calendar ─────────────────────────────────────────────────────
function MonthCalendar({ selectedDates, onDatesChange, onJumpToWeek }) {
  const today = new Date()
  const [year, setYear]   = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())
  const [selecting, setSelecting]   = useState(false)
  const [selectMode, setSelectMode] = useState('add')

  const prevMonth = () => { if (month === 0) { setMonth(11); setYear(y=>y-1) } else setMonth(m=>m-1) }
  const nextMonth = () => { if (month === 11) { setMonth(0); setYear(y=>y+1) } else setMonth(m=>m+1) }

  const firstDow   = new Date(year, month, 1).getDay()
  const daysInMo   = new Date(year, month+1, 0).getDate()
  const startOff   = firstDow === 0 ? 6 : firstDow - 1 // Mon-first
  const cells      = []
  for (let i = 0; i < startOff; i++) cells.push(null)
  for (let d = 1; d <= daysInMo; d++) cells.push(d)
  while (cells.length % 7 !== 0) cells.push(null)

  useEffect(() => {
    const up = () => setSelecting(false)
    window.addEventListener('mouseup', up)
    return () => window.removeEventListener('mouseup', up)
  }, [])

  const toggleDate = (day, mode) => {
    const key = ymdKey(year, month, day)
    onDatesChange(
      mode === 'add'
        ? [...new Set([...selectedDates, key])].sort()
        : selectedDates.filter(d => d !== key)
    )
  }

  return (
    <div className="w-full bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
      {/* Month nav */}
      <div className="flex items-center justify-between mb-4">
        <button onClick={prevMonth} className="w-8 h-8 rounded-xl border border-slate-200 hover:border-gather-300 flex items-center justify-center text-slate-400 hover:text-gather-600 transition-colors text-lg font-light">‹</button>
        <span className="font-bold text-ink">{MONTHS[month]} {year}</span>
        <button onClick={nextMonth} className="w-8 h-8 rounded-xl border border-slate-200 hover:border-gather-300 flex items-center justify-center text-slate-400 hover:text-gather-600 transition-colors text-lg font-light">›</button>
      </div>

      {/* Day-of-week headers (Mon first) */}
      <div className="grid grid-cols-7 mb-1">
        {['M','T','W','T','F','S','S'].map((d,i) => (
          <div key={i} className="text-center text-[10px] font-bold text-slate-300 uppercase py-1">{d}</div>
        ))}
      </div>

      {/* Date cells */}
      <div className="grid grid-cols-7 gap-1 select-none">
        {cells.map((day, i) => {
          if (!day) return <div key={`e-${i}`} />
          const key  = ymdKey(year, month, day)
          const sel  = selectedDates.includes(key)
          const past = isPastDate(new Date(year, month, day))
          const isTod = new Date(year,month,day).toDateString() === today.toDateString()
          return (
            <div
              key={day}
              onMouseDown={() => {
                if (past) return
                const mode = sel ? 'remove' : 'add'
                setSelectMode(mode); setSelecting(true); toggleDate(day, mode)
              }}
              onMouseEnter={() => { if (selecting && !past) toggleDate(day, selectMode) }}
              onClick={() => { if (!past) onJumpToWeek(new Date(year, month, day)) }}
              className={`
                aspect-square rounded-xl flex items-center justify-center text-sm font-semibold cursor-pointer transition-all
                ${past  ? 'text-slate-200 cursor-default' : ''}
                ${!past && !sel ? 'text-slate-600 hover:bg-gather-50 hover:text-gather-700' : ''}
                ${sel   ? 'bg-gather-500 text-white shadow-md shadow-gather-200 scale-95' : ''}
                ${isTod && !sel ? 'ring-2 ring-gather-300' : ''}
              `}
            >
              {day}
            </div>
          )
        })}
      </div>

      {/* Selected date chips */}
      {selectedDates.length > 0 && (
        <div className="mt-4 pt-4 border-t border-slate-100">
          <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest mb-2">
            {selectedDates.length} date{selectedDates.length!==1?'s':''} selected — click any date to jump to that week
          </p>
          <div className="flex flex-wrap gap-1.5">
            {selectedDates.slice(0,10).map(d => (
              <button
                key={d}
                onClick={() => onJumpToWeek(parseKey(d))}
                className="px-2 py-0.5 bg-gather-100 text-gather-700 rounded-full text-[11px] font-semibold hover:bg-gather-200 transition-colors"
              >
                {parseKey(d).toLocaleDateString('en-US',{month:'short',day:'numeric'})}
              </button>
            ))}
            {selectedDates.length > 10 && (
              <span className="px-2 py-0.5 bg-slate-100 text-slate-400 rounded-full text-[11px] font-semibold">
                +{selectedDates.length-10} more
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Week time grid ──────────────────────────────────────────────────────────
const SLOT_H = 15 // px per 15-min slot

function WeekGrid({ weekDays, timeSlots, onDatesChange, onTimeSlotsChange }) {
  // Use refs so window mouseup always sees fresh values (no stale closure)
  const dragRef     = useRef({ active:false, start:null, cur:null, mode:'add' })
  const weekDaysRef = useRef(weekDays)
  const tsRef       = useRef(timeSlots)
  const cbRef       = useRef({ onDatesChange, onTimeSlotsChange })

  useEffect(() => { weekDaysRef.current = weekDays },   [weekDays])
  useEffect(() => { tsRef.current = timeSlots },        [timeSlots])
  useEffect(() => { cbRef.current = { onDatesChange, onTimeSlotsChange } }, [onDatesChange, onTimeSlotsChange])

  // Render-state for drag highlight
  const [dragBox, setDragBox] = useState(null) // {minDi,maxDi,minSi,maxSi,mode}
  const [hoverCell, setHoverCell] = useState(null)

  const getBox = (a, b) => ({
    minDi: Math.min(a.di,b.di), maxDi: Math.max(a.di,b.di),
    minSi: Math.min(a.si,b.si), maxSi: Math.max(a.si,b.si),
  })

  const refreshBox = () => {
    const d = dragRef.current
    if (d.active && d.start && d.cur)
      setDragBox({ ...getBox(d.start,d.cur), mode: d.mode })
    else
      setDragBox(null)
  }

  const inBox = (di, si) => dragBox &&
    di >= dragBox.minDi && di <= dragBox.maxDi &&
    si >= dragBox.minSi && si <= dragBox.maxSi

  // Mouse down on a cell — start drag
  const handleDown = (di, si) => {
    const ts   = tsRef.current
    const key  = dateKey(weekDaysRef.current[di])
    const slot = ALL_SLOTS[si]
    const mode = ts[key]?.includes(slot) ? 'remove' : 'add'
    dragRef.current = { active:true, start:{di,si}, cur:{di,si}, mode }
    refreshBox()
  }

  // Mouse enter on a cell — extend drag
  const handleEnter = (di, si) => {
    setHoverCell({di,si})
    if (!dragRef.current.active) return
    dragRef.current.cur = {di,si}
    refreshBox()
  }

  // Mouse up anywhere — commit selection
  const handleUp = useCallback(() => {
    const drag = dragRef.current
    if (!drag.active) return
    drag.active = false

    const { start, cur, mode } = drag
    if (!start || !cur) { setDragBox(null); return }

    const box    = getBox(start, cur)
    const days   = weekDaysRef.current
    const ts     = tsRef.current
    const { onDatesChange: onD, onTimeSlotsChange: onT } = cbRef.current

    const newTs    = { ...ts }
    const newDates = new Set(Object.keys(ts).filter(k => (ts[k]||[]).length > 0))

    for (let di = box.minDi; di <= box.maxDi; di++) {
      const d = days[di]
      if (isPastDate(d)) continue
      const key      = dateKey(d)
      const existing = new Set(newTs[key] || [])

      for (let si = box.minSi; si <= box.maxSi; si++) {
        mode === 'add' ? existing.add(ALL_SLOTS[si]) : existing.delete(ALL_SLOTS[si])
      }

      newTs[key] = [...existing].sort()
      newTs[key].length > 0 ? newDates.add(key) : newDates.delete(key)
    }

    onT(newTs)
    onD([...newDates].sort())
    setDragBox(null)
  }, [])

  useEffect(() => {
    window.addEventListener('mouseup', handleUp)
    return () => window.removeEventListener('mouseup', handleUp)
  }, [handleUp])

  // Auto-scroll to 8 AM on first render
  const scrollRef = useRef(null)
  useEffect(() => {
    if (scrollRef.current) {
      // 8 AM = 2 hours × 4 slots × SLOT_H px from top
      scrollRef.current.scrollTop = 2 * 4 * SLOT_H
    }
  }, [])

  return (
    <div ref={scrollRef} className="flex-1 overflow-auto select-none" onMouseLeave={() => setHoverCell(null)}>

      {/* ── Sticky day-header row ── */}
      <div className="flex sticky top-0 z-10 bg-white border-b border-slate-100 shadow-sm">
        <div className="w-14 shrink-0" /> {/* gutter spacer */}
        {weekDays.map((d, di) => {
          const isTod = d.toDateString() === new Date().toDateString()
          const past  = isPastDate(d)
          const slots = timeSlots[dateKey(d)]?.length || 0
          return (
            <div key={di} className={`flex-1 py-2 text-center border-l border-slate-100 min-w-0 ${past ? 'opacity-35' : ''}`}>
              <div className={`text-[10px] font-bold uppercase tracking-widest ${isTod ? 'text-gather-500' : 'text-slate-400'}`}>
                {DAYS_SHORT[d.getDay()]}
              </div>
              <div className={`
                text-base font-bold leading-none mt-1 mx-auto w-7 h-7 flex items-center justify-center rounded-full
                ${isTod ? 'bg-gather-500 text-white' : past ? 'text-slate-300' : 'text-ink'}
              `}>
                {d.getDate()}
              </div>
              {slots > 0 && <div className="w-1 h-1 rounded-full bg-gather-400 mx-auto mt-1" />}
            </div>
          )
        })}
      </div>

      {/* ── Grid body ── */}
      <div className="flex">

        {/* Hour labels gutter */}
        <div className="w-14 shrink-0 relative pointer-events-none">
          {HOURS.map(h => (
            <div key={h} style={{ height: `${4 * SLOT_H}px` }} className="relative">
              <span className="absolute -top-[7px] right-2 text-[10px] text-slate-300 font-medium whitespace-nowrap">
                {fmtHour(h)}
              </span>
            </div>
          ))}
          {/* bottom label for 11 PM boundary */}
          <div className="relative" style={{ height: '1px' }}>
            <span className="absolute -top-[7px] right-2 text-[10px] text-slate-300 font-medium whitespace-nowrap">
              {fmtHour(23)}
            </span>
          </div>
        </div>

        {/* Day columns */}
        {weekDays.map((d, di) => {
          const key  = dateKey(d)
          const past = isPastDate(d)
          return (
            <div key={di} className="flex-1 border-l border-slate-100 min-w-0">
              {ALL_SLOTS.map((slot, si) => {
                const min    = parseInt(slot.split(':')[1])
                const isHr   = min === 0
                const isHlf  = min === 30
                const sel    = timeSlots[key]?.includes(slot)
                const inDrag = inBox(di, si)
                const isAdd  = dragBox?.mode === 'add'
                const isHov  = !dragRef.current.active && hoverCell?.di===di && hoverCell?.si===si

                // visual state priority: drag-remove > drag-add > selected > hover > idle
                let bg = ''
                if (sel && inDrag && !isAdd)  bg = 'bg-slate-100'           // drag-remove preview
                else if (!sel && inDrag && isAdd) bg = 'bg-gather-200'      // drag-add preview
                else if (sel)                 bg = 'bg-gather-400'           // selected
                else if (isHov && !past)      bg = 'bg-gather-50'           // hover
                else if (past)                bg = 'bg-slate-50/40'

                return (
                  <div
                    key={slot}
                    style={{ height: `${SLOT_H}px` }}
                    onMouseDown={() => !past && handleDown(di, si)}
                    onMouseEnter={() => handleEnter(di, si)}
                    title={slot}
                    className={`
                      relative transition-colors duration-75
                      ${past ? 'cursor-default' : 'cursor-crosshair'}
                      ${isHr  ? 'border-t border-slate-100' : ''}
                      ${isHlf ? 'border-t border-dashed border-slate-50' : ''}
                      ${bg}
                    `}
                  />
                )
              })}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Main CalendarStep ───────────────────────────────────────────────────────
export default function CalendarStep({ selectedDates, timeSlots, onDatesChange, onTimeSlotsChange, onNext, onBack }) {
  const [view, setView]           = useState('week')
  const [weekStart, setWeekStart] = useState(() => weekStartOf(new Date()))

  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart); d.setDate(weekStart.getDate() + i); return d
  })

  const shiftWeek = (n) => setWeekStart(ws => {
    const d = new Date(ws); d.setDate(d.getDate() + n * 7); return d
  })

  const weekLabel = (() => {
    const s = weekDays[0], e = weekDays[6]
    return s.getMonth() === e.getMonth()
      ? `${MONTHS[s.getMonth()]} ${s.getDate()}–${e.getDate()}, ${s.getFullYear()}`
      : `${MONTHS_SH[s.getMonth()]} ${s.getDate()} – ${MONTHS_SH[e.getMonth()]} ${e.getDate()}, ${s.getFullYear()}`
  })()

  const totalSlots = Object.values(timeSlots).reduce((n, s) => n + (s?.length||0), 0)
  const totalMins  = totalSlots * 15
  const durLabel   = totalMins >= 60
    ? `${Math.floor(totalMins/60)}h${totalMins%60 ? ` ${totalMins%60}m` : ''}`
    : totalMins > 0 ? `${totalMins}m` : null

  return (
    <div className="w-full max-w-5xl step-enter flex flex-col" style={{ height: 'calc(100vh - 180px)', minHeight: '540px' }}>

      {/* ── Page header ── */}
      <div className="mb-3 flex items-end justify-between shrink-0">
        <div>
          <p className="text-gather-600 text-sm font-semibold uppercase tracking-widest mb-1">4 → Dates &amp; Times</p>
          <h2 className="text-3xl font-bold text-ink leading-tight">When might you meet?</h2>
          <p className="text-sm text-slate-400 mt-1">
            {durLabel
              ? `${selectedDates.length} day${selectedDates.length!==1?'s':''} · ${totalSlots} slots · ${durLabel} of availability`
              : 'Drag across the grid to paint your availability'}
          </p>
        </div>

        <button
          onClick={() => setView(v => v === 'week' ? 'month' : 'week')}
          className="px-4 py-2 text-sm font-semibold rounded-xl border border-slate-200 bg-white text-slate-500 hover:border-gather-300 hover:text-gather-600 transition-all shadow-sm shrink-0"
        >
          {view === 'week' ? '📅 Month view' : '📆 Week view'}
        </button>
      </div>

      {/* ── Week view ── */}
      {view === 'week' && (
        <div className="flex-1 flex flex-col min-h-0 bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">

          {/* Week nav bar */}
          <div className="flex items-center justify-between px-4 py-2 border-b border-slate-100 shrink-0">
            <button onClick={() => shiftWeek(-1)} className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors text-xl font-light">‹</button>
            <div className="text-center">
              <div className="font-bold text-ink text-sm">{weekLabel}</div>
              <div className="text-[10px] text-slate-300 mt-0.5">Drag to select · drag selected cells to remove</div>
            </div>
            <button onClick={() => shiftWeek(1)} className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors text-xl font-light">›</button>
          </div>

          <WeekGrid
            weekDays={weekDays}
            timeSlots={timeSlots}
            onDatesChange={onDatesChange}
            onTimeSlotsChange={onTimeSlotsChange}
          />
        </div>
      )}

      {/* ── Month view ── */}
      {view === 'month' && (
        <div className="flex-1 min-h-0 overflow-auto">
          <MonthCalendar
            selectedDates={selectedDates}
            onDatesChange={onDatesChange}
            onJumpToWeek={date => { setWeekStart(weekStartOf(date)); setView('week') }}
          />
        </div>
      )}

      {/* ── Footer ── */}
      <div className="flex items-center justify-between mt-4 shrink-0">
        <button onClick={onBack} className="text-slate-400 hover:text-slate-600 transition-colors text-sm font-medium">← Back</button>
        <button
          onClick={onNext}
          disabled={selectedDates.length === 0}
          className="px-6 py-3 bg-gather-600 text-white font-semibold rounded-xl disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gather-700 transition-all hover:scale-[1.02] active:scale-[0.98] shadow-md shadow-gather-100"
        >
          Continue →
        </button>
      </div>
    </div>
  )
}
