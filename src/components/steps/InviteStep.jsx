import { useState } from 'react'

export default function InviteStep({ event, onFinish, onBack }) {
  const [emails, setEmails] = useState('')
  const [copied, setCopied] = useState(false)

  // Generate a preview link (real ID will be assigned on finish)
  const previewId = `gather_preview_${Date.now()}`
  const link = `${window.location.origin}/event/${previewId}`

  const handleCopy = () => {
    navigator.clipboard.writeText(link)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const emailList = emails.split(/[\s,;]+/).filter(e => e.includes('@'))

  const dateCount = event.selectedDates?.length || 0

  // Count contiguous time ranges across all selected dates
  const countFrames = (slotsByDate) => {
    let total = 0
    Object.values(slotsByDate || {}).forEach(slots => {
      if (!slots?.length) return
      let frames = 1
      for (let i = 1; i < slots.length; i++) {
        const [ph, pm] = slots[i-1].split(':').map(Number)
        const [ch, cm] = slots[i].split(':').map(Number)
        if ((ch * 60 + cm) - (ph * 60 + pm) > 15) frames++
      }
      total += frames
    })
    return total
  }
  const frameCount = countFrames(event.timeSlots)

  return (
    <div className="w-full max-w-lg step-enter">
      <p className="text-gather-600 text-sm font-semibold uppercase tracking-widest mb-4">
        6 → Invite your group
      </p>
      <h2 className="text-4xl md:text-5xl font-bold text-ink mb-3 leading-tight">
        You're almost live!
      </h2>
      <p className="text-slate-400 mb-8">Share the link with your group. They'll mark when they're free.</p>

      {/* Event summary card */}
      <div className="bg-gather-50 border border-gather-100 rounded-2xl p-5 mb-6">
        <h3 className="font-bold text-ink text-lg mb-1">{event.name || 'Untitled Event'}</h3>
        {event.topic && <p className="text-gather-600 text-sm mb-3">{event.topic}</p>}
        <div className="flex flex-wrap gap-3">
          <span className="flex items-center gap-1.5 text-sm text-slate-500">
            <span className="w-5 h-5 rounded-full bg-gather-200 flex items-center justify-center text-gather-700 text-xs">📅</span>
            {dateCount} date{dateCount !== 1 ? 's' : ''}
          </span>
          <span className="flex items-center gap-1.5 text-sm text-slate-500">
            <span className="w-5 h-5 rounded-full bg-gather-200 flex items-center justify-center text-gather-700 text-xs">⏰</span>
            {frameCount} time frame{frameCount !== 1 ? 's' : ''}
          </span>
          <span className="flex items-center gap-1.5 text-sm text-slate-500">
            <span className="w-5 h-5 rounded-full bg-gather-200 flex items-center justify-center text-gather-700 text-xs">
              {event.type === 'group' ? '👥' : '🤝'}
            </span>
            {event.type === 'group' ? 'Group meeting' : 'One-on-one'}
          </span>
        </div>
      </div>

      {/* Share link */}
      <div className="mb-6">
        <label className="block text-sm font-semibold text-slate-600 mb-2">Share link</label>
        <div className="flex gap-2">
          <div className="flex-1 px-4 py-3 bg-white border-2 border-slate-200 rounded-xl text-slate-500 text-sm font-mono truncate">
            {link}
          </div>
          <button
            onClick={handleCopy}
            className={`px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
              copied
                ? 'bg-gather-500 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-gather-100 hover:text-gather-700'
            }`}
          >
            {copied ? '✓ Copied!' : 'Copy'}
          </button>
        </div>
      </div>

      {/* Email invites */}
      <div className="mb-8">
        <label className="block text-sm font-semibold text-slate-600 mb-2">
          Invite by email <span className="text-slate-300 font-normal">(optional)</span>
        </label>
        <textarea
          value={emails}
          onChange={e => setEmails(e.target.value)}
          placeholder="Separate multiple emails with commas or new lines&#10;e.g. alice@example.com, bob@example.com"
          rows={3}
          className="w-full px-4 py-3 border-2 border-slate-200 focus:border-gather-500 rounded-xl outline-none text-sm text-ink resize-none transition-colors"
        />
        {emailList.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {emailList.map((e, i) => (
              <span key={i} className="px-3 py-1 bg-gather-100 text-gather-700 text-xs font-medium rounded-full">
                {e}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between">
        <button onClick={onBack} className="text-slate-400 hover:text-slate-600 transition-colors text-sm font-medium">
          ← Back
        </button>
        <button
          onClick={onFinish}
          className="px-8 py-3 bg-gather-600 text-white font-semibold rounded-xl hover:bg-gather-700 transition-all hover:scale-[1.02] active:scale-[0.98] shadow-md shadow-gather-100"
        >
          Launch event 🚀
        </button>
      </div>
    </div>
  )
}
