# Pages & Mockups: village-pulse

## Page List

| # | Route | Page | Auth | Templ File |
|---|-------|------|------|------------|
| 1 | `GET /` | Landing page (unconfigured) or redirect (configured) | Public | `landing.templ` |
| 2 | `GET /dashboard` | Dashboard (all 4 widgets, demo or live) | Public | `dashboard.templ` |
| 3 | `GET /events/calendar` | Full month calendar | Public | `calendar.templ` |
| 4 | `GET /events/{id}` | Event detail (drawer) | Public | `event-detail.templ` |
| 5 | `GET /admin/login` | Login form | Public | `admin-login.templ` |
| 6 | `GET /admin` | Admin dashboard | Session | `admin-dashboard.templ` |
| 7 | `GET /admin/alerts` | Alert list | Session | `admin-alerts-list.templ` |
| 8 | `GET /admin/alerts/new` | New alert form | Session | `admin-alert-form.templ` |
| 9 | `GET /admin/alerts/{id}/edit` | Edit alert form | Session | `admin-alert-form.templ` |
| — | `404` | Not found | Public | `error-404.templ` |
| — | `500` | Server error | Public | `error-500.templ` |

---

## 1. Dashboard (`/`)

Desktop — 2×2 grid with village header.
```
┌─────────────────────────────────────────────────────────────────┐
│                     Schönfeld am See                           │  navbar
│              "Community Dashboard — July 2026"                 │  subtitle
├────────────────────────────┬────────────────────────────────────┤
│                            │                                    │
│   ☀️ WEATHER              │   📅 EVENTS                       │
│                            │                                    │
│  ┌──────────────────────┐ │  ┌── Today ─────────────────────┐ │
│  │ ☀️           24°C   │ │  │ 🔵 Village Assembly          │ │
│  │  Sunny        44%    │ │  │    19:00  Community Hall     │ │
│  │  Feels like 26°C    │ │  │ 🟢 Farmers Market            │ │
│  │  Wind 12 km/h (SW)  │ │  │    14:00  Market Square      │ │
│  └──────────────────────┘ │  │ ── This Week ─────────────── │ │
│                            │  │ 🟢 Summer Festival           │ │
│  Mon Tue Wed Thu Fri Sat  │  │    Sat 10:00 — Sun 22:00     │ │
│  ☀️  ☀️  ⛅  ☁️  🌧  ⛈️ │  │ 🔵 Village Council           │ │
│  26  28  24  21  18  20  │  │    Tue 18:00                 │ │
│  14  15  13  12  10  11  │  │ + 2 more events              │ │
│                            │  └──────────────────────────────┘ │
│  [Hourly ▾]  [Daily ●]    │                                    │
│                            │  [View Full Calendar →]           │
├────────────────────────────┼────────────────────────────────────┤
│                            │                                    │
│   ⚠️ ALERTS               │   ⚡ ENERGY                       │
│                            │                                    │
│  🔴 Critical              │  ┌──────────────────────────────┐ │
│  │ Heatwave Warning       │  │ ☀️ Solar Production     42.5 │ │
│  │ Temperatures up to     │  │            kWh  ↑ 12%        │ │
│  │ 38°C expected. Stay    │  │                              │ │
│  │ hydrated. Pool open.   │  │ ⚡ Village Consumption -28.3 │ │
│  │ Expires: Fri 22:00     │  │            kWh  ↓  5%        │ │
│  │                        │  │                              │ │
│  🟡 Warning               │  │ 🔌 Grid Export       +14.2  │ │
│  │ Road Works             │  │            kWh  →  0%        │ │
│  │ Main St closed between │  │                              │ │
│  │ Church and School.     │  │ ─── 7-Day Trend ─────────── │ │
│  │ Until: 18.07.2026      │  │ ▁▃▅▇█▆▄▂                   │ │
│  └────────────────────────┘  │  Updated 2 min ago           │ │
│                              └──────────────────────────────┘ │
│                                                            │
│  ✅ No active alerts      │  ☀️ ⚡ 🔌                       │
│  (when none present)      │                                  │
└────────────────────────────┴────────────────────────────────────┘
│                     Powered by village-pulse                    │  footer
└─────────────────────────────────────────────────────────────────┘
```

