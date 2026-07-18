# SPEC: village-pulse

## §G Goal

Community dashboard for villages. Displays weather, events, emergency alerts, energy data.
Serves as local information hub. Single Go binary, configurable per deployment.
Designed to be reused by other communities — edit config, deploy, no code changes.

### Architecture

All data arrives via MQTT broker (external Mosquitto). village-pulse subscribes to topics,
updates in-memory caches, renders dashboard. No HTTP polling, no ICS fetching, no API clients.

```
weather-mqtt-bridge ──┐
ics-mqtt-bridge     ──▶ Mosquitto MQTT ──▶ village-pulse ──▶ Dashboard
HA MQTT integration ──┘
```

Page title: `"{village.name} — Community Dashboard"` (auto-generated from config in layout.templ).
Subtitle: `village.description` from config.

### Dashboard Widgets

| # | Widget | Data Source | Display |
|---|--------|------------|---------|
| 1 | **Weather** | MQTT `village/{id}/weather/*` | Current conditions + 7-day forecast, auto-refresh via SSE |
| 2 | **Events Calendar** | MQTT `village/{id}/events/*` | Upcoming list (dashboard) + full month grid (expand) |
| 3 | **Emergency Alerts** | Admin web panel | Severity-colored cards, pinned, auto-expiry |
| 4 | **Energy Monitoring** | MQTT `village/{id}/energy/*` | go-daisy StatCardMinimal + StatCardSparkline |

### Widget Detail: Weather

- **Data arrives via MQTT topics:**
  - `village/{id}/weather/current` — current conditions JSON
  - `village/{id}/weather/forecast` — forecast JSON (daily + hourly)
- **Current conditions:** temperature (primary, large), weather icon, condition text, secondary info
- **Secondary info:** humidity by default. User can change via config (`secondary_info: humidity | wind_speed | feels_like | pressure`)
- **Forecast:** daily view (7 days) default. Hourly toggle shows 24h carousel row.
- **Hourly toggle:** HTMX swap — `hx-get="/weather/forecast/hourly"` replaces forecast row.
- **Icons:** 15 HA-condition SVG icons ported from Home Assistant. Colors: daisyUI tokens.
- **Error/empty states:** MQTT broker down → serve cached data with "Updated 12 min ago". No data yet → "Weather unavailable".
- **Units:** metric (°C, km/h, hPa, mm), imperial (°F, mph, inHg, inch), hybrid (°C, mph). Unit conversion handled by weather-mqtt-bridge before publishing.
- **WMO → HA condition mapping handled by weather-mqtt-bridge.** village-pulse receives pre-mapped conditions and pre-converted units.

### Widget Detail: Events

- **Data arrives via MQTT topic:** `village/{id}/events/{uid}` — one message per event
- **Upcoming list:** "Today" section (events where end_time > NOW() and start_time < midnight(village TZ) + 24h). "This Week" section (next 7 calendar days).
- **Calendar grid:** month view via go-daisy `table.TableWithProps`. Week starts Monday. Max 4 event dots + "+N more". Edge cells faded.
- **Multi-day events:** color dot on every spanned day. Bracket notation: "Sat 10:00 — Sun 22:00".
- **Event detail:** opened via go-daisy `ui.Drawer` (right side, full-screen on mobile). ESC closes.
- **All-day events:** "All day" label instead of time. Multi-day bracket: "Mon — Wed".
- **Empty event title:** ICS events without SUMMARY → "Untitled Event".
- **Color coding:** each event carries feed color in MQTT message.
- **RRULE expansion, ICS parsing, feed fetching handled by ics-mqtt-bridge.** village-pulse receives pre-expanded, pre-parsed event JSON.
- **Cleanup:** events older than `retention_days` (30 days) deleted nightly.
- **Error/empty states:** No events → "No upcoming events". Last push stale → "Calendar may be stale".

### Widget Detail: Alerts

