# Captain's Logbook

A minimalist personal flight logbook PWA — built for a Thai Airways A330 captain.

Tracks legs with four UTC time stamps (Off-Block, Airborne, Touchdown, On-Block),
computes block / flight / night time, and stores everything locally in IndexedDB.
Works offline once installed.

## Features

- **Live or backfill stamping** — tap a stamp at the moment, or open the picker to enter a time manually.
- **TG flight auto-fill** — typing a TG flight number (e.g. `TG 401`) fills From/To from a built-in route map. Edit `tg-flights.js` to extend.
- **Night time calc** — uses SunCalc with departure/arrival airport coordinates to estimate minutes flown after civil twilight.
- **Role + Duty** — PIC / Low Rank (deselectable), PF / PM / Cruise.
- **Totals** — career summary by period (MTD, 90d, YTD, last 12 mo, all-time) and aircraft type.
- **History** — month-grouped, swipe-to-delete, click to edit.
- **Themes** — Paper, Airbus, Cockpit, Ink.
- **Import / Export** — JSON for backup, CSV for airline submission.

## Run locally

The app is a static PWA — no build step.

```
python -m http.server 8766
```

Then open `http://localhost:8766`.

## Files

- `index.html` — entry + boot error surface
- `app.js` — main app (vanilla JS, ~1000 lines)
- `db.js` — Dexie/IndexedDB schema and helpers
- `night.js` — SunCalc-based night-time computation
- `airports.js` — seed list of ~40 airports Prinn flies regularly
- `aircraft.js` — seed list of TG A330 tail numbers
- `tg-flights.js` — TG flight number → route lookup
- `style.css` — all styling, 4 skins via `data-skin` attribute
- `sw.js` + `manifest.json` — PWA service worker + manifest
- `tools/import_excel.py` — convert legacy Excel logbooks to import JSON
- `tools/make_icons.py` — regenerate app icons

## Data

All data is local. Export from Settings → Export JSON for backup.
The JSON schema is documented in `sample-data.json`.