Mobile — stacked single column.
```
┌──────────────────────┐
│  Schönfeld am See    │
│  "Dashboard"        │
├──────────────────────┤
│                      │
│  ☀️ WEATHER         │
│  ☀️ 24°C  44%      │
│  Wind 12 km/h (SW)  │
│  Mon Tue Wed Thu..  │
│  ☀️ ☀️ ⛅ ☁️ 🌧   │
│  26 28 24 21 18     │
│  14 15 13 12 10     │
│                      │
├──────────────────────┤
│                      │
│  ⚠️ ALERTS          │
│  🔴 Heatwave        │
│  🟡 Road Works      │
│                      │
├──────────────────────┤
│                      │
│  📅 EVENTS          │
│  🔵 Assembly 19:00  │
│  🟢 Market 14:00    │
│  [Calendar →]       │
│                      │
├──────────────────────┤
│                      │
│  ⚡ ENERGY          │
│  ☀️ Solar  42.5 kWh│
│  ⚡ Vlg   -28.3 kWh │
│  🔌 Grid  +14.2 kWh │
│  ▁▃▅▇█▆▄▂         │
│                      │
└──────────────────────┘
```

### Component Breakdown

```
Layout (layout.templ)
├── Navbar: daisyUI navbar, light theme
│   ├── Logo/name: "village-pulse" + icon
│   └── (Admin link if authed)
├── Main content
│   └── DashboardGrid (dashboard.templ)
│       ├── WeatherCard (weather.templ) — card bg-base-200 shadow-sm
│       │   ├── Header: "☀️ WEATHER" + [Hourly|Daily] toggle (joined buttons)
│       │   ├── CurrentConditions
│       │   │   ├── @WeatherIcon("sunny", "lg") — go-daisy SVG icon
│       │   │   ├── .stat-value: "24°C" (text-4xl font-bold)
│       │   │   ├── .stat-desc: "Sunny" (condition text)
│       │   │   └── .stat-desc: "Feels like 26°C" (secondary info)
│       │   ├── .divider
│       │   └── ForecastRow
│       │       └── .join .join-horizontal
│       │           └── ForecastItem × N
│       │               ├── .stat-title: "Mon"
│       │               ├── @WeatherIcon("sunny", "sm")
│       │               ├── .stat-value: "26°"
│       │               └── .stat-desc: "14°"
│       │
│       ├── EventsCard (events.templ) — card bg-base-200 shadow-sm
│       │   ├── Header: "📅 EVENTS"
│       │   ├── Section: "Today"
│       │   │   └── go-daisy timeline items
│       │   │       └── EventItem
│       │   │           ├── color-dot (feed color)
│       │   │           ├── .font-semibold: title
│       │   │           ├── .text-sm: time
│       │   │           └── .text-xs: location (if set)
│       │   ├── Section: "This Week"
│       │   │   └── EventItem × N
│       │   └── Footer
│       │       └── .btn .btn-ghost .btn-sm: "View Full Calendar →"
│       │           hx-get="/events/calendar" hx-target="body" hx-swap="innerHTML"
│       │
│       ├── AlertsCard (alerts.templ) — card bg-base-200 shadow-sm
│       │   ├── Header: "⚠️ ALERTS"
│       │   ├── AlertBanner × N (go-daisy alert component)
│       │   │   ├── alert-info|warning|error (severity-mapped)
│       │   │   ├── .flex .gap-3
│       │   │   │   ├── severity icon (🔴🟠🟡🔵)
│       │   │   │   └── .flex-1
│       │   │   │       ├── .font-bold: title
│       │   │   │       ├── .text-sm: message
│       │   │   │       └── .text-xs .opacity-70: expiry time
│       │   │   └── Pinned badge (if pinned)
│       │   └── EmptyState (when no alerts)
│       │       └── .alert .alert-success
│       │           └── "✅ No active alerts"
│       │
│       └── EnergyCard (energy.templ) — card bg-base-200 shadow-sm
│           ├── Header: "⚡ ENERGY"
│           ├── go-daisy StatCardMinimal × N
│           │   ├── icon-corner variant
│           │   ├── label + value + unit
│           │   └── trend badge (↑/↓ + percentage)
│           ├── .divider
│           ├── go-daisy StatCardSparkline
│           │   ├── label: "7-Day Trend"
│           │   ├── Data: []int from hourly history
│           │   ├── stroke-primary, fill-primary/20
│           │   └── SVG polyline
│           └── .text-xs .opacity-60: "Updated 2 min ago"
│               (or "Updated 12 min ago (HA unavailable)" with warning color)
│
└── Footer
    ├── .text-sm .text-center .opacity-50: "Powered by village-pulse"
    └── .text-xs: GitHub link
```