- **Severity:** info (blue), warning (yellow), severe (orange), critical (red). Mapped to go-daisy `AlertType`.
- **Message format:** plain text. Newlines preserved, rendered as `<br>`. No Markdown/HTML.
- **Expiry display:** relative <24h, absolute >24h. Exact time on hover (tooltip).
- **Pinned alerts:** rendered first. Badge shown. On mobile: alerts render FIRST (emergency-first UX).
- **Sorting:** Pinned → Critical → Severe → Warning → Info. Same priority: newest first.
- **Scheduled alerts:** future `start_time` → grayed out "Scheduled" badge, sorted after active.
- **Delete:** hard delete after confirmation. No undo.
- **Form validation:** title (1-200), message (1-2000), severity (0-3), start_time required. expiry_time must be > NOW() and > start_time. 422 on failure.
- **Session expiry:** POST returns 401 → HTMX redirect to login → return to /admin. Form data lost.
- **Background deactivation:** goroutine every 5min: `SET active=0 WHERE expiry < NOW()`.

### Widget Detail: Energy

- **Data arrives via MQTT topic:** `village/{id}/energy/{entity_id}` — one topic per entity, value on each message
- **Display:** go-daisy `StatCardMinimal` per entity (icon-corner variant). Value + unit + trend badge.
- **Trend:** `StatTrendUp`/`StatTrendDown` vs 24h ago. Neutral if no baseline.
- **Sparkline:** go-daisy `StatCardSparkline` with 7 data points (daily averages, per entity).
- **Icon mapping:** Config icon → Lucide: solar→`sun`, consumption→`zap`, grid→`plug`, battery→`battery`, gas→`flame`, water→`droplet`.
- **Timestamp:** "Updated 2 min ago" (green fresh, warning stale >10min since last MQTT message).
- **HA integration:** HA publishes directly to MQTT via built-in Mosquitto integration. No inget endpoint needed.
- **When no energy configured:** widget shows "Energy monitoring not configured".
- **MQTT message parsing:** accepts `42.5` (number) or `"42.5"` (string). Rejects NaN/Infinity.
- **Entity display filter:** only entities listed in config are displayed. Unknown entity_ids on MQTT are stored but not shown.

### Done Criteria (MVP)

- [ ] Deployable as single Go binary + Mosquitto broker + 2 bridge services
- [ ] Subscribes to MQTT topics for weather, events, energy
- [ ] Landing page at `/` when no config. Redirect to `/dashboard` when configured.
- [ ] First-run: minimal config works. Weather: "Waiting for data." Events: "No events." Energy: "Not configured."
- [ ] Weather: current + 7-day daily + 24h hourly, auto-refresh SSE
- [ ] Events: upcoming list (5-7 items), month calendar grid
  - Max 4 event dots per cell + "+N more"
  - Multi-day events with bracket notation
  - All-day events with "All day" label
  - Cleanup >30 days past
- [ ] Alerts: admin CRUD at `/admin`, 4 severity levels, auto-expiry, pinning
- [ ] Energy: config-driven entity list, current + trend + sparkline
  - Stale if >10min since last MQTT message
- [ ] All 4 widgets on single page via full server render. Weather SSE, energy via MQTT updates.
- [ ] Responsive — daisyUI + Tailwind, mobile-first, modern browsers
- [ ] Runs behind reverse proxy (Caddy/nginx) on port 9080
- [ ] Another village: clone repo, edit config, deploy. Same MQTT broker can serve multiple villages (different topic prefixes).
- [ ] Health check: DB, cache freshness, MQTT connection status, uptime
- [ ] Graceful shutdown: 15s drain, MQTT disconnect, close DB
- [ ] MQTT reconnection with exponential backoff (Paho client built-in)
- [ ] Custom error pages: 404/500 via go-daisy
- [ ] SQLite backup: `GET /admin/backup` with WAL checkpoint
- [ ] Logging: `log/slog` stdlib

### Security Requirements

