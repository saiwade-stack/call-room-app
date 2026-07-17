# Call Room — Setup Guide

## Stack
- **Platform**: Base44
- **Frontend**: React + Tailwind CSS
- **Backend**: Deno edge functions
- **AI**: InvokeLLM (Gemini Flash with web search)
- **Integrations**: Google Calendar, Gmail, HubSpot

---

## 1. Entities (create in Base44 → Entities)

- `CallCard` — see `entities/CallCard.jsonc`
- `AppSettings` — see `entities/AppSettings.jsonc`
- `SalesRoom` — see `entities/SalesRoom.jsonc`

---

## 2. Secrets (Base44 → App Settings → Environment Variables)

| Name | Where to get it |
|------|----------------|
| `HUBSPOT_API_KEY` | HubSpot → Settings → Integrations → Private Apps |

---

## 3. OAuth Connectors (Base44 → Connectors)

| Service | Scopes needed |
|---------|--------------|
| Google Calendar | `https://www.googleapis.com/auth/calendar.readonly` |
| Gmail | `https://www.googleapis.com/auth/gmail.readonly` |

---

## 4. Backend Functions (copy from `functions/` folder)

| Function | Purpose |
|----------|---------|
| `syncCalendar` | Pulls Google Calendar events → creates CallCards |
| `researchCall` | Runs AI research on a CallCard (HubSpot + Gmail + web) |
| `refreshLiveStatus` | Updates call statuses based on current time |
| `generateSalesRoomExhibits` | AI-generates Sales Room content from transcript |

---

## 5. Agent (Base44 → Agents)

Create an agent named `CallRoomAgent` using `agents/CallRoomAgent.jsonc`.
Grant it **read + write** access to the `CallCard` entity.

---

## 6. Frontend Pages & Routes

| Route | Component |
|-------|-----------|
| `/` | `TodaysRoom` — today's calls with sync |
| `/brief/:id` | `CallBrief` — full per-call AI brief |
| `/pipeline` | `Pipeline` — 7-day call view |
| `/settings` | `Settings` — calendar sync config |
| `/agent` | `Agent` — AI chat |
| `/sales-room/new` | `SalesRoomEditor` — create room from scratch |
| `/sales-room/:id` | `SalesRoomEditor` — edit existing room |
| `/room/:slug` | `SalesRoomView` — public client-facing page |

---

## 7. Shared Components

- `src/components/callroom/SignalBadge.jsx`
- `src/components/callroom/RsvpBadge.jsx`
- `src/components/callroom/CallCardRow.jsx`
- `src/components/callroom/CountdownTimer.jsx`
- `src/components/callroom/SkeletonCard.jsx`
- `src/components/callroom/AgentChatPanel.jsx`

---

## 8. Design Tokens (src/index.css)

- Background: `hsl(30 10% 90%)` (warm light gray)
- Card: `hsl(0 0% 100%)` (white)
- Primary: `hsl(22 95% 58%)` (orange)
- Header: `bg-[#1a1d23]` (dark navy, hardcoded on TodaysRoom + CallBrief headers)
