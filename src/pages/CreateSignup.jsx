import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useEvent } from '../context/EventContext'
import { supabase } from '../lib/supabase'
import NameStep            from '../components/steps/NameStep'
import SignupScheduleStep  from '../components/steps/SignupScheduleStep'
import AuthStep            from '../components/steps/AuthStep'

const STEPS    = ['name', 'schedule', 'auth']
const AUTH_STEP = 2

export default function CreateSignup() {
  const [currentStep,  setCurrentStep]  = useState(0)
  const [animating,    setAnimating]    = useState(false)
  const [loggedInUser, setLoggedInUser] = useState(null)

  // Local state for sign-up config (kept separate from event context to keep things clean)
  const [name,         setName]         = useState('')
  const [selectedDates, setSelectedDates] = useState([])
  const [startTime,    setStartTime]    = useState('09:00')
  const [endTime,      setEndTime]      = useState('17:00')
  const [slotDuration, setSlotDuration] = useState(30)
  const [timezone,     setTimezone]     = useState(Intl.DateTimeFormat().resolvedOptions().timeZone)
  const [user,         setUser]         = useState(null)

  const { updateEvent, saveEventToStorage } = useEvent()
  const navigate = useNavigate()

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user) {
        const u = data.user
        const displayName = u.user_metadata?.full_name || u.email?.split('@')[0] || ''
        setLoggedInUser(u)
        setUser({ name: displayName, email: u.email, isGuest: false, id: u.id })
      }
    })
  }, [])

  const goNext = () => {
    if (animating) return
    if (currentStep + 1 === AUTH_STEP && loggedInUser) {
      handleFinish(user)
      return
    }
    setAnimating(true)
    setTimeout(() => { setCurrentStep(s => s + 1); setAnimating(false) }, 200)
  }

  const goBack = () => {
    if (animating || currentStep === 0) return
    setAnimating(true)
    setTimeout(() => { setCurrentStep(s => s - 1); setAnimating(false) }, 200)
  }

  // Expand time window into individual slot strings
  const buildTimeSlots = () => {
    const slots = []
    let [h, m] = startTime.split(':').map(Number)
    const [endH, endM] = endTime.split(':').map(Number)
    const endTotal = endH * 60 + endM
    while (true) {
      const total = h * 60 + m
      if (total >= endTotal) break
      slots.push(`${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`)
      m += slotDuration
      while (m >= 60) { h++; m -= 60 }
      if (h >= 24) break
    }
    return slots
  }

  const handleFinish = async (resolvedUser) => {
    const finalUser = resolvedUser || user
    const expandedSlots = buildTimeSlots()
    const timeSlots = {}
    selectedDates.forEach(d => { timeSlots[d] = expandedSlots })

    const id = `gather_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`

    // Build the event and sync into context so saveEventToStorage works
    const evt = {
      id,
      name,
      topic: '',
      type: 'signup',
      selectedDates,
      timeSlots,
      slotDuration,
      user: finalUser,
      inviteEmails: [],
      createdAt: new Date().toISOString(),
      timezone,
    }
    updateEvent(evt)
    await saveEventToStorage(evt)
    navigate(`/signup/${id}/dashboard`)
  }

  const progress = (currentStep / (STEPS.length - 1)) * 100

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
          <button onClick={() => navigate('/profile')} className="flex items-center gap-2 group">
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
        <div className="h-full bg-gather-500 transition-all duration-500 ease-out" style={{ width: `${progress}%` }} />
      </div>

      {/* Step content */}
      <main className={`flex-1 flex flex-col items-center justify-center px-4 py-8 transition-opacity duration-200 ${animating ? 'opacity-0' : 'opacity-100'}`}>
        {currentStep === 0 && (
          <NameStep
            value={name}
            onChange={setName}
            onNext={goNext}
          />
        )}
        {currentStep === 1 && (
          <SignupScheduleStep
            selectedDates={selectedDates}
            startTime={startTime}
            endTime={endTime}
            slotDuration={slotDuration}
            timezone={timezone}
            onDatesChange={setSelectedDates}
            onStartTimeChange={setStartTime}
            onEndTimeChange={setEndTime}
            onSlotDurationChange={setSlotDuration}
            onTimezoneChange={setTimezone}
            onNext={goNext}
            onBack={goBack}
          />
        )}
        {currentStep === 2 && (
          <AuthStep
            user={user}
            onChange={setUser}
            onNext={goNext}
            onBack={goBack}
            onFinish={() => handleFinish(user)}
          />
        )}
      </main>
    </div>
  )
}
