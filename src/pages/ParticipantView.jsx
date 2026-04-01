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

function TimePanel({ date, slots, hostSlots, onChange, onClose }) {
  const AVAILABLE = hostSlots.length > 0 ? hostSlots : ALL_SLOTS

  const [dragging, setDragging]   = useState(false)
  const [dragMode, setDragMode]   = useState('add')
  const [dragStart, setDragStart] = useState(null)
  const [pending, setPending]     = useState(new Set(slots))

  const dateObj = parseKey(date)
  const label   = dateObj.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })

  const getRange = (a, b) => {
    const [lo, hi] = [Math.min(a, b), Math.max(a, b)]
    return AVAILABLE.slice(lo, hi + 1)
  }

  const handleMouseDown = (idx) => {
    const slot = AVAILABLE[idx]
    const mode = pending.has(slot) ? 'remove' : 'add'
    setDragMode(mode)
    setDragStart(idx)
    setDragging(true)
    setPending(prev => {
      const next = new Set(prev)
      mode === 'add' ? next.add(slot) : next.delete(slot)
      return next
    })
  }

  const handleMouseEnter = (idx) => {
    if (!dragging || dragStart === null) return
    const range = getRange(dragStart, idx)
    setPending(prev => {
      const next = new Set(prev)
      range.forEach(s => dragMode === 'add' ? next.add(s) : next.delete(s))
      return next
    })
  }

  useEffect(() => {
    const up = () => setDragging(false)
    window.addEventListener('mouseup', up)
    return () => window.removeEventListener('mouseup', up)
  }, [])

  const confirm = () => {
    onChange(date, [...pending].sort())
    onClose()
  }

  const amSlots = AVAILABLE.filter(s => parseInt(s) < 12)
  const pmSlots = AVAILABLE.filter(s => parseInt(s) >= 12)

  const SlotRow = ({ slot }) => {
    const idx      = AVAILABLE.indexOf(slot)
    const selected = pending.has(slot)
    const isHour   = slot.endsWith(':00')
    return (
      <div
        onMouseDown={() => handleMouseDown(idx)}
        onMouseEnter={() => handleMouseEnter(idx)}
        className={`flex items-center gap-3 px-4 py-1.5 cursor-pointer no-select rounded-lg transition-colors ${
          selected ? 'bg-gather-500 text-white' : 'hover:bg-gather-50 text-slate-600'
        }`}
      >
        <span className={`text-xs w-14 shrink-0 ${isHour ? (selected ? 'text-white/80 font-medium' : 'text-slate-400 font-medium') : 'opacity-0'}`}>
          {formatSlot(slot)}
        </span>
        <div className={`flex-1 h-5 rounded transition-colors ${selected ? 'bg-white/20' : 'bg-slate-100'}`} />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-bold text-ink text-lg">{label}</h3>
          <p className="text-sm text-slate-400">{pending.size} slots selected</p>
        </div>
        <button onClick={onClose} className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors">✕</button>
      </div>
      <div className="flex flex-wrap gap-2 mb-4">
        {[
          { label: 'Morning', slots: AVAILABLE.filter(s => { const h = parseInt(s); return h >= 8 && h < 12 }) },
          { label: 'Afternoon', slots: AVAILABLE.filter(s => { const h = parseInt(s); return h >= 12 && h < 17 }) },
          { label: 'All day', slots: AVAILABLE.filter(s => { const h = parseInt(s); return h >= 9 && h < 17 }) },
        ].filter(p => p.slots.length > 0).map(p => (
          <button key={p.label} onClick={() => setPending(new Set(p.slots))}
            className="px-3 py-1.5 bg-slate-100 hover:bg-gather-100 hover:text-gather-700 text-slate-500 text-xs font-medium rounded-full transition-colors">
            {p.label}
          </button>
        ))}
        <button onClick={() => setPending(new Set())}
          className="px-3 py-1.5 bg-slate-100 hover:bg-red-50 hover:text-red-400 text-slate-500 text-xs font-medium rounded-full transition-colors">
          Clear
        </button>
      </div>
      <div className="flex-1 overflow-y-auto pr-1">
        {amSlots.length > 0 && (
          <>
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-4 py-1 mb-1">Morning</div>
            {amSlots.map(slot => <SlotRow key={slot} slot={slot} />)}
          </>
        )}
        {pmSlots.length > 0 && (
          <>
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-4 py-2 mt-1 mb-1">Afternoon & Evening</div>
            {pmSlots.map(slot => <SlotRow key={slot} slot={slot} />)}
          </>
        )}
      </div>
      <button onClick={confirm}
        className="mt-4 w-full py-3 bg-gather-600 text-white font-semibold rounded-xl hover:bg-gather-700 transition-all shadow-md shadow-gather-100">
        Confirm {pending.size} slots →
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

  useEffect(() => { loadEventFromStorage(id) }, [id])

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
    return (
      <div className="min-h-screen bg-mist flex items-center justify-center px-6">
        <div className="text-center max-w-md animate-slide-up">
          <div className="text-6xl mb-6">🎉</div>
          <h1 className="text-3xl font-bold text-ink mb-3">You're in!</h1>
          <p className="text-slate-500 mb-8">
            Your availability has been submitted. The host will find the best time for everyone.
          </p>
          <button onClick={() => navigate('/')} className="px-6 py-3 bg-gather-600 text-white font-semibold rounded-xl hover:bg-gather-700 transition-all">
            Create your own event →
          </button>
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
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-2xl font-bold text-ink">Hi {name}! When are you free?</h2>
                  <p className="text-slate-400 text-sm mt-1">Click any proposed date to mark your availability.</p>
                  {event.timezone && (
                    <p className="text-xs text-slate-400 mt-1">
                      Times shown in <span className="font-medium">{event.timezone}</span>
                    </p>
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
                        {hostSlots.length} slots available
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
                  {totalSlots > 0 ? `${totalSlots} time slots selected across ${Object.keys(availability).filter(d => availability[d].length > 0).length} dates` : 'Select your available times above'}
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
              <div className="w-72 shrink-0 bg-white rounded-2xl border border-slate-100 shadow-xl p-5 h-[540px] flex flex-col animate-panel-in">
                <TimePanel
                  date={activeDate}
                  slots={availability[activeDate] || []}
                  hostSlots={event.timeSlots?.[activeDate] || []}
                  onChange={handleTimeChange}
                  onClose={() => setActiveDate(null)}
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