- [ ] Admin: session-based login. Cookie store. Username hardcoded "admin".
- [ ] CSRF: gorilla/csrf double-submit cookie pattern
- [ ] CSP header
- [ ] Admin login rate limiting: 5/min
- [ ] MQTT credentials never exposed to frontend
- [ ] Admin password masked in logs

### Testing Requirements

- [ ] Table-driven unit tests (all packages)
- [ ] Integration tests with MQTT test broker + pre-recorded fixture messages
- [ ] runlog E2E tests (full server, MQTT broker, real SQLite)
- [ ] Coverage targets: 80%+ for business logic

### Done Criteria (Post-MVP)

- [ ] Multi-tenant server mode (subdomain routing per village)
- [ ] Public event submissions by community members
- [ ] Weather alerts in emergency widget
- [ ] Energy: bridge supports multiple source types
- [ ] Multi-language i18n
- [ ] MQTT bridge: single binary that can run weather + ICS bridges

---

## §C Constraints

| Constraint | Detail |
|-----------|--------|
| Language | Go 1.25+ |
| Templates | Templ (`.templ` → Go code) |
| Interactivity | HTMX v4.0.0-beta5 (`hx-sse` built-in). jsDelivr `@next`. |
| Styling | Tailwind CSS 4 + daisyUI 5. Standalone CLI v4.3.2. |
| Component library | go-daisy `github.com/emergent-company/go-daisy@v0.6.0`. 6 packages: `ui`, `form`, `table`, `modal`, `nav`, `render`. |
| HTTP Router | Echo v4 (`labstack/echo/v4`) |
| MQTT Client | `eclipse/paho.mqtt.golang` v1.x — subscribe to topics, reconnect built-in |
| Database | SQLite via `modernc.org/sqlite` (pure Go, no CGO) |
| Module path | `mkucharz/village-pulse` |
| Port | 9080 |
| Build | Taskfile.yml: `build`, `dev` (air), `generate` (templ), `lint` (golangci-lint), `test`, `clean` |
| Tailwind | Standalone CLI: `tailwindcss -i assets/input.css -o static/output.css --minify`. Input CSS: `@import "tailwindcss"; @plugin daisyui { themes: light --default, dark --prefersdark; } @source "../internal";` |
| Static files | Echo `e.Static("/static", "static")`. CSS at `/static/output.css`. Dir `./data/` auto-created. |
| Weather data | Received via MQTT, pre-processed by weather-mqtt-bridge. No HTTP client in village-pulse. |
| Events data | Received via MQTT, pre-processed by ics-mqtt-bridge. No ICS fetcher in village-pulse. |
| Energy data | Received via MQTT, published by HA Mosquitto integration. |
| Caching | In-memory with freshness tracking. Weather/energy marked stale if no MQTT message > threshold. |
| Deployment | Systemd service, Caddy reverse proxy, Mosquitto via system package |
| Browser | Chrome/Firefox/Safari/Edge last 2 years |
| Logging | `log/slog` stdlib. Console text (dev), JSON file (prod). |
| Security | Cookie sessions, CSRF, CSP, admin rate limit 5/min |
| Shutdown | SIGINT/SIGTERM → 15s drain → MQTT disconnect → close DB |
| Backup | `GET /admin/backup` + WAL checkpoint |
| Deploy size | 1 Go binary + Mosquitto + 2 bridge binaries (weather-mqtt-bridge, ics-mqtt-bridge) |

### Not In Scope (MVP)

- Embedded MQTT broker (Mosquitto is external)
- MQTT bridge binaries included in village-pulse (separate projects)
- User accounts / multi-user auth
- Push notifications
- Dark mode toggle (auto via `prefers-color-scheme` only)

---

## §I Interfaces

### HTTP Endpoints

