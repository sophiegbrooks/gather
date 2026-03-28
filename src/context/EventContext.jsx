import { createContext, useContext, useState } from 'react'

const EventContext = createContext(null)

export function EventProvider({ children }) {
  const [event, setEvent] = useState({
    id: null,
    name: '',
    topic: '',
    type: 'group',       // 'group' | 'one-on-one'
    selectedDates: [],   // array of 'YYYY-MM-DD' strings
    timeSlots: {},       // { 'YYYY-MM-DD': ['09:00','09:30',...] }
    user: null,          // { name, email, isGuest }
    participants: [],    // [{ id, name, email, availability: { date: [slots] } }]
    inviteEmails: [],
    createdAt: null,
  })

  const updateEvent = (partial) => setEvent(prev => ({ ...prev, ...partial }))

  const saveEventToStorage = (evt) => {
    const id = evt.id || `gather_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
    const final = { ...evt, id, createdAt: evt.createdAt || new Date().toISOString() }
    localStorage.setItem(`gather_event_${id}`, JSON.stringify(final))
    setEvent(final)
    return id
  }

  const loadEventFromStorage = (id) => {
    const raw = localStorage.getItem(`gather_event_${id}`)
    if (!raw) return null
    const data = JSON.parse(raw)
    setEvent(data)
    return data
  }

  const addParticipant = (id, participant) => {
    const raw = localStorage.getItem(`gather_event_${id}`)
    if (!raw) return
    const data = JSON.parse(raw)
    const exists = data.participants.findIndex(p => p.id === participant.id)
    if (exists >= 0) {
      data.participants[exists] = participant
    } else {
      data.participants.push(participant)
    }
    localStorage.setItem(`gather_event_${id}`, JSON.stringify(data))
    setEvent(data)
  }

  return (
    <EventContext.Provider value={{ event, updateEvent, saveEventToStorage, loadEventFromStorage, addParticipant }}>
      {children}
    </EventContext.Provider>
  )
}

export const useEvent = () => useContext(EventContext)
