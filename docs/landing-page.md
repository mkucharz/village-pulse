# Landing Page: village-pulse

## Purpose

Public-facing product page at domain root (`/`). Explains what village-pulse is, shows preview,
and guides visitors through setting up their own instance. Dashboard moves to `/dashboard` for
configured villages.

## URL Routing

| URL | Purpose | Auth |
|-----|---------|------|
| `GET /` | Landing page | Public |
| `GET /dashboard` | Village dashboard (all 4 widgets) | Public |
| `GET /admin/*` | Admin panel | Session |
| `GET /docs` | Setup documentation | Public |

## Landing Page Sections

```
┌──────────────────────────────────────────────────────────────────┐
│                                                                  │
│                🏘️ village-pulse                                  │
│         Open-source community dashboard for villages              │
│                                                                  │
│    [Live Demo →]              [Set Up Your Village →]           │
│                                                                  │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌───────────┐ │
│  │  ☀️        │  │  📅        │  │  ⚠️        │  │  ⚡       │ │
│  │  Weather   │  │  Events    │  │  Alerts    │  │  Energy   │ │
│  │ Open-Meteo │  │ ICS import │  │ Emergency  │  │ HA push   │ │
│  └────────────┘  └────────────┘  └────────────┘  └───────────┘ │
│                                                                  │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ## How It Works                                                 │
│                                                                  │
│  1. Clone the repo                                               │
│  2. Edit village.yaml (name, location, ICS feeds)                │
│  3. Build and deploy (single Go binary)                          │
│  4. Your dashboard is live                                       │
│                                                                  │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ## Dashboard Preview                                            │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │              Schönfeld am See (Example)                    │ │
│  │  ╔══════════════╦══════════════╗                           │ │
│  │  ║   Weather    ║   Events     ║     (static screenshot   │ │
│  │  ║   ☀️ 24°C   ║  🟢 Market  ║      or live demo data)   │ │
│  │  ║              ║  🔵 Meeting ║                           │ │
│  │  ╠══════════════╬══════════════╣                           │ │
│  │  ║   Alerts     ║   Energy    ║                           │ │
│  │  ║  ✅ None     ║  ☀️ 42 kWh ║                           │ │
│  │  ╚══════════════╩══════════════╝                           │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ## Setup in 3 Minutes                                           │
│                                                                  │
│  ```bash                                                         │
│  git clone https://github.com/mkucharz/village-pulse            │
│  cd village-pulse                                                │
│  cp village.example.yaml village.yaml                           │
│  # Edit village.yaml with your village details                   │
│  # Generate secrets: openssl rand -hex 16                        │
│  go build -o village-pulse ./cmd/village-pulse                  │
│  ./village-pulse serve                                           │
│  # Visit http://localhost:9080/dashboard                         │
│  ```                                                             │
│                                                                  │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ## Features                                                     │
│                                                                  │
│  ✅ 100% free, open-source (MIT)                                │
│  ✅ Single Go binary, no external services                      │
│  ✅ SQLite embedded — zero database setup                        │
│  ✅ Responsive — works on phones, tablets, desktops              │
│  ✅ Weather from Open-Meteo (free, no API key)                   │
│  ✅ Events from ICS/iCal feeds (Google, Outlook, iCloud)         │
│  ✅ Emergency alerts with severity levels                         │
│  ✅ Energy monitoring via Home Assistant push                     │
│  ✅ Configurable per village — edit YAML, rebuild, deploy         │
│  ✅ Runs on Raspberry Pi, VPS, or any Linux server                │
│                                                                  │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ## Who Uses This?                                                │
│                                                                  │
│  • Village administrators / councils                              │
│  • Community centers                                              │
│  • Small towns and municipalities                                 │
│  • Neighborhood associations                                      │
│  • Anyone wanting a local information hub                         │
│                                                                  │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ## Ready?                                                        │
│                                                                  │
│  [View Demo Dashboard →]     [Read Setup Guide →]               │
│  [GitHub →]                  [Report Issue →]                    │
│                                                                  │
│  MIT License  ·  Made for communities everywhere                  │
└──────────────────────────────────────────────────────────────────┘
```

## Component Breakdown

```
LandingPage (landing.templ)
├── Hero Section
│   ├── App name + tagline
│   ├── CTA buttons: "Live Demo" → /dashboard, "Set Up" → #setup
│   └── Subtle gradient background
├── Widget Showcase
│   └── 4 feature cards (go-daisy ui.StatCardMinimal for each widget)
│       ├── Weather: icon=cloud-sun, desc="Open-Meteo forecast"
│       ├── Events: icon=calendar, desc="ICS/iCal import"
│       ├── Alerts: icon=alert-triangle, desc="Emergency notifications"
│       └── Energy: icon=zap, desc="HA push integration"
├── How It Works
│   └── Steps (go-daisy ui.Steps + ui.Step)
│       1. Clone → 2. Configure → 3. Build → 4. Deploy
├── Dashboard Preview
│   └── go-daisy ui.MockupBrowser
│       └── Static screenshot rendered with sample data
│           (same Templ components as real dashboard, filled with hardcoded demo data)
├── Setup Instructions
│   └── go-daisy ui.MockupCode
│       └── Shell commands with copy button
├── Feature Grid
│   └── 3-column grid of feature cards with icons + descriptions
├── Audience Section
│   └── Simple list with icons
└── Footer
    └── Links: GitHub, License, Demo, Setup Guide
```