```
# Landing / Product
GET  /                         — Landing page (no config) OR redirect to /dashboard (configured)
GET  /dashboard                 — Village dashboard (all 4 widgets)

# System
GET  /health                   — Health check JSON (DB, MQTT, uptime)

# Weather
GET  /weather                  — Weather widget HTML fragment (?type=current|forecast|full, ?forecast_type=daily|hourly)
GET  /weather/sse              — SSE stream (pushes from MQTT cache every 30s, heartbeat every 15s)

# Events
GET  /events                   — Events widget HTML fragment
GET  /events/calendar          — Full month calendar view
GET  /events/{id}              — Event detail (drawer content)

# Energy
GET  /energy                   — Energy widget HTML fragment
GET  /energy/history           — Energy history (JSON, for debugging)

# Alerts
GET  /alerts                   — Alerts widget HTML fragment

# Admin (session + CSRF + rate limit)
GET  /admin                    — Admin dashboard
GET  /admin/login              — Login form
POST /admin/login              — Authenticate
POST /admin/logout             — Clear session → redirect to `/`
GET  /admin/alerts             — Alert list
GET  /admin/alerts/new         — New alert form
POST /admin/alerts             — Create alert
GET  /admin/alerts/{id}/edit   — Edit form
PUT  /admin/alerts/{id}        — Update alert
DELETE /admin/alerts/{id}      — Delete alert
GET  /admin/backup             — Download SQLite backup
```

### MQTT Topics

village-pulse subscribes to these topics. Topic prefix from config (`mqtt.topic_prefix`).

| Topic Pattern | Payload | QoS | Retained |
|--------------|---------|-----|----------|
| `{prefix}/weather/current` | Current conditions JSON (see api.md) | 1 | ✅ |
| `{prefix}/weather/forecast` | Forecast JSON (daily + hourly arrays) | 1 | ✅ |
| `{prefix}/events/+` | Single event JSON (wildcard = UID) | 1 | ✅ |
| `{prefix}/energy/+` | Energy reading JSON (wildcard = entity_id) | 1 | — |

Retained messages: on MQTT reconnect, broker replays last retained message. Ensures dashboard has data immediately without waiting for next bridge publish cycle.

### Health Check Response

```json
{
  "status": "ok",
  "db": "ok",
  "mqtt_connected": true,
  "weather_last_message": "12s ago",
  "energy_last_message": "4m ago",
  "events_last_message": "1h 2m ago",
  "uptime": "3h 22m"
}
```

### SSE Protocol

Pushes pre-rendered HTML fragments. See api.md for full spec.

### Configuration File

```yaml
# village.yaml
village:
  name: "My Village"
  description: "Welcome to our community dashboard"
  latitude: 48.8566
  longitude: 2.3522
  timezone: Europe/Paris
  language: en

mqtt:
  broker: "tcp://localhost:1883"
  client_id: "village-pulse"    # unique per village instance
  username: ""                  # optional
  password: "${MQTT_PASSWORD}"  # optional
  topic_prefix: "village/my-village"

weather:
  units: metric                 # metric | imperial | hybrid
  forecast_days: 7              # 1-16
  secondary_info: humidity      # humidity | wind_speed | feels_like | pressure

events:
  upcoming_count: 7
  retention_days: 30

energy:
  entities:
    - entity_id: sensor.solar_production_today
      name: "Solar Production"
      unit: kWh
      icon: solar
    - entity_id: sensor.village_consumption_today
      name: "Village Consumption"
      unit: kWh
      icon: consumption
    - entity_id: sensor.grid_export_today
      name: "Grid Export"
      unit: kWh
      icon: grid
  freshness_threshold: 10m      # warn if no data for this long

alerts:
  admin_password: "${ADMIN_PASSWORD}"

server:
  port: 9080
  host: "0.0.0.0"
  log_level: info
  log_output: both
  log_path: ./data/village-pulse.log
  shutdown_timeout: 15s
  session_secret: "${SESSION_SECRET}"
  csrf_secret: "${CSRF_SECRET}"

database:
  path: ./data/village-pulse.db
```

