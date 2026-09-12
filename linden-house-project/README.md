# Linden House — Guest Housing Booking System

A complete guest housing / boutique-guesthouse booking web app, covering
the full flow: register & login, search & filter rooms, book a room, mock
payment, and booking confirmation — plus an admin panel to manage rooms,
bookings, and guests.

This is a full runnable project (Vite + React), not just a snippet.

## Project structure

```
linden-house-booking/
├── index.html
├── package.json
├── vite.config.js
├── README.md
└── src/
    ├── main.jsx        # React entry point
    └── App.jsx         # The entire app (UI, logic, styling)
```

## Running it locally

Requires Node.js 18+.

```bash
npm install
npm run dev
```

Then open the URL Vite prints (usually http://localhost:5173).

To build a production bundle:

```bash
npm run build
npm run preview
```

## Demo login

- **Admin:** `admin@linden.house` / `admin123`
- **Guest:** register a new account from the "Sign in" button on the app.

## How it works

- All data (rooms, users, bookings) is stored in the browser's
  `localStorage`, so it persists between reloads on the same device/browser
  — no backend or database required to try it out.
- "Payment" and email/SMS notifications are simulated for demo purposes;
  no real charges or messages are sent.
- Room availability is checked against existing confirmed bookings so
  double-booking the same dates isn't possible.

## Customizing

- Colors, type, and spacing live in the `<style>` block at the bottom of
  `src/App.jsx` (CSS custom properties at the top: `--paper`, `--ink`,
  `--moss`, `--brass`, `--clay`, `--mist`).
- Starting inventory (rooms) and the seeded admin account are defined near
  the top of `src/App.jsx` in `DEFAULT_ROOMS` and `DEFAULT_USERS`.
- To connect a real backend/database instead of `localStorage`, replace
  the `loadJSON` / `saveJSON` helpers near the top of `src/App.jsx` with
  calls to your own API.
