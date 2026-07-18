# UI/UX: village-pulse

## Dashboard Layout

### Desktop (≥768px) — 2x2 Grid

```
┌─────────────────────────────────────────────────────┐
│                    Village Name                    │  header
│              "Community Dashboard"                │  subtitle
├─────────────────────┬───────────────────────────────┤
│                     │                               │
│    WEATHER          │     EVENTS                   │
│                     │                               │
│  ┌───────────────┐  │  ┌──── Today ────────────┐  │
│  │ ☁️  22°C   56%│  │  │ 🔵 Village Meeting      │  │
│  │   Partly      │  │  │    09:00 Town Hall      │  │
│  │   Cloudy      │  │  │ 🟢 Farmers Market       │  │
│  └───────────────┘  │  │    14:00 Square          │  │
│                     │  │ ─── This Week ───────── │  │
│  Mon Tue Wed Thu Fri│  │  │ 🟢 Summer Fest        │  │
│  ☁️  🌧  ☀️  ⛅  🌧 │  │  │    Sat 10:00          │  │
│  22  18  25  20  17│  │  └────────────────────────┘  │
│  14  12  15  13  11│  │                               │
│                     │  │  [View Calendar →]           │
│                     │                               │
├─────────────────────┼───────────────────────────────┤
│                     │                               │
│   ALERTS            │    ENERGY                    │
│                     │                               │
│  🔴 Storm Warning   │  ☀️ Solar: 42.5 kWh         │
│     Heavy rain      │  ⚡ Vlg:  -28.3 kWh          │
│     until 22:00     │  🔌 Grid: +14.2 kWh          │
│                     │                               │
│  🔶 Road Closure    │  ─── Today ──────────────   │
│     Main St         │  ▁▂▃▄▅▆▇█▇▆▅▄▃▂▁          │
│     15.07 - 18.07   │  (sparkline)                  │
│                     │                               │
└─────────────────────┴───────────────────────────────┘
```

### Mobile (<768px) — Single Column Stacked

```
┌─────────────────┐
│  Village Name   │
│  "Dashboard"    │
├─────────────────┤
│                 │
│   WEATHER       │
│   ☁️ 22°C 56%  │
│   Mon Tue Wed..│
│                 │
├─────────────────┤
│                 │
│   ALERTS (top) │
│   🔴 Storm... │
│   🔶 Road...  │
│                 │
├─────────────────┤
│                 │
│   EVENTS        │
│   🔵 Meeting..│
│   🟢 Market.. │
│   [Calendar]  │
│                 │
├─────────────────┤
│                 │
│   ENERGY        │
│   ☀️ 42.5 kWh │
│   ⚡ -28.3 kWh│
│   ▁▂▃▄▅▆▇     │
│                 │
└─────────────────┘
```

## Component Tree

```
Layout (layout.templ)
├── Header
│   ├── Village name (h1)
│   └── Description (subtitle)
├── Dashboard Grid (dashboard.templ)
│   ├── WeatherCard (weather.templ)
│   │   ├── CurrentConditions
│   │   │   ├── WeatherIcon (condition, size="lg")
│   │   │   ├── Location name
│   │   │   ├── Temperature (large)
│   │   │   └── SecondaryInfo (humidity / wind / feels-like)
│   │   └── ForecastRow
│   │       ├── ForecastSlot × N (day, icon, high/low)
│   │       └── Scroll arrows (overflow-x-auto)
│   │
│   ├── EventsCard (events.templ)
│   │   ├── Section: Today
│   │   │   └── EventItem × N (color dot, title, time, location)
│   │   ├── Section: This Week
│   │   │   └── EventItem × N
│   │   └── Footer: [View Full Calendar →] (hx-get="/events/calendar")
│   │
│   ├── AlertsCard (alerts.templ)
│   │   ├── AlertBanner × N (severity color, icon, title, message, expiry)
│   │   │   ├── Severity icon + title
│   │   │   ├── Message body
│   │   │   └── Expiry countdown / "permanent"
│   │   └── EmptyState: "No active alerts" (green, checkmark)
│   │
│   └── EnergyCard (energy.templ)
│       ├── EntityRow × N (icon, name, value + unit)
│       ├── Sparkline (▁▂▃▄▅▆▇ simple bar chart)
│       └── Timestamp: "updated 2 min ago"
│
└── Footer
    └── "Powered by village-pulse" + source link
```

## daisyUI + go-daisy Components Used