### Environment Variables

```
VILLAGE_CONFIG=/etc/village-pulse/village.yaml
MQTT_PASSWORD=mosquitto-secret
ADMIN_PASSWORD=supersecret
SESSION_SECRET=<32-byte-random>
CSRF_SECRET=<32-byte-random>
PORT=9080
LOG_LEVEL=info
LOG_OUTPUT=both
```

Environment variables override matching YAML keys at startup.

### CLI

```
village-pulse serve              # Start server
village-pulse serve -c /path     # Custom config path
village-pulse version            # "village-pulse v0.0.0 (go1.25.x, linux/amd64)"
```

### Config Search Order

1. `--config` CLI flag → 2. `$VILLAGE_CONFIG` → 3. `./village.yaml` → 4. `/etc/village-pulse/village.yaml`

### Config Validation

- `village.name` non-empty. `latitude` -90..90. `longitude` -180..180.
- `village.timezone` valid IANA. Invalid → warn + UTC fallback.
- `server.port` 1-65535. `shutdown_timeout` valid duration.
- `database.path` directory writable.
- `mqtt.broker` valid TCP URL. Connection tested at startup (warn if unreachable — non-fatal).
- Unknown config keys → startup failure (strict YAML).
- `weather.forecast_days` 1-16.
- `events.retention_days` ≥ 1.

### MQTT Connection

- Startup: connect to broker. On failure: warn + retry (Paho auto-reconnect).
- Subscribe to topics with QoS 1.
- Retained messages on reconnect provide latest data instantly.
- Client ID must be unique per village instance (shared broker scenario).

---

## §R Research

