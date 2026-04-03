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

## Workflow
- After completing code changes, commit and push to GitHub (`git push origin main`) so Vercel auto-deploys to gathersimply.app
