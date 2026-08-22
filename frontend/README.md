# Finsight Frontend

Next.js (App Router) dashboard UI, wired to the Finsight backend API.

## Setup

```bash
npm install
cp .env.example .env.local   # points at http://localhost:5001/api by default
npm run dev                   # http://localhost:3000
```

The backend must be running first (see `../backend/README.md`).

## Pages

| Route | Description |
|---|---|
| `/` | Landing page |
| `/signup` | Create account |
| `/login` | Log in |
| `/dashboard` | Protected — stats, transactions, health score, goals, portfolio |

## Structure

```
src/
├── app/                    Routes (App Router)
├── components/
│   ├── ui.js                 Button, Input, Select, Card, StatCard
│   ├── DashboardHeader.js
│   └── ProtectedRoute.js     Redirects to /login if not authenticated
├── context/AuthContext.js   Auth state, login/signup/logout
└── lib/
    ├── api.js                Fetch wrapper + typed API methods
    └── format.js             INR currency + percentage formatting
```

## Design system

Token definitions live in `src/app/globals.css`. The identity is "dawn breaking over a
ledger" — a deep ink-navy base (continuing the brand navy from the project synopsis) with a
horizon-amber accent, and every currency figure set in tabular monospace like a real ledger.
System font stacks are used deliberately (no external font CDN dependency — works offline,
faster builds, one less thing that can break during a live demo).

To swap in Google Fonts later if you want the original Fraunces/Inter/IBM Plex Mono pairing:
add them back via `next/font/google` in `layout.js` (removed here only because this sandbox
couldn't reach `fonts.googleapis.com` to verify the build — it'll work fine on your machine).

## Verified

- `npm run build` completes with zero errors, all 4 routes compile and prerender
- `npm start` serves all routes with 200 responses
- Auth flow (signup/login/logout), transaction add/list/delete, and all dashboard data are
  wired to real API calls — no mock/placeholder data anywhere

## Not yet verified here

Full browser-driven click-through (this environment has no browser automation tool available) —
recommend your team does one manual pass through signup → add transaction → check dashboard
numbers update correctly before Round 1 demo day.