| Topic | Options Considered | Decision | Source |
|-------|-------------------|----------|--------|
| Data architecture | HTTP pull, HTTP push, MQTT pub/sub | MQTT — uniform ingestion pattern, real-time, decoupled. External Mosquitto broker. | mqtt.org |
| MQTT Go client | paho.mqtt.golang, hmq, watermill | paho.mqtt.golang — Eclipse project, most mature Go MQTT client, built-in reconnect | github.com/eclipse/paho.mqtt.golang |
| Weather data | Open-Meteo HTTP vs MQTT bridge | External weather-mqtt-bridge. village-pulse subscribes to MQTT, no HTTP client. | |
| Events data | ICS HTTP fetch vs MQTT bridge | External ics-mqtt-bridge. ICS parsing + RRULE expansion in bridge, village-pulse receives JSON. | |
| Energy data | HA REST API vs HA MQTT integration | HA publishes directly to MQTT via built-in Mosquitto integration. No custom ingest endpoint needed. | home-assistant.io/integrations/mqtt/ |
| Weather icons | Port HA SVGs | 15 HA-condition SVGs, daisyUI color tokens | github.com/home-assistant/frontend |
| Go HTTP router | chi, stdlib, echo | Echo v4 | github.com/labstack/echo |
| Database | SQLite, PostgreSQL | SQLite via modernc.org/sqlite. Repository pattern. | pkg.go.dev/modernc.org/sqlite |
| Component library | Build vs go-daisy | go-daisy v0.6.0 — `ui`, `form`, `table`, `modal`, `nav`, `render` | github.com/emergent-company/go-daisy |
| ICS/Event display | Custom vs library | Custom Templ + go-daisy table | |
| HTMX version | v2 vs v4 | v4.0.0-beta5 — SSE built-in | htmx.org |
| CSS framework | Tailwind 3 vs 4 | Tailwind CSS 4 + daisyUI 5 | daisyui.com |
| Auth | JWT, sessions, BasicAuth | gorilla/sessions cookie store + gorilla/csrf | github.com/gorilla |
| Logging | zap, zerolog, slog | log/slog stdlib | |
| Testing | stdlib, testify, runlog | stdlib + httptest + runlog E2E | |
| Bridge services | Internal vs external | External binaries. Weather: Open-Meteo → MQTT. ICS: iCal → MQTT. | |
| MQTT topic format | village/{id}/weather/* | Prefix from config, wildcard subscribers for events + energy. Retained messages for weather. | |

---

## §V Invariants

1. Every request returns within 200ms (cached data from MQTT)
2. Weather cache freshness: last MQTT message timestamp tracked. Stale indicator if > expected bridge interval.
3. Config fails at startup — invalid YAML, missing required fields, unknown keys rejected
4. Zero JS errors on page load. Static HTML renders. Admin forms fall back to full page POST if JS disabled.
5. MQTT subscription failure never crashes server — logged, serve cached data
6. Admin password masked in logs
7. MQTT credentials never exposed to frontend
8. SQLite WAL mode — no concurrent write conflicts
9. All time display honors configured timezone
10. Alert expiry enforced server-side — expired alerts hidden
11. Events deduplicated by UID (bridge sends UID as topic suffix)
12. SSE connection reconnects with exponential backoff (HTMX v4 built-in)
13. Dashboard has data on fresh start via MQTT retained messages
14. Health check 503 if DB unreachable, 200 degraded if MQTT disconnected
15. Admin forms require valid CSRF token → 403 otherwise
16. Energy values displayed with unit from MQTT message
17. Energy history cleaned after 90 days — daily goroutine
18. Ingest rejects payloads >256KB, >10MB ICS (bridge-side)
19. Events with missing end_time default to start_time + 1h (bridge-side)
20. Trend neutral when 24h baseline unavailable
21. MQTT reconnection with exponential backoff (Paho built-in)
22. Unknown config keys → startup failure
23. Energy staleness: warn if no MQTT message > `freshness_threshold`

---

## §T Tasks (MVP)

| ID | Status | Task | Depends On | Est |
|----|--------|------|------------|-----|
| **Foundation** ||||
| T-01 | pending | Project scaffold: go.mod, main.go, Taskfile.yml, .gitignore, .editorconfig | — | 1h |
| T-02 | pending | Config system: yaml parsing, validation, defaults, env var interpolation, search order | T-01 | 2h |
| T-03 | pending | Echo server: slog logger, recover, CSRF, CSP, session middleware, error handler (404/500), graceful shutdown | T-02 | 3h |
| T-04 | pending | Tailwind: standalone CLI, daisyUI plugin, CSS entry, Taskfile tasks | T-01 | 1h |
| T-05 | pending | Templ setup: base layout, header/footer, go-daisy import, error pages | T-04 | 2h |
| T-06 | pending | Logging: slog dual output (console text + file JSON), fanout handler | T-01, T-02 | 1h |
| T-07 | pending | Health check: DB, MQTT status, cache freshness, uptime | T-03, T-06 | 1h |
| T-08 | pending | MQTT client: connect, subscribe, reconnect, topic handlers | T-02 | 3h |
| **Weather** ||||
| T-09 | pending | Weather MQTT handler: parse current/forecast JSON, update in-memory cache | T-08 | 2h |
| T-10 | pending | Weather card Templ: current conditions + forecast row (go-daisy cards) | T-09 | 4h |
| T-11 | pending | Weather SVG icons: port HA inline SVGs to Templ components | — | 3h |
| T-12 | pending | Weather SSE endpoint: push pre-rendered HTML from cache, heartbeat | T-09, T-10 | 2h |
| **Events** ||||
| T-13 | pending | SQLite schema + migrations: events, alerts, energy_history tables | T-01 | 1h |
| T-14 | pending | Events MQTT handler: parse event JSON, upsert to SQLite, deduplicate by UID | T-08, T-13 | 2h |
| T-15 | pending | Events widget Templ: upcoming list + month calendar grid (max 4 per cell + overflow) | T-14 | 4h |
| T-16 | pending | Past event cleanup: delete events >30d past, nightly goroutine | T-13 | 1h |
| **Alerts** ||||
| T-17 | pending | Alerts CRUD handlers: create, read, update, delete, expiry deactivation | T-13 | 2h |
| T-18 | pending | Admin panel: session auth, login form, CSRF, rate limiting, alert management forms (HTMX) | T-03, T-17, T-06 | 5h |
| T-19 | pending | Alerts widget Templ: severity cards (go-daisy alert), pinned sorting, auto-hide on expiry | T-17 | 2h |
| T-20 | pending | Backup endpoint: GET /admin/backup with WAL checkpoint, date-stamped filename | T-13, T-18 | 1h |
| **Energy** ||||
| T-21 | pending | Energy MQTT handler: parse energy JSON per entity, upsert to SQLite, update cache | T-08, T-13 | 2h |
| T-22 | pending | Energy widget Templ: go-daisy StatCardMinimal (value + trend) + StatCardSparkline (7-day SVG) | T-21 | 3h |
| T-23 | pending | Energy history retention: cleanup >90 days, daily goroutine | T-13 | 1h |
| **Assembly** ||||
| T-24 | pending | Dashboard page: 2x2 grid, all widgets assembled, responsive breakpoints | T-10, T-15, T-19, T-22 | 3h |
| T-25 | pending | Systemd + Caddy + Mosquitto config templates + backup cron doc | T-03 | 1h |
| T-26 | pending | README: setup guide, config docs, bridge setup, deployment instructions | — | 2h |
| T-27 | pending | Unit tests: config, MQTT handlers, cache, alert expiry, energy trend calc | T-02—T-21 | 5h |
| T-28 | pending | Integration tests: MQTT test broker + fixture messages, SQLite in-memory | T-03, T-24 | 3h |
| T-29 | pending | runlog E2E tests: full server, MQTT broker, dashboard render, SSE, admin CRUD | T-27, T-28 | 3h |
| T-30 | pending | go build + golangci-lint + go vet + smoke test | T-27, T-28, T-29 | 1h |
| **Landing Page** ||||
| T-31 | pending | Landing page Templ: hero, feature cards, setup steps, code block, demo preview | T-05 | 3h |
| T-32 | pending | Demo data: hardcoded sample Weather, Events, Alerts, Energy for preview | — | 1h |
| T-33 | pending | Route logic: GET / → landing OR redirect based on config presence | T-03, T-31 | 1h |

### External Bridge Projects

| Project | Repo | Purpose |
|---------|------|---------|
| `weather-mqtt-bridge` | Separate repo | Fetch Open-Meteo, map WMO→HA conditions, convert units, publish to MQTT |
| `ics-mqtt-bridge` | Separate repo | Fetch ICS feeds, parse, expand RRULE, publish events to MQTT |

---

## Dependencies

### Go Modules

```
module mkucharz/village-pulse

go 1.25.0

require (
    github.com/a-h/templ v0.3.x
    github.com/emergent-company/go-daisy v0.6.0
    github.com/labstack/echo/v4 v4.15.x
    github.com/gorilla/sessions v1.4.0
    github.com/gorilla/csrf v1.7.x
    github.com/eclipse/paho.mqtt.golang v1.x
    modernc.org/sqlite v1.x
)
```

### External Service Dependencies

| Service | Purpose | Install |
|---------|---------|---------|
| Mosquitto | MQTT broker | `apt install mosquitto` |
| weather-mqtt-bridge | Open-Meteo → MQTT | Separate Go binary |
| ics-mqtt-bridge | ICS feeds → MQTT | Separate Go binary |
| HA Mosquitto integration | HA → MQTT (energy) | Built-in HA integration |

### CDN

| Resource | URL |
|----------|-----|
| HTMX v4.0.0-beta5 | `https://cdn.jsdelivr.net/npm/htmx.org@next/dist/htmx.min.js` |
| daisyUI v5 | `https://cdn.jsdelivr.net/npm/daisyui@5` |

---

## §B Bugs

(Empty — no implementation yet)
