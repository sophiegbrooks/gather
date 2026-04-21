// Parse an ICS file string into calendar events { start: Date, end: Date, summary: string }[]
export function parseIcs(text) {
  const lines = text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\n[ \t]/g, '') // unfold continuation lines
    .split('\n')

  const events = []
  let inEvent = false
  let cur = {}

  for (const raw of lines) {
    const line = raw.trim()
    if (line === 'BEGIN:VEVENT') { inEvent = true; cur = {}; continue }
    if (line === 'END:VEVENT') {
      inEvent = false
      if (cur.start && cur.end && cur.end > cur.start)
        events.push({ start: cur.start, end: cur.end, summary: cur.summary || 'Busy' })
      continue
    }
    if (!inEvent) continue

    const sep = line.indexOf(':')
    if (sep === -1) continue
    const prop = line.slice(0, sep).toUpperCase()
    const val  = line.slice(sep + 1)

    if (prop === 'SUMMARY')            cur.summary = val
    else if (prop.startsWith('DTSTART')) cur.start = parseDt(prop, val)
    else if (prop.startsWith('DTEND'))   cur.end   = parseDt(prop, val)
  }

  return events
}

function parseDt(prop, val) {
  try {
    // All-day: 20260421
    if (/^\d{8}$/.test(val)) {
      return new Date(`${val.slice(0,4)}-${val.slice(4,6)}-${val.slice(6,8)}T00:00:00`)
    }

    const datePart = `${val.slice(0,4)}-${val.slice(4,6)}-${val.slice(6,8)}`
    const timePart = `${val.slice(9,11)}:${val.slice(11,13)}:${val.slice(13,15)}`

    // UTC: ends with Z
    if (val.endsWith('Z')) return new Date(`${datePart}T${timePart}Z`)

    // TZID-qualified: DTSTART;TZID=America/New_York:20260421T090000
    const tzMatch = prop.match(/TZID=([^;:]+)/)
    if (tzMatch) {
      // Intl trick: format a UTC date in that timezone, find the offset, apply it
      const tz = tzMatch[1]
      const naive = new Date(`${datePart}T${timePart}`)
      const utcMs = naive.getTime()
      // Get what UTC offset applies in that tz at that moment (approximate)
      const formatted = new Intl.DateTimeFormat('en-US', {
        timeZone: tz,
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
      }).formatToParts(naive)
      const get = type => parseInt(formatted.find(p => p.type === type)?.value || '0')
      const tzDate = new Date(Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second')))
      const offsetMs = naive.getTime() - tzDate.getTime()
      return new Date(utcMs + offsetMs)
    }

    // Floating / local time — treat as local
    return new Date(`${datePart}T${timePart}`)
  } catch {
    return null
  }
}

// Returns a Set of "HH:MM" slot strings that overlap with calendar events on the given date
// date: "YYYY-MM-DD", events: parsed events array
export function getBusySlotsForDate(events, date) {
  const [y, mo, d] = date.split('-').map(Number)
  const busy = new Set()

  for (const evt of events) {
    for (let h = 0; h < 24; h++) {
      for (let m = 0; m < 60; m += 15) {
        const slotStart = new Date(y, mo - 1, d, h, m, 0)
        const slotEnd   = new Date(y, mo - 1, d, h, m + 15, 0)
        if (evt.start < slotEnd && evt.end > slotStart) {
          busy.add(`${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`)
        }
      }
    }
  }

  return busy
}
