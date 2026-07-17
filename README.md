# Call Room

An AI-powered pre-meeting command center for B2B sales teams.

## Features
- **Today's Room** — syncs Google Calendar and shows all external calls for the day with live/upcoming status
- **Call Brief** — per-call AI research card: company intel, HubSpot CRM data, inbound message, signal rating, opening questions, live notes
- **Pipeline** — 7-day view of all upcoming calls with signal filtering
- **Sales Room** — shareable client-facing room with pricing, use cases, Q&A, security info, and content library
- **AI Agent** — conversational assistant for managing calls and checking pipeline

## Setup
1. Create entities: `CallCard`, `AppSettings`, `SalesRoom`
2. Add secret: `HUBSPOT_API_KEY`
3. Connect OAuth: Google Calendar (read), Gmail (read)
4. Deploy backend functions: `syncCalendar`, `researchCall`, `refreshLiveStatus`, `generateSalesRoomExhibits`
5. Create agent: `CallRoomAgent`
6. Add routes in App.jsx as documented below