### daisyUI + go-daisy Components Used

| Element | daisyUI | go-daisy |
|---------|---------|----------|
| Widget container | `card bg-base-200 shadow-sm` | — |
| Weather temp | `stat-value`, `stat-title`, `stat-desc` | — |
| Forecast row | `join join-horizontal` | — |
| Events list | `timeline` (or `list`) | — |
| Calendar month | `table table-sm` | — |
| Alerts | `alert` + `alert-error/warning/info` | `ui.Alert` |
| Alert OK state | `alert alert-success` | `ui.Alert` |
| Energy stats | `card` + `flex` | `ui.StatCardMinimal` |
| Energy sparkline | Custom SVG | `ui.StatCardSparkline` |
| Buttons | `btn btn-ghost btn-sm` | `ui.Button` |
| Badges (severity) | `badge badge-error` etc. | `ui.Badge` |
| Dividers | `divider` | — |
| Loading | `loading loading-spinner` | `ui.Loader` |

### HTMX Interactions

```
Page load:
  GET / → full dashboard HTML

Weather auto-refresh (SSE, HTMX v4 built-in):
  hx-sse="connect:/weather/sse swap:weather"
  hx-target="#weather-widget"
  → weather widget HTML replaced every N seconds

Energy auto-refresh (polling):
  hx-get="/energy"
  hx-trigger="every 300s"
  hx-target="#energy-widget"
  hx-swap="outerHTML"
  → energy widget polls every 5 minutes

Calendar navigation:
  hx-get="/events/calendar?month=2026-08"
  hx-target="body"
  hx-swap="innerHTML"
  → full page replaces with calendar view

Calendar → back to dashboard:
  hx-get="/"
  hx-target="body"
  hx-swap="innerHTML"

Alert dismiss (admin):
  hx-delete="/admin/alerts/5"
  hx-target="closest .alert"
  hx-swap="delete"
  hx-confirm="Delete this alert?"
```

### Responsive Breakpoints

| Breakpoint | Width | Layout |
|-----------|-------|--------|
| Default (mobile) | <768px | Single column: Weather → Alerts → Events → Energy |
| `md:` (≥768px) | 768px+ | 2×2 grid: Weather (TL), Events (TR), Alerts (BL), Energy (BR) |
| `lg:` (≥1024px) | 1024px+ | Wider cards, 7 forecast slots (vs 5 on mobile) |
| `xl:` (≥1280px) | 1280px+ | Max-width container centered |

```html
<div class="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-6
            max-w-6xl mx-auto px-4 py-6">
```

---

## 2. Full Month Calendar (`/events/calendar`)

