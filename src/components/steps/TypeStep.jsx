export default function TypeStep({ value, onChange, onNext, onBack }) {
  const options = [
    {
      id: 'group',
      label: 'Group',
      subtitle: 'Three or more people',
      emoji: '👥',
      description: 'Everyone selects their availability and you find the best overlap.',
    },
    {
      id: 'one-on-one',
      label: 'One-on-one',
      subtitle: 'Just the two of you',
      emoji: '🤝',
      description: 'Share with one person and find a time that works for both of you.',
    },
  ]

  return (
    <div className="w-full max-w-2xl step-enter">
      <p className="text-gather-600 text-sm font-semibold uppercase tracking-widest mb-4">
        2 → Meeting Format
      </p>
      <h2 className="text-4xl md:text-5xl font-bold text-ink mb-10 leading-tight">
        Who's joining?
      </h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {options.map(opt => (
          <button
            key={opt.id}
            onClick={() => { onChange(opt.id); setTimeout(onNext, 200) }}
            className={`relative p-6 rounded-2xl border-2 text-left transition-all hover:scale-[1.01] active:scale-[0.99] ${
              value === opt.id
                ? 'border-gather-500 bg-gather-50 shadow-lg shadow-gather-100'
                : 'border-slate-200 bg-white hover:border-gather-300 hover:bg-gather-50/50'
            }`}
          >
            {value === opt.id && (
              <span className="absolute top-4 right-4 w-6 h-6 rounded-full bg-gather-500 flex items-center justify-center text-white text-xs">✓</span>
            )}
            <span className="text-4xl mb-4 block">{opt.emoji}</span>
            <h3 className="text-xl font-bold text-ink mb-1">{opt.label}</h3>
            <p className="text-sm text-slate-400 mb-3">{opt.subtitle}</p>
            <p className="text-sm text-slate-500 leading-relaxed">{opt.description}</p>
          </button>
        ))}
      </div>

      <div className="flex items-center justify-between mt-10">
        <button onClick={onBack} className="text-slate-400 hover:text-slate-600 transition-colors text-sm font-medium">
          ← Back
        </button>
        <button
          onClick={onNext}
          disabled={!value}
          className="px-6 py-3 bg-gather-600 text-white font-semibold rounded-xl disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gather-700 transition-all hover:scale-[1.02] active:scale-[0.98] shadow-md shadow-gather-100"
        >
          Continue →
        </button>
      </div>
    </div>
  )
}
