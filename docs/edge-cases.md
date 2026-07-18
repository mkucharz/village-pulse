# Edge Cases: village-pulse

## MQTT

| # | Edge Case | Behavior |
|---|-----------|----------|
| M1 | Broker unreachable at startup | Paho auto-reconnect. Log warning. Dashboard shows cached data (retained messages will fill in on reconnect). |
| M2 | Broker goes down mid-operation | Paho reconnects with exponential backoff. Dashboard shows stale timestamps. Health check: `mqtt_connected: false`. |
| M3 | Broker restarts, retained messages lost | Weather/events gone until bridge next publishes. Energy unaffected (real-time push). |
| M4 | Malformed JSON on MQTT topic | Log error with topic name. Skip message. Don't crash. Counter tracked for monitoring. |
| M5 | MQTT topic payload truncated | JSON parse fails. Log error. Skip. |
| M6 | Multiple MQTT clients with same ClientID | Broker drops oldest connection. village-pulse reconnects. Ensure unique ClientID per village instance. |
| M7 | MQTT broker auth fails (wrong password) | Paho connect retries. Log error. Dashboard starts but shows no MQTT data. Health: degraded. |
| M8 | Bridge service stops | village-pulse shows stale timestamps. Health check shows "last message: 2h ago". Bridge restart restores data flow. |

| # | Edge Case | Behavior |
|---|-----------|----------|
| W1 | Open-Meteo rate limit hit (10k/day) | Serve cached data. Log warning. Wait until next `refresh_interval` to retry. No aggressive retry loop. |
| W2 | Invalid coordinates (0, 0) | Open-Meteo returns error. Log warning. Serve "Weather unavailable — check coordinates in config." |
| W3 | High-latitude location (polar day/night) | No sunset/sunrise in Open-Meteo response. `sunrise`/`sunset` fields zero-value. Condition "clear-night" never triggers. "sunny" shows day icon. |
| W4 | Partial API response (some fields null) | Parse gracefully — missing fields default to zero. Log individual field errors. Don't fail entire parse. |
| W5 | Invalid timezone in config | Open-Meteo falls back to UTC. Warning logged at startup. |
| W6 | Forecast requested past available range (>16 days) | Open-Meteo returns max 16. Config validation catches this — `forecast_days` capped at 16. |
| W7 | API responds with HTML (CDN error/redirect) | Content-Type check fails JSON parse. Log error. Serve cached + "Weather temporarily unavailable". |
| W8 | `is_day` field missing in hourly data | Default to checking sunrise/sunset from daily data. If both missing, assume daytime. |

## Events

| # | Edge Case | Behavior |
|---|-----------|----------|
| E1 | Empty ICS feed (valid URL, 0 VEVENTs) | No events inserted. No error. "No upcoming events" state shown. |
| E2 | ICS URL returns HTML (misconfigured calendar link) | Content-Type check fails. Log error for that feed. Other feeds still sync. Stale data served. |
| E3 | ICS file >10MB | Abort download. Log warning "ICS feed too large: {url}". Skip this feed. Continue other feeds. |
| E4 | Event with no end time | Set `end_time = start_time + 1h` as default. Log warning. |
| E5 | Event with empty/missing title | Display "Untitled Event". Feed color dot still shown. |
| E6 | Event with same UID in 2 different feeds | Deduplicate by UID across all feeds. First feed's color wins. Log debug "Duplicate UID {id} from {feed2}, keeping {feed1}". |
| E7 | 10,000+ VEVENTs in a single ICS feed | Parse all, but limit display: upcoming list shows max `upcoming_count` (7). Calendar grid shows max 4 per cell. All 10k stored in DB — indexed queries keep it fast. |
| E8 | RRULE with no end date (FOREVER) | Expand only 90 days forward. `Expand()` limited to 1000 instances. Log warning "RRULE expanded {count} instances (max)". |
| E9 | RRULE EXDATE for date outside expanded range | No effect. EXDATE only applied to dates already expanded. |
| E10 | ICS feed returns 404 (deleted calendar) | Log warning. Serve stale data. After 30 days, events from this feed are deleted by retention. |
| E11 | ICS feed returns events from year 1970 | Valid timestamps stored as-is. Cleanup deletes them since >30 days past. May briefly appear in DB but not in "upcoming" query. |
| E12 | ICS download times out (>30s) | HTTP client with 30s timeout. Log error. Skip feed. |

## Alerts