## go-daisy Components Used

| Element | Component | Package |
|---------|-----------|---------|
| Hero | `ui.Hero`, `ui.HeroSection`, `ui.HeroContent`, `ui.HeroBody` | `ui` |
| Feature cards | `ui.Card`, `ui.StatCardMinimal` | `ui` |
| Steps | `ui.Steps`, `ui.Step` | `ui` |
| Code block | `ui.MockupCode`, `ui.MockupCodeLine` | `ui` |
| Browser preview | `ui.MockupBrowser` | `ui` |
| CTA buttons | `ui.Button` | `ui` |
| Badges | `ui.Badge` | `ui` |
| Dividers | `ui.Divider` | `ui` |
| Grid | `ui.DashboardGrid` | `ui` |

## Demo Data

Landing page renders dashboard preview using the same Templ components as the real dashboard,
but with hardcoded sample data. No external API calls needed — static demo.

```go
demoWeather := WeatherEntity{
    State:           "partlycloudy",
    Temperature:     22.5,
    TemperatureUnit: "°C",
    Humidity:        56,
    WindSpeed:       12.5,
    WindSpeedUnit:   "km/h",
    WindDirection:   "SW",
    IsDaytime:       true,
    Forecast: Forecast{
        Daily: []DailyForecast{
            {Date: time.Now().AddDate(0, 0, 1), Condition: "sunny", TemperatureHigh: 28, TemperatureLow: 14},
            {Date: time.Now().AddDate(0, 0, 2), Condition: "cloudy", TemperatureHigh: 24, TemperatureLow: 12},
            {Date: time.Now().AddDate(0, 0, 3), Condition: "rainy", TemperatureHigh: 18, TemperatureLow: 10},
            {Date: time.Now().AddDate(0, 0, 4), Condition: "partlycloudy", TemperatureHigh: 21, TemperatureLow: 13},
            {Date: time.Now().AddDate(0, 0, 5), Condition: "sunny", TemperatureHigh: 26, TemperatureLow: 15},
        },
    },
}

demoEvents := []Event{
    {Title: "Farmers Market", StartTime: ..., Location: "Market Square", FeedColor: "#10b981"},
    {Title: "Village Assembly", StartTime: ..., Location: "Community Hall", FeedColor: "#3b82f6"},
    {Title: "Summer Festival", StartTime: ..., Location: "Park", FeedColor: "#10b981"},
}

demoAlerts := []Alert{} // empty — shows "No active alerts"

demoEnergy := []EnergyEntityData{
    {Name: "Solar Production", Value: 42.5, Unit: "kWh", Icon: "sun"},
    {Name: "Village Consumption", Value: 28.3, Unit: "kWh", Icon: "zap"},
    {Name: "Grid Export", Value: 14.2, Unit: "kWh", Icon: "plug"},
}
```

## HTMX Interactions

```
Landing page is static — no HTMX interactions on page load.

"Live Demo" button:
  <a href="/dashboard"> — full page navigation to demo dashboard
  When no village is configured, /dashboard shows demo data.

"Set Up Your Village" button:
  <a href="#setup"> — smooth scroll to setup instructions section
  (or could open docs/README in new tab)
```

## Config: Demo Mode

When no `village.yaml` is found AND `village.name` is empty, server enters **demo mode**:
- `GET /` → Landing page (marketing)
- `GET /dashboard` → Dashboard with static demo data (no real data sources)
- `GET /admin` → Redirect to landing page (no admin without config)
- `GET /health` → `{"status": "demo", "configured": false}`

When `village.yaml` is present:
- `GET /` → Redirect to `/dashboard`
- `GET /dashboard` → Real dashboard with live data
- `GET /admin` → Admin panel (session required)

## Tasks

| ID | Status | Task | Est |
|----|--------|------|-----|
| T-36 | pending | Landing page Templ: hero, features, steps, setup code, footer | 3h |
| T-37 | pending | Demo data: hardcoded Weather, Events, Alerts, Energy structs | 1h |
| T-38 | pending | Route handler: GET / → landing OR redirect based on config presence | 1h |
| T-39 | pending | Dashboard route: GET /dashboard, demo mode when unconfigured | 1h |
