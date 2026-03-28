import { useEffect, useRef } from 'react'

export default function NameStep({ value, onChange, onNext }) {
  const inputRef = useRef(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const handleKey = (e) => {
    if (e.key === 'Enter' && value.trim().length >= 2) onNext()
  }

  return (
    <div className="w-full max-w-2xl step-enter">
      <p className="text-gather-600 text-sm font-semibold uppercase tracking-widest mb-4">
        1 → Event Name
      </p>
      <h2 className="text-4xl md:text-5xl font-bold text-ink mb-10 leading-tight">
        What's this event called?
      </h2>

      <div className="relative group">
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={e => onChange(e.target.value)}
          onKeyDown={handleKey}
          placeholder="e.g. Q3 Planning Session"
          className="w-full text-3xl font-semibold bg-transparent border-b-2 border-slate-200 focus:border-gather-500 outline-none py-4 text-ink placeholder:text-slate-300 transition-colors duration-200"
        />
        {value.length > 0 && (
          <button
            onClick={() => onChange('')}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-400 text-xl"
          >
            ×
          </button>
        )}
      </div>

      <div className="flex items-center justify-between mt-10">
        <span className="text-sm text-slate-400">
          {value.trim().length >= 2
            ? <>Press <kbd className="bg-slate-100 px-2 py-0.5 rounded text-xs font-mono">Enter</kbd> to continue</>
            : 'Type at least 2 characters'}
        </span>
        <button
          onClick={onNext}
          disabled={value.trim().length < 2}
          className="px-6 py-3 bg-gather-600 text-white font-semibold rounded-xl disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gather-700 transition-all hover:scale-[1.02] active:scale-[0.98] shadow-md shadow-gather-100"
        >
          Continue →
        </button>
      </div>
    </div>
  )
}