| # | Edge Case | Behavior |
|---|-----------|----------|
| A1 | Admin creates alert with expiry_time < NOW() | Form validation rejects: "Expiry time must be in the future." |
| A2 | Admin creates alert with expiry_time = start_time | Form validation rejects: "Expiry time must be after start time." |
| A3 | Duplicate alert (same title + message) | Allowed. Each has own ID. No deduplication — admin intent is respected. |
| A4 | Pinned alert with no expiry | Stays active forever. Only removed by admin manual delete or deactivation. |
| A5 | Alert message exceeds 2000 chars | Form validation rejects. Client-side: `maxlength="2000"` on textarea. Server-side: 400 if exceeded. |
| A6 | Alert start_time is years in the past | Valid. Shows as active (or "Scheduled" if future start). No date range restriction. |
| A7 | Alert start_time is years in the future | Valid. Shows grayed "Scheduled" badge. Deactivation goroutine ignores (active=1, expiry is future). |
| A8 | Admin deletes an alert that was just auto-deactivated | DELETE is idempotent from UI perspective — row already `active=0`. Delete removes entirely. No error shown. |
| A9 | Expired alert + active alert have same severity/pinned | Sorting: pinned active first, then severity. Expired alerts only visible in admin list (not public dashboard). |
| A10 | Admin creates alert while expiry is exactly NOW | Race possible: alert saved then immediately deactivated by goroutine (runs every 5min). Session-based, admin sees "Saved" but alert disappears within 5min. Edge case, acceptable. |

## Energy

| # | Edge Case | Behavior |
|---|-----------|----------|
| EN1 | HA pushes string "42.5" instead of number 42.5 | `json.Unmarshal` fails if value field is `"42.5"` (string). Parse as float64: try type assertion, if string, `strconv.ParseFloat`. If both fail, reject that entity, log error. |
| EN2 | HA pushes entity_id not in config | Store in DB (for future use) but don't display on dashboard. Log debug "unknown entity_id: {id}". |
| EN3 | Two pushes in same second for same entity | UNIQUE constraint `(village_id, entity_id, timestamp)` blocks duplicate. Latest value wins (UPSERT). |
| EN4 | HA pushes negative values (e.g., consumption = -28.3) | Valid. Display as-is with minus sign. Sparkline scales accordingly. |
| EN5 | No push for 24h+ → trend unavailable | `StatTrendNeutral` with "—" badge. Sparkline still shows last 7 days (may have gaps). |
| EN6 | Ingest payload >1MB (attack vector) | Echo body limit middleware: `e.Use(middleware.BodyLimit("256KB"))`. Reject with 413. |
| EN7 | Ingest key rotated in config, HA still uses old key | Dashboard returns 401. HA logs show failure. Admin updates HA automation with new key. Old pushes lost during rotation window. |
| EN8 | HA pushes empty array `[]` | Accept 200 with `{"stored": 0}`. No effect on cache. |
| EN9 | HA pushes 100+ entities per request | Process all. Batch insert with transaction. Limit 200 entities per request (Echo body limit). |
| EN10 | Value is infinity or NaN | `json.Unmarshal` rejects. Log error. Skip only that entity, store others. |

## Admin

| # | Edge Case | Behavior |
|---|-----------|----------|
| AD1 | Session cookie tampered or forged | gorilla/sessions cookie store uses HMAC verification. Tampered cookie rejected — treated as no session. Redirect to login. |
| AD2 | Admin password contains `#`, `{`, `}` or other YAML special chars | Enclose in quotes in YAML: `admin_password: "p@ss#w0rd!"`. Config docs show this. |
| AD3 | Expired CSRF token (cookie expiry or different session) | gorilla/csrf returns 403 with "CSRF token invalid". Admin sees error, refreshes page to get new token. |
| AD4 | Admin fills form, coffee break, session expires | POST returns 401. HTMX shows login form. After login, redirects to `/admin`. Form data lost (no auto-save). |
| AD5 | Admin opens two browser tabs, logs out in one | Other tab gets 401 on next request. Standard cookie-based session behavior. |
| AD6 | Admin sets password to same as old password | No change detection. Session continues. Accepted. |
| AD7 | Admin tries to access `/admin` without login | Session middleware → no valid session → redirect to `/admin/login`. |
| AD8 | Login page accessed while already logged in | Session exists → redirect to `/admin`. |

## System