| Widget | daisyUI CSS | go-daisy Component | Import |
|--------|------------|-------------------|--------|
| Dashboard grid | `card bg-base-200 shadow-sm` | `ui.Card`, `ui.DashboardGrid` | `ui` |
| Weather temp | `stat-value`, `stat-title` | (raw daisyUI + go-daisy `ui.Card`) | `ui` |
| Weather forecast | `join join-horizontal` | `ui.Join` | `ui` |
| Alerts | `alert` | `ui.Alert(typ, icon, message)` | `ui` |
| Alert severity | `badge` | `ui.Badge(props)` | `ui` |
| Events list | `list` | `ui.List(props)`, `ui.ListRow(props)` | `ui` |
| Calendar month | `table table-sm table-zebra` | `table.TableWithProps(props)`, `table.TableRow`, `table.TableCell` | `table` |
| Calendar nav | `btn-group` | `ui.Button` + `ui.Join` | `ui` |
| Energy stats | `stat` | `ui.StatCardMinimal(props)` | `ui` |
| Energy sparkline | SVG polyline | `ui.StatCardSparkline(props)` | `ui` |
| Admin forms | `form-control`, `input`, `textarea`, `select`, `btn` | `form.TextInput`, `form.TextareaInput`, `form.SelectInput`, `form.CheckboxInput`, `form.DatePicker`, `form.FormActions` | `form` |
| Admin table | `table` | `table.TableWithProps`, `table.TableHeader` (sortable), `table.TableCardWrapper/Header/Footer` | `table` |
| Admin nav | `breadcrumbs` | `nav.Breadcrumbs(items)`, `nav.PageHeader(steps)` | `nav` |
| Event detail | `drawer` | `ui.Drawer(id, side, content, sidebar)` | `ui` |
| Login form | `card`, `form-control` | `ui.Card`, `form.FormInput`, `form.PasswordField` | `ui`, `form` |
| Toast/notifications | `toast` | `ui.Toast`, `ui.ToastOOB` (HTMX OOB swap) | `ui` |
| Loading states | `loading loading-spinner` | `ui.Loader(variant)`, `ui.HTMXIndicator(id)` | `ui` |
| Empty states | — | `ui.Empty(icon, title, description)` | `ui` |
| Error pages | `card` | `ui.Empty` + `ui.Card` + `ui.Button` | `ui` |
| Skeleton loading | `skeleton` | `ui.Skeleton(classes)`, `ui.SkeletonDashboard(blocks)` | `ui` |
| Breadcrumbs | `breadcrumbs` | `nav.Breadcrumbs(items)` | `nav` |
| Dividers | `divider` | `ui.Divider(color, vertical)` | `ui` |

## daisyUI Theme

```css
@import "tailwindcss";
@plugin "daisyui" {
  themes: light --default, dark --prefersdark;
}
```

Default: `light` theme with village-chosen accent color.
Dark mode: auto via `prefers-color-scheme`.

### Color Mapping

| Purpose | daisyUI Token | Tailwind Class |
|---------|--------------|----------------|
| Primary accent | `primary` | `text-primary`, `bg-primary` |
| Success / green | `success` | `text-success` |
| Warning / yellow | `warning` | `text-warning` |
| Error / red | `error` | `text-error` |
| Info / blue | `info` | `text-info` |
| Page background | `base-100` | `bg-base-100` |
| Card background | `base-200` | `bg-base-200` |
| Text | `base-content` | `text-base-content` |
| Weather sun | `warning` | `text-warning` (yellow) |
| Weather rain | `info` | `text-info` (blue) |
| Weather snow | `base-content` | `text-base-content` |
| Weather cloud | `neutral-content` | `text-neutral-content` |

## HTMX Interactions

```
Page load:
  GET / → full dashboard HTML

Weather SSE (auto-refresh, pushes pre-rendered HTML, HTMX v4 built-in):
  hx-sse="connect:/weather/sse swap:weather"
  → weather widget HTML replaced in-place every N seconds

Calendar navigation:
  hx-get="/events/calendar?month=2026-07"
  hx-target="#calendar-grid"
  hx-swap="outerHTML"
  → month grid swapped without full page reload

Alert dismiss (admin):
  hx-delete="/admin/alerts/5"
  hx-target="closest li"
  hx-swap="delete"
  hx-confirm="Delete this alert?"
  → alert row removed from table

Energy refresh:
  hx-get="/energy"
  hx-trigger="every 300s"
  hx-target="#energy-widget"
  hx-swap="outerHTML"
  → energy widget polls every 5 minutes
```

## Responsive Breakpoints

| Breakpoint | Width | Layout |
|-----------|-------|--------|
| Default (mobile) | <768px | Single column: Weather → Alerts → Events → Energy |
| `md:` | ≥768px | 2-column grid: weather+alerts left, events+energy right |
| `lg:` | ≥1024px | Wider cards, more forecast slots (7 vs 5) |
| `xl:` | ≥1280px | Max width container, centered |

```html
<!-- Dashboard grid -->
<div class="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-6
            max-w-6xl mx-auto px-4 py-6">
  <div class="card bg-base-200 shadow-sm">
    <!-- Weather widget -->
  </div>
  <div class="card bg-base-200 shadow-sm">
    <!-- Events widget -->
  </div>
  <div class="card bg-base-200 shadow-sm">
    <!-- Alerts widget -->
  </div>
  <div class="card bg-base-200 shadow-sm">
    <!-- Energy widget -->
  </div>
</div>
```

## States

| State | Visual |
|-------|--------|
| Loading | Skeleton cards with `animate-pulse`, semi-transparent |
| Empty | Friendly message + icon ("No upcoming events 🎉") |
| Error | Subtle warning card, serve cached data if available |
| Stale data | "Updated 12 min ago" timestamp, no visual warning |
| Refreshing | Small spinner in widget header while HTMX fetches |
| Offline | Weather/energy show last cached data + "Last updated" timestamp |
