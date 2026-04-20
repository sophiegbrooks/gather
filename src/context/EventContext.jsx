import { createContext, useContext, useState } from 'react'
import { supabase } from '../lib/supabase'

const EventContext = createContext(null)

export function EventProvider({ children }) {
  const [event, setEvent] = useState({
    id: null,
    name: '',
    topic: '',
    type: 'group',
    selectedDates: [],
    timeSlots: {},
    slotDuration: null,   // minutes per slot; only set for type='signup'
    user: null,
    participants: [],
    inviteEmails: [],
    createdAt: null,
  })

  const updateEvent = (partial) => setEvent(prev => ({ ...prev, ...partial }))

  // ── Save a new event to Supabase ────────────────────────────────────────
  const saveEventToStorage = async (evt) => {
    const id = evt.id || `gather_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
    const final = { ...evt, id, createdAt: evt.createdAt || new Date().toISOString() }

    // Attach logged-in user's ID if available
    const { data: { user } } = await supabase.auth.getUser()

    const { error } = await supabase.from('events').upsert({
      id:             final.id,
      name:           final.name,
      topic:          final.topic,
      type:           final.type,
      selected_dates: final.selectedDates,
      time_slots:     final.timeSlots,
      // slotDuration is stored inside user_info to avoid a schema change
      user_info:      { ...(final.user || {}), _slotDuration: final.slotDuration || null },
      invite_emails:  final.inviteEmails,
      created_at:     final.createdAt,
      user_id:        user?.id || null,
      timezone:       final.timezone || null,
    })

    if (error) {
      console.error('Supabase saveEvent error:', error.message)
    } else {
      setEvent(final)
    }
    return id
  }

  // ── Load an event from Supabase by ID ──────────────────────────────────
  const loadEventFromStorage = async (id) => {
    const { data, error } = await supabase
      .from('events')
      .select('*, participants(*)')
      .eq('id', id)
      .single()

    if (error || !data) {
      console.error('Supabase loadEvent error:', error?.message)
      return null
    }

    // Extract slotDuration from user_info (stored there to avoid schema change)
    const rawUserInfo = data.user_info || {}
    const slotDuration = rawUserInfo._slotDuration || null
    const userInfo = { ...rawUserInfo }
    delete userInfo._slotDuration

    const loaded = {
      id:            data.id,
      name:          data.name,
      topic:         data.topic,
      type:          data.type,
      selectedDates: data.selected_dates || [],
      timeSlots:     data.time_slots     || {},
      slotDuration,
      user:          userInfo,
      inviteEmails:  data.invite_emails  || [],
      createdAt:     data.created_at,
      timezone:      data.timezone       || null,
      participants:  (data.participants || []).map(p => ({
        id:           p.id,
        name:         p.name,
        email:        p.email,
        availability: p.availability || {},
      })),
    }

    setEvent(loaded)
    return loaded
  }

  // ── Update event timing (dates + time slots) ───────────────────────────
  const updateEventTiming = async (eventId, selectedDates, timeSlots) => {
    const { error } = await supabase
      .from('events')
      .update({ selected_dates: selectedDates, time_slots: timeSlots })
      .eq('id', eventId)

    if (error) {
      console.error('Supabase updateEventTiming error:', error.message)
      return false
    }

    setEvent(prev => ({ ...prev, selectedDates, timeSlots }))
    return true
  }

  // ── Add / update a participant ──────────────────────────────────────────
  const addParticipant = async (eventId, participant) => {
    const { error } = await supabase.from('participants').upsert({
      id:           participant.id,
      event_id:     eventId,
      name:         participant.name,
      email:        participant.email,
      availability: participant.availability || {},
    })

    if (error) {
      console.error('Supabase addParticipant error:', error.message)
      return
    }

    // Refresh local state
    setEvent(prev => {
      const exists = prev.participants.findIndex(p => p.id === participant.id)
      const next   = [...prev.participants]
      if (exists >= 0) next[exists] = participant
      else next.push(participant)
      return { ...prev, participants: next }
    })
  }

  // ── Add a sign-up (one slot claimed by one person) ────────────────────────
  const addSignup = async (eventId, { name, email, date, slot }) => {
    const id = `p_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`
    return addParticipant(eventId, {
      id,
      name,
      email: email || null,
      availability: { [date]: [slot] },
    })
  }

  return (
    <EventContext.Provider value={{ event, updateEvent, saveEventToStorage, loadEventFromStorage, addParticipant, addSignup, updateEventTiming }}>
      {children}
    </EventContext.Provider>
  )
}

export const useEvent = () => useContext(EventContext)