| # | Edge Case | Behavior |
|---|-----------|----------|
| S1 | SQLite database file corrupted (disk error, partial write) | Health check fails. API calls return errors. Server continues but DB operations fail. Log error with file path for manual recovery. |
| S2 | Disk full — writes fail | `INSERT`/`UPDATE` fails at SQLite level. Log error. Serve stale cached data (weather/energy from memory). Events/alerts queries fail. Health returns degraded. |
| S3 | Port 9080 already in use | `echo.Start()` fails. Log fatal "port 9080 already in use". Exit code 1. |
| S4 | `data/` directory deleted while server running | Next write creates directory again (auto-create logic on each write). If parent not writable, writes fail. Log error. |
| S5 | Clean shutdown (SIGTERM/SIGINT) | 15s drain, stop goroutines, checkpoint WAL, close DB. |
| S6 | Kill signal (SIGKILL) | WAL file contains pending writes. Next startup: WAL auto-recovery by SQLite. No data loss (WAL journal). |
| S7 | Config loaded from symlinked path | Follow symlink. Resolve to real path for logging purposes. |
| S8 | `village.yaml` has BOM (byte order mark) at start | YAML parser handles it. UTF-8 BOM stripped. |
| S9 | Config contains unknown keys (typo) | Strict YAML parsing with `KnownFields(true)`. Unknown keys cause startup failure. Fail-fast. |
| S10 | `go build` fails (missing dependency) | Standard `go build` error output. Taskfile task fails. |
| S11 | Server started via `go run` (dev mode, not production) | Works. No behavioral difference. `air` uses this for hot reload. |
| S12 | Multiple instances on same database (accidental) | SQLite WAL mode allows concurrent readers but only one writer. Second instance opening same DB file: may corrupt. Document: "Only one village-pulse process per database file." |

## Browser

| # | Edge Case | Behavior |
|---|-----------|----------|
| B1 | JavaScript disabled | HTMX (JS library) doesn't load. Dashboard renders server-side HTML (Templ). SSE and polling don't work — weather/energy show initial render only. Alert admin forms don't submit via HTMX → falls back to full page form POST. |
| B2 | Very old browser (IE11, pre-2020) | CSS Grid may not work — layout breaks. But daisyUI has flexbox fallbacks. Content readable, just not pretty. |
| B3 | Mobile device with 320px width | Minimum layout: single column, reduced forecast slots. Content still readable. |
| B4 | Network disconnection + SSE reconnect | HTMX v4 SSE reconnects with exponential backoff. On reconnect, full weather push sent. No data lost. |
| B5 | User bookmarks `/admin/login` while already logged in | Session still valid → redirected to `/admin`. |
| B6 | User changes system time (timezone offset changes) | Server timezone is config-driven (`village.timezone`), not system time. Forecast/events shifted but still correct relative to village TZ. |
| B7 | Browser stores old CSS in cache after upgrade | CSS filename changes with content hash? For MVP: `Cache-Control: no-cache` on `/static/output.css` during dev. In prod with Caddy: short cache TTL (1h). |
| B8 | User opens dashboard then puts device to sleep | SSE connection drops. On wake, HTMX reconnects. Dashboard shows last known values until SSE pushes new data. |
| B9 | Double-click on "Delete Alert" | First click shows confirmation dialog. Second click is ignored (button disabled or second dialog blocked). |
| B10 | User presses Back button after event detail drawer | Browser history: drawer is not a navigation (no URL change). Back goes to previous page. Drawer closes. |

## ICS Feed Sync

| # | Edge Case | Behavior |
|---|-----------|----------|
| F1 | Feed URL redirects (301/302) | HTTP client follows redirects (Go default, max 10 hops). |
| F2 | Feed returns gzip-encoded content | HTTP client handles `Content-Encoding: gzip` automatically. |
| F3 | Feed returns 429 (rate limited) | Log warning. Skip this cycle. Retry next `sync_interval`. Exponential backoff not needed (Google/iCloud don't rate-limit normal usage). |
| F4 | Feed returns 503 (temporary outage) | Log warning. Serve stale events. Retry next cycle. |
| F5 | Feed auth fails (401/403), basic auth configured | Log error "ICS feed auth failed: {name}". Skip feed. Admin edits config with correct credentials. |
| F6 | Two feeds have same name (config) | Allowed. Name is display-only. Events stored with feed_name as configured. Duplicate names appear in legend. |
| F7 | Feed URL is valid but returns non-ICS content (JSON, RSS) | Parser fails to find VEVENT. Log warning "ICS parse failed: no VEVENT found". Skip feed. |
| F8 | ICS VEVENT without DTSTART | Skip event. Log warning "Event missing DTSTART: UID={uid}". |
| F9 | ICS VEVENT with STATUS:CANCELLED | Store as normal event. CANCELLED status is metadata only — no special handling for MVP. |