```
┌─────────────────────────────────────────────────────────────┐
│                     Schönfeld am See                       │
│              "Community Dashboard — July 2026"             │
├─────────────────────────────────────────────────────────────┤
│  [← Dashboard]                                             │
│                                                             │
│  ◀ June                          July 2026           August ▶│
│                                                             │
│  ┌──────┬──────┬──────┬──────┬──────┬──────┬──────┐       │
│  │ Mon  │ Tue  │ Wed  │ Thu  │ Fri  │ Sat  │ Sun  │       │
│  ├──────┼──────┼──────┼──────┼──────┼──────┼──────┤       │
│  │      │      │  1   │  2   │  3   │  4   │  5   │       │
│  │      │      │      │      │      │ 🟢🎵 │      │       │
│  ├──────┼──────┼──────┼──────┼──────┼──────┼──────┤       │
│  │  6   │  7   │  8   │  9   │ 10   │ 11   │ 12   │       │
│  │      │ 🔵📋 │      │      │      │ 🟢🏖️ │      │       │
│  │      │      │      │      │      │ 🎵    │      │       │
│  ├──────┼──────┼──────┼──────┼──────┼──────┼──────┤       │
│  │ 13   │ 14   │ 15   │ 16   │ 17   │ 18   │ 19   │       │
│  │      │      │      │      │      │ 🔴🌡️ │      │       │
│  ├──────┼──────┼──────┼──────┼──────┼──────┼──────┤       │
│  │ 20   │ 21   │ 22   │ 23   │ 24   │ 25   │ 26   │       │
│  │      │      │      │      │      │      │      │       │
│  ├──────┼──────┼──────┼──────┼──────┼──────┼──────┤       │
│  │ 27   │ 28   │ 29   │ 30   │ 31   │      │      │       │
│  │      │      │      │      │      │      │      │       │
│  └──────┴──────┴──────┴──────┴──────┴──────┴──────┘       │
│                                                             │
│  Legend: 🟢 Village Events  🔵 Municipal  🔴 Alerts       │
└─────────────────────────────────────────────────────────────┘
```

### Calendar Day Cell Behavior

- Max 4 event dots per cell in grid. 5+ → show `+N` badge.
- Click cell → expand inline list of that day's events (HTMX `hx-get`).
- Multi-day events: color dot on every day spanned (no repetition in count).
- Today's cell: `bg-primary/10` highlight.
- Recurring events: expanded instances shown as separate dots.

### Calendar HTMX

```
Month navigation:
  hx-get="/events/calendar?month=2026-08"
  hx-target="#calendar-body"
  hx-swap="outerHTML"
  → month grid swaps, navigation updates

Day click (expand):
  hx-get="/events?view=day&date=2026-07-11"
  hx-target="closest td"
  hx-swap="afterend"
  → inline event list appears below the day cell

Event click:
  hx-get="/events/{id}"
  hx-target="#event-detail"
  hx-swap="innerHTML"
  → modal/drawer with event details
```

---

## 3. Event Detail (`/events/{id}`)

Drawer or modal overlay (HTMX) — not full page navigation.

```
┌──────────────────────────────────────┐
│  × Close                             │
├──────────────────────────────────────┤
│                                      │
│  🟢 Village Events                   │  feed source + color
│                                      │
│  Summer Festival                     │  title (text-xl font-bold)
│                                      │
│  📅 Saturday, July 11 — Sunday,     │
│     July 12, 2026                    │  date (multi-day)
│     ⏰ 10:00 — 22:00 (all day)      │  time or "all day"
│                                      │
│  📍 Market Square, Schönfeld        │  location (if set)
│                                      │
│  ───────────────────────────────────│
│                                      │
│  Join us for the annual summer       │
│  festival! Live music, local food    │  description
│  stalls, kids' activities, and       │
│  the traditional bonfire.            │
│                                      │
│  More info: schoenfeld-am-see.de     │
│                                      │
│  ───────────────────────────────────│
│                                      │
│  [Add to Calendar]  [Open URL →]    │  actions
│                                      │
└──────────────────────────────────────┘
```

Implemented as go-daisy `ui.Drawer` (right side, `DrawerRight`). Opened via HTMX `hx-get="/events/{id}"` with `hx-target="#drawer-container"`. Drawer closes via X button or backdrop click.

---

