import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useEvent } from '../context/EventContext'
import NameStep    from '../components/steps/NameStep'
import TopicStep   from '../components/steps/TopicStep'
import TypeStep    from '../components/steps/TypeStep'
import CalendarStep from '../components/steps/CalendarStep'
import AuthStep    from '../components/steps/AuthStep'
import InviteStep  from '../components/steps/InviteStep'

const STEPS = ['name', 'topic', 'type', 'calendar', 'auth', 'invite']
const STEP_LABELS = ['Event', 'Topic', 'Format', 'Dates & Times', 'You', 'Invite']

export default function Create() {
  const [currentStep, setCurrentStep] = useState(0)
  const [animating, setAnimating] = useState(false)
  const { event, updateEvent, saveEventToStorage } = useEvent()
  const navigate = useNavigate()

  const goNext = () => {
    if (animating) return
    setAnimating(true)
    setTimeout(() => {
      setCurrentStep(s => s + 1)
      setAnimating(false)
    }, 200)
  }

  const goBack = () => {
    if (animating || currentStep === 0) return
    setAnimating(true)
    setTimeout(() => {
      setCurrentStep(s => s - 1)
      setAnimating(false)
    }, 200)
  }

  const handleFinish = () => {
    const id = saveEventToStorage(event)
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

        <span className="text-sm text-slate-400 w-24 text-right">
          {currentStep + 1} of {STEPS.length}
        </span>
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
          <TopicStep
            value={event.topic}
            onChange={v => updateEvent({ topic: v })}
            onNext={goNext}
            onBack={goBack}
          />
        )}
        {currentStep === 2 && (
          <TypeStep
            value={event.type}
            onChange={v => updateEvent({ type: v })}
            onNext={goNext}
            onBack={goBack}
          />
        )}
        {currentStep === 3 && (
          <CalendarStep
            selectedDates={event.selectedDates}
            timeSlots={event.timeSlots}
            onDatesChange={d => updateEvent({ selectedDates: d })}
            onTimeSlotsChange={t => updateEvent({ timeSlots: t })}
            onNext={goNext}
            onBack={goBack}
          />
        )}
        {currentStep === 4 && (
          <AuthStep
            user={event.user}
            onChange={u => updateEvent({ user: u })}
            onNext={goNext}
            onBack={goBack}
          />
        )}
        {currentStep === 5 && (
          <InviteStep
            event={event}
            onFinish={handleFinish}
            onBack={goBack}
          />
        )}
      </main>
    </div>
  )
}
