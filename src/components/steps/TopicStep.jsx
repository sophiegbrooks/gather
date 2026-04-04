import { useState, useRef, useEffect } from 'react'

const SUGGESTIONS = [
  { label: 'Touch base', emoji: '👋' },
  { label: 'Team meeting', emoji: '👥' },
  { label: 'Presentation', emoji: '📊' },
  { label: 'Project overview', emoji: '🗂' },
  { label: 'Brainstorm', emoji: '💡' },
  { label: 'One-on-one', emoji: '🤝' },
  { label: 'Retrospective', emoji: '🔄' },
  { label: 'Interview', emoji: '💼' },
  { label: 'Workshop', emoji: '🛠' },
  { label: 'Social / Casual', emoji: '🎉' },
]

export default function TopicStep({ value, onChange, onNext, onBack }) {
  const [open, setOpen] = useState(false)
  const [filter, setFilter] = useState(value || '')
  const ref = useRef(null)

  useEffect(() => {
    const handler = (e) => { if (!ref.current?.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const filtered = SUGGESTIONS.filter(s =>
    s.label.toLowerCase().includes(filter.toLowerCase())
  )

  const select = (label) => {
    onChange(label)
    setFilter(label)
    setOpen(false)
  }

  return (
    <div className="w-full max-w-2xl step-enter">
      <p className="text-gather-600 text-sm font-semibold uppercase tracking-widest mb-4">
        2 → Meeting Topic
      </p>
      <div className="flex items-start gap-3 mb-10">
        <h2 className="text-4xl md:text-5xl font-bold text-ink leading-tight">
          What's this meeting about?
        </h2>
        <span className="mt-3 px-2 py-1 bg-slate-100 text-slate-600 text-xs rounded-full font-medium shrink-0">
          optional
        </span>
      </div>

      {/* Custom dropdown */}
      <div ref={ref} className="relative">
        <input
          type="text"
          value={filter}
          onChange={e => { setFilter(e.target.value); onChange(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          placeholder="Select or type a topic…"
          className="w-full text-xl bg-white border-2 border-slate-200 focus:border-gather-500 outline-none px-5 py-4 rounded-2xl text-ink placeholder:text-slate-300 transition-colors duration-200"
        />
        <span className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
          {open ? '▲' : '▼'}
        </span>

        {open && (
          <div className="absolute z-20 top-full mt-2 w-full bg-white border border-slate-100 rounded-2xl shadow-xl overflow-hidden">
            {filtered.length === 0 && (
              <div className="px-5 py-4 text-slate-400 text-sm">No matches — we'll use what you typed</div>
            )}
            {filtered.map(s => (
              <button
                key={s.label}
                onClick={() => select(s.label)}
                className="w-full flex items-center gap-3 px-5 py-3.5 text-left hover:bg-gather-50 transition-colors text-ink font-medium"
              >
                <span className="text-xl">{s.emoji}</span>
                {s.label}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between mt-10">
        <button onClick={onBack} className="text-slate-400 hover:text-slate-600 transition-colors text-sm font-medium">
          ← Back
        </button>
        <button
          onClick={onNext}
          className="px-6 py-3 bg-gather-600 text-white font-semibold rounded-xl hover:bg-gather-700 transition-all hover:scale-[1.02] active:scale-[0.98] shadow-md shadow-gather-100"
        >
          {value ? 'Continue →' : 'Skip →'}
        </button>
      </div>
    </div>
  )
}