## 4. Admin Login (`/admin/login`)

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│                         🔒                                  │
│                                                             │
│                    Village Pulse Admin                       │
│              Sign in to manage your dashboard                │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐ │
│  │                                                       │ │
│  │  Username: [________________________]                 │ │
│  │                                                       │ │
│  │  Password: [________________________]  👁             │ │  (👁 toggles visibility, no JS needed: checkbox swap trick)
│  │                                                       │
│  │                                                       │ │
│  │  [Sign In]                                            │ │
│  │                                                       │ │
│  │  Invalid credentials                                  │ │
│  │  (error message, shown on failed login)               │ │
│  └───────────────────────────────────────────────────────┘ │
│                                                             │
│  ← Back to Dashboard                                       │
└────────────────────────────────────────────────────────────┘
```

Components: go-daisy `ui.Card`, `form.FormInput`, `form.PasswordField`, `form.FormActions`.
HTMX: `hx-post="/admin/login"` with `hx-target` for inline error display. On success → redirect to `/admin`.

---

## 5. Admin Dashboard (`/admin`)

```
┌─────────────────────────────────────────────────────────────┐
│  Village Pulse > Admin                                      │  breadcrumb (go-daisy nav.Breadcrumbs)
├─────────────────────────────────────────────────────────────┤
│                     Admin Panel                            │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────┐  ┌─────────────────────┐         │
│  │                     │  │                     │         │
│  │   ⚠️ Alerts        │  │   💾 Backup        │         │
│  │   3 active          │  │   Download database │         │
│  │   1 pinned          │  │   42 KB             │         │
│  │   [Manage →]       │  │   [Download →]      │         │
│  │                     │  │                     │         │
│  └─────────────────────┘  └─────────────────────┘         │
│                                                             │
│  ┌─────────────────────┐  ┌─────────────────────┐         │
│  │                     │  │                     │         │
│  │   📊 System        │  │   🔌 Integrations  │         │
│  │   Uptime: 3h 22m   │  │   Energy: OK (4m ago)│         │
│  │   DB: OK            │  │   Weather: OK        │         │
│  │   [Health →]       │  │   2 ICS feeds OK     │         │
│  │                     │  │                     │         │
│  └─────────────────────┘  └─────────────────────┘         │
│                                                             │
│  [Back to Dashboard]  [Logout]                             │
└─────────────────────────────────────────────────────────────┘
```

Components: go-daisy `nav.Breadcrumbs`, `ui.Card`, `ui.Button`, `ui.Badge`.
Admin nav: breadcrumb top bar + logout button (clears session cookie → redirects to `/`).

---

## 6. Alert List (`/admin/alerts`)

```
┌─────────────────────────────────────────────────────────────┐
│  Village Pulse > Admin > Alerts           [+ New Alert]     │  breadcrumb + action button
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌───────────────────────────────────────────────────────┐ │
│  │ 🔴 Critical  🔒 Pinned                    [Edit][Del]│ │
│  │ Heatwave Warning                                      │ │
│  │ Temperatures up to 38°C. Stay hydrated.              │ │
│  │ Active now → Expires: Fri 22:00                      │ │
│  └───────────────────────────────────────────────────────┘ │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐ │
│  │ 🟡 Warning                               [Edit][Del]│ │
│  │ Road Works                                            │ │
│  │ Main St closed between Church and School.            │ │
│  │ Active now → Expires: 18.07.2026                     │ │
│  └───────────────────────────────────────────────────────┘ │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐ │
│  │ 🔵 Info (inactive)                        [Edit][Del]│ │
│  │ Swimming Pool Open                                    │ │
│  │ Pool is open for the season.                          │ │
│  │ Expired: 12.06.2026                                   │ │
│  └───────────────────────────────────────────────────────┘ │
│                                                             │
│  No alerts yet. [+ Create First Alert]                     │
│  (empty state)                                              │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

All CRUD via HTMX:
- New/Edit: inline form appears below row or as modal
- Delete: `hx-delete` with `hx-confirm`, row removed with swap animation
- Toggle active: inline `hx-put` for quick deactivate/reactivate

---

## 7. Alert Form (`/admin/alerts/new` or `/edit`)

