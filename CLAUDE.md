# Gather

Group scheduling app. Hosts create events with proposed dates/times, participants submit availability, host sees best times on a live dashboard.

## Stack
- React + Vite
- Tailwind CSS
- Supabase (Postgres + Auth)
- Deployed on Vercel at gathersimply.app

## Key files
- `src/pages/Create.jsx` — multi-step event creation flow
- `src/pages/HostDashboard.jsx` — live dashboard for hosts
- `src/pages/ParticipantView.jsx` — availability submission for guests
- `src/context/EventContext.jsx` — Supabase data layer
- `src/components/steps/CalendarStep.jsx` — date + time selection

## Database
Supabase tables: `events`, `participants`
events columns: id, name, topic, type, selected_dates, time_slots, user_info, invite_emails, created_at, user_id, timezone

## Conventions
- Tailwind for all styling, custom colors in tailwind.config.js (gather-*, ink, mist)
- No TypeScript — plain JSX
- Date keys stored as "YYYY-MM-DD" strings
- Time slots stored as "HH:MM" strings (e.g. "09:00", "14:30")

## Host Dashboard features
- **Share invite** button (header): dropdown with copy link / email / native share
- **Share results** button (header): dropdown with copy link / email — links to `/event/:id/dashboard`
- **Edit schedule** button (header): opens modal with CalendarStep pre-populated; saves via `updateEventTiming()` in EventContext; participants see changes within 3s via polling
- **Invite friends banner**: shown only when there are 0 participants, hides automatically on first response
- **Availability heatmap**: time axis has hour labels + full-width rule at `:00`, short tick + ":30" label at `:30`, tick at `:15`/`:45`; grid lines also drawn inside heat cells

## EventContext methods
- `saveEventToStorage(evt)` — creates/upserts full event
- `loadEventFromStorage(id)` — loads event + participants from Supabase
- `addParticipant(eventId, participant)` — upserts participant row
- `updateEventTiming(eventId, selectedDates, timeSlots)` — patches only dates/slots on existing event

## Preview / verification notes
- The dev server at localhost:5173 cannot show the host dashboard without a real Supabase event ID — always ask the user for a screenshot to verify heatmap/dashboard UI changes
- Production build (`npx vite build`) is the reliable way to catch syntax errors when HMR fails

## Workflow
- After completing code changes, commit and push to GitHub (`git push origin main`) so Vercel auto-deploys to gathersimply.app
