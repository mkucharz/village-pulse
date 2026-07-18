# Use Cases: village-pulse

## Resident: Daily Dashboard

**Who:** Village resident with smartphone or desktop browser. No login.

```
1. Opens https://my-village.example.com
2. Sees weather card: current temp, condition icon, 5-day forecast
3. "Ah, 24°C and sunny — good day for the garden."
4. Scrolls to events: today's market at 14:00, council meeting tomorrow
5. Checks energy widget: solar panels producing 42 kWh today
6. No alerts — green checkmark. All normal.
7. Closes tab. Took 5 seconds.
```

**System:** Full page renders in <200ms from cache. Weather auto-refreshes via SSE. Energy polls silently. No action needed from user.

---

## Admin: Emergency Alert

**Who:** Village administrator. Logged in.

```
1. Weather warning received: storm expected 18:00-22:00
2. Opens dashboard, clicks "Admin" link (hidden for public)
3. Enters password, session set for 24h
4. Navigates to Alerts → New Alert
5. Fills form:
   - Title: "Storm Warning"
   - Message: "Heavy rain and strong winds expected between 18:00-22:00. Secure outdoor items. Avoid forest paths."
   - Severity: Severe (orange)
   - Pinned: yes
   - Expiry: today 22:00
6. Submits — alert appears immediately on public dashboard
7. At 22:00, background goroutine auto-deactivates. Alert disappears.
```

**System:** HTMX form POST → SQLite insert → redirect to alert list. Public dashboard queries active alerts (pinned first, then by severity). Deactivation goroutine runs every 5min.

---

## Admin: Initial Village Setup

**Who:** Village administrator. Technical, comfortable with terminal.

```
1. Clones village-pulse repository
2. Edits village.yaml:
   - village.name: "Schönfeld am See"
   - village.description: "Welcome to our community"
   - village.latitude: 48.8566, longitude: 13.4888
   - village.timezone: "Europe/Berlin"
3. Adds ICS feeds:
   - Google Calendar: village events
   - iCloud: municipal office calendar
4. Configures MQTT:
   - Installs Mosquitto: apt install mosquitto
   - Sets topic_prefix: "village/schoenfeld"
5. Sets up weather/ICS bridges:
   - weather-mqtt-bridge: fetches Open-Meteo, publishes to MQTT
   - ics-mqtt-bridge: fetches ICS feeds, publishes to MQTT
6. Configures Home Assistant:
   - HA Mosquitto integration: pushes energy data to MQTT
5. Runs: go build && ./village-pulse serve
6. Opens https://schoenfeld.example.com — dashboard live
7. MQTT bridges publish data to Mosquitto → village-pulse receives → dashboard shows
```

**System:** Config validated at startup. Weather + energy caches warmed before first request. ICS feeds synced. Logs: "weather cache warmed (12s), energy: 3 entities OK, ICS: 2 feeds synced (45 events)".

---

## Resident: Event Discovery

**Who:** Resident planning the week.

```
1. Opens dashboard, sees 3 upcoming events in widget
2. "What else is happening this month?"
3. Clicks "View Full Calendar" → full month grid opens
4. Navigates to August: prev/next month arrows
5. Sees "Summer Festival" on Aug 11-12 (multi-day, both days dotted)
6. Clicks event → drawer slides in from right
7. Reads: description, exact time, location "Market Square"
8. "Perfect, I'll be there."
9. Closes drawer (overlay click) → back to calendar
10. Clicks dashboard link → back to main page
```

**System:** Calendar grid is a go-daisy table with CSS-styled day cells. Events stored in SQLite from periodic ICS sync. Drawer is go-daisy `ui.Drawer` with HTMX lazy-load (`hx-get` with spinner indicator).

---

## Another Village: Adoption

**Who:** Different village administrator. No developer.

```
1. "Our neighbor village has this nice dashboard. Can we have one?"
2. Reads README: "clone repo, edit village.yaml, go build, deploy"
3. Clones code, opens village.yaml
4. Changes: name="Neudorf", coordinates, timezone
5. Adds their own ICS feeds (Google Calendar + municipal site)
6. Configures their own HA (different entities, different URL)
7. Sets their own admin password
8. Builds, deploys — identical process, zero code changes
9. Dashboard shows Neudorf's weather, events, energy
```

**System:** Single binary, config-driven. Village identity flows from village.yaml into all pages, titles, data queries. `village_id: "default"` in MVP — future multi-tenant uses config value.

---

## Admin: Monitoring & Backup

**Who:** Village administrator. Periodic check.

```
1. Curls /health:
   {"status":"ok","db":"ok","weather_cache_age":"12s",
    "ha_reachable":true,"ics_last_sync":"2026-07-14T10:30:00Z"}
2. Logs into admin panel
3. Clicks "Backup" — downloads village-pulse-2026-07-14.db
4. Stores backup on NAS
5. Checks alert list: 1 active, 2 expired. All clean.
```

**System:** Health endpoint JSON. Backup endpoint runs `PRAGMA wal_checkpoint(TRUNCATE)` then streams file. WAL mode allows reads during backup.

---

## Resident: Emergency Scenario

**Who:** Resident during crisis. Public dashboard.

```
Scenario: Flooding risk in village

1. Admin creates Critical alert: "Flood Warning — Evacuate low-lying areas.
   Sandbags available at Town Hall. River rising fast."
   Severity: Critical. Pinned: yes. Expiry: 24h.
2. Resident opens dashboard on phone (4G, slow connection)
3. Alert is FIRST thing they see — red banner, pinned, above everything
4. HTMX is ~25KB — loads fast even on poor connection
5. Dashboard still works if HA is down: energy shows "HA unavailable"
6. Weather still updates via SSE (Open-Meteo is external, not local)
7. Alert auto-expires after 24h — no admin action needed
```

**System:** Pinned Critical alert renders first. No JS frameworks — HTMX is tiny. Graceful degradation: each widget handles its own errors independently.

---

## Multi-Village: Future (Post-MVP)

**Who:** Regional IT provider hosting dashboards for 20 villages.

```
Deployment: dashboard.example.com
Routing: Caddy subdomain → village-pulse with village_id lookup

1. schoenfeld.dashboard.example.com → village_id: "schoenfeld"
2. neudorf.dashboard.example.com → village_id: "neudorf"
3. Each village has own SQLite data, own admin login, own config

Setup: single binary, 20 config files (or single config with 20 sections)
Database: still SQLite per-village, or PostgreSQL shared with village_id column
```

**System (future):** Schema already has `village_id` column. Config search extended. Admin sessions scoped to village. Subdomain route middleware extracts village_id from Host header.

---

## Actor Summary

| Actor | Actions | Auth |
|-------|---------|------|
| **Resident** | View dashboard, browse calendar, check weather | None (public) |
| **Admin** | Create/edit/delete alerts, download backup, monitor health | Session login |
| **Another admin** | Clone repo, edit config, deploy | New deployment |
| **System** | MQTT subscribe to weather/events/energy, cache weather, deactivate expired alerts, clean energy history, clean old events | MQTT subscriber + goroutines |