```
┌─────────────────────────────────────────────────────────────┐
│  Admin > Alerts > New Alert                                │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌───────────────────────────────────────────────────────┐ │
│  │                                                       │ │
│  │  Title: [___________________________]                 │ │
│  │                                                       │ │
│  │  Message:                                             │ │
│  │  [___________________________________________        │ │
│  │   ___________________________________________        │ │
│  │   ___________________________________________]       │ │
│  │                                                       │ │
│  │  Severity: [▾ Info    ]                              │ │
│  │             Info                                      │ │
│  │             Warning                                   │ │
│  │             Severe                                    │ │
│  │             Critical                                  │ │
│  │                                                       │ │
│  │  ☐ Pinned (always shown on top)                      │ │
│  │                                                       │ │
│  │  Start:  [2026-07-14] [12:00]  (now)                │ │
│  │                                                       │ │
│  │  Expiry: [2026-07-15] [20:00]  ☐ No expiry          │ │
│  │                                                       │ │
│  │  [Cancel]  [Save Alert]                              │ │
│  │                                                       │ │
│  └───────────────────────────────────────────────────────┘ │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

daisyUI form components: `form-control`, `label`, `input`, `textarea`, `select`, `checkbox`, `btn`.

HTMX: `POST /admin/alerts` with `hx-post`, validation errors returned as HTMX partial, success redirects.

---

## 8. Error Pages

### 404 Not Found

```
┌─────────────────────────────────────────────┐
│                                             │
│                   🔍                        │
│                                             │
│              Page Not Found                  │
│        The page you're looking for          │
│          doesn't exist here.                │
│                                             │
│           [Back to Dashboard]               │
│                                             │
└─────────────────────────────────────────────┘
```

### 500 Server Error

```
┌─────────────────────────────────────────────┐
│                                             │
│                   ⚠️                        │
│                                             │
│           Something went wrong               │
│        We're having trouble loading          │
│        this page. Please try again.          │
│                                             │
│           [Back to Dashboard]                │
│                                             │
└─────────────────────────────────────────────┘
```

Both use go-daisy card components with centered layout, daisyUI button. Implemented via `Echo.HTTPErrorHandler` rendering Templ component.

### Loading States

```
HTMX request in progress:
┌──────────────────────────────┐
│                              │
│          ⏳                   │
│       Loading...             │
│                              │
└──────────────────────────────┘
```

go-daisy `ui.Loader` component, shown via `hx-indicator` attribute.

### Empty States

```
Weather unavailable:
┌──────────────────────────────┐
│  ☁️                        │
│  Weather data unavailable    │
│  Showing cached data from    │
│  12 minutes ago              │
│  [Retry]                     │
└──────────────────────────────┘

No upcoming events:
┌──────────────────────────────┐
│  📅                        │
│  No upcoming events          │
│  Check back later or         │
│  view the full calendar.     │
│  [View Calendar]             │
└──────────────────────────────┘

No active alerts:
┌──────────────────────────────┐
│  ✅                        │
│  No active alerts            │
│  Everything is normal.       │
└──────────────────────────────┘

Energy unavailable:
┌──────────────────────────────┐
│  ⚡                        │
│  Energy data unavailable     │
│  Home Assistant not          │
│  reachable.                  │
│  Last updated: 12 min ago    │
└──────────────────────────────┘
```

---

## HTMX Interaction Flow Summary

```
┌────────────────────────────────────────────────────────┐
│                    INITIAL LOAD                         │
│  GET /                                                  │
│  → Server fetches weather + energy caches               │
│  → Queries SQLite for events + alerts                   │
│  → Renders full Dashboard via Templ                     │
│  → HTML returned                                        │
└────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────┐
│                    LIVE UPDATES                         │
│  Weather: SSE push every refresh_interval               │
│    hx-sse="connect:/weather/sse swap:weather"           │
│    → event: weather → swap #weather-widget              │
│                                                        │
│  Energy: HTMX polling every refresh_interval            │
│    hx-get="/energy" hx-trigger="every 300s"            │
│    → swap #energy-widget                                │
└────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────┐
│                    NAVIGATION                           │
│  Calendar: hx-get="/events/calendar?month=..."         │
│    → body swap (full page navigation)                   │
│                                                        │
│  Back: hx-get="/" → body swap                          │
│                                                        │
│  Admin: standard links → full page load (auth required) │
│    (within admin, HTMX for CRUD operations)             │
└────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────┐
│                    STATES                               │
│  Loading: hx-indicator shows spinner overlay            │
│  Error:   server returns error HTML fragment            │
│  Stale:   "Updated X min ago" timestamp                 │
│  Empty:   friendly state messages                       │
│  Offline: error + last cached data shown                │
└────────────────────────────────────────────────────────┘
```
