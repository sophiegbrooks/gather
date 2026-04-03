import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useEvent } from '../context/EventContext'
import { supabase } from '../lib/supabase'
import NameStep    from '../components/steps/NameStep'
import TypeStep    from '../components/steps/TypeStep'
import CalendarStep from '../components/steps/CalendarStep'
import AuthStep    from '../components/steps/AuthStep'
import InviteStep  from '../components/steps/InviteStep'

const STEPS = ['name', 'type', 'calendar', 'auth', 'invite']
const STEP_LABELS = ['Event', 'Format', 'Dates & Times', 'You', 'Invite']
const AUTH_STEP = 3

export default function Create() {
  const [currentStep, setCurrentStep] = useState(0)
  const [animating, setAnimating] = useState(false)
  const [loggedInUser, setLoggedInUser] = useState(null)
  const [savedEventId, setSavedEventId] = useState(null)
  const { event, updateEvent, saveEventToStorage } = useEvent()
  const navigate = useNavigate()

  // Check if user is already logged in and pre-populate user data
  useEffect(() => {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
    updateEvent({ timezone: tz })

    supabase.auth.getUser().then(({ data }) => {
      if (data?.user) {
        const u = data.user
        const name = u.user_metadata?.full_name || u.email?.split('@')[0] || ''
        setLoggedInUser(u)
        updateEvent({ user: { name, email: u.email, isGuest: false, id: u.id } })
      }
    })
  }, [])

  const goNext = () => {
    if (animating) return
    setAnimating(true)
    setTimeout(async () => {
      const next = currentStep + 1
      const targetStep = (next === AUTH_STEP && loggedInUser) ? next + 1 : next
      // Save event to DB when reaching invite step so the link is real
      if (targetStep === 4 && !savedEventId) {
        const id = await saveEventToStorage(event)
        setSavedEventId(id)
      }
      setCurrentStep(targetStep)
      setAnimating(false)
    }, 200)
  }

  const goBack = () => {
    if (animating || currentStep === 0) return
    setAnimating(true)
    setTimeout(() => {
      setCurrentStep(s => {
        const prev = s - 1
        // Skip auth step going backwards if already logged in
        if (prev === AUTH_STEP && loggedInUser) return prev - 1
        return prev
      })
      setAnimating(false)
    }, 200)
  }

  const handleFinish = async () => {
    // Event was already saved when entering InviteStep; just navigate
    const id = savedEventId || await saveEventToStorage(event)
    navigate(`/event/${id}/dashboard`)
  }

  const progress = ((currentStep) / (STEPS.length - 1)) * 100

  return (
    <div className="min-h-screen bg-mist flex flex-col">
      {/* Top bar */}
      <header className="px-6 py-4 flex items-center justify-between max-w-4xl mx-auto w-full">
        <button onClick={() => navigate('/')} className="text-xl font-bold text-gather-700 tracking-tight">
          gather<span className="inline-block w-1.5 h-1.5 rounded-full bg-gather-500 ml-1 mb-1" />
        </button>

        {/* Step dots */}
        <div className="flex items-center gap-2">
          {STEPS.map((_, i) => (
            <div key={i} className={`transition-all duration-300 rounded-full ${
              i === currentStep
                ? 'w-6 h-2 bg-gather-600'
                : i < currentStep
                ? 'w-2 h-2 bg-gather-300'
                : 'w-2 h-2 bg-slate-200'
            }`} />
          ))}
        </div>

        {loggedInUser ? (
          <button
            onClick={() => navigate('/profile')}
            className="flex items-center gap-2 group"
          >
            <div className="w-8 h-8 rounded-full bg-gather-500 flex items-center justify-center text-white text-sm font-bold group-hover:bg-gather-600 transition-colors">
              {(loggedInUser.user_metadata?.full_name || loggedInUser.email || '?')[0].toUpperCase()}
            </div>
          </button>
        ) : (
          <span className="text-sm text-slate-400 w-24 text-right">
            {currentStep + 1} of {STEPS.length}
          </span>
        )}
      </header>

      {/* Progress bar */}
      <div className="h-0.5 bg-slate-100 w-full">
        <div
          className="h-full bg-gather-500 transition-all duration-500 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Step content */}
      <main className={`flex-1 flex flex-col items-center justify-center px-4 py-8 transition-opacity duration-200 ${animating ? 'opacity-0' : 'opacity-100'}`}>
        {currentStep === 0 && (
          <NameStep
            value={event.name}
            onChange={v => updateEvent({ name: v })}
            onNext={goNext}
          />
        )}
        {currentStep === 1 && (
          <TypeStep
            value={event.type}
            onChange={v => updateEvent({ type: v })}
            onNext={goNext}
            onBack={goBack}
          />
        )}
        {currentStep === 2 && (
          <CalendarStep
            selectedDates={event.selectedDates}
            timeSlots={event.timeSlots}
            onDatesChange={d => updateEvent({ selectedDates: d })}
            onTimeSlotsChange={t => updateEvent({ timeSlots: t })}
            onNext={goNext}
            onBack={goBack}
          />
        )}
        {currentStep === 3 && (
          <AuthStep
            user={event.user}
            onChange={u => updateEvent({ user: u })}
            onNext={goNext}
            onBack={goBack}
          />
        )}
        {currentStep === 4 && (
          <InviteStep
            event={event}
            eventId={savedEventId}
            onFinish={handleFinish}
            onBack={goBack}
          />
        )}
      </main>
    </div>
  )
}
