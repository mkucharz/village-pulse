# Weather Component Port Plan

## Source: Home Assistant Weather Card

- **Backend:** `homeassistant/components/weather/__init__.py` — WeatherEntity base class
- **Frontend card:** `src/panels/lovelace/cards/hui-weather-forecast-card.ts` — 1085 lines LitElement
- **Data layer:** `src/data/weather.ts` — ~500 lines pure TypeScript
- **License:** Apache 2.0

## What to Port

### Data Layer (Go structs)

```go
// WeatherEntity mirrors HA's WeatherEntity state
type WeatherEntity struct {
    State              string          // e.g. "cloudy" (HA condition)
    Temperature        float64         // user unit (C/F)
    TemperatureUnit    string
    Humidity           float64
    Pressure           float64
    PressureUnit       string
    WindSpeed          float64
    WindSpeedUnit      string
    WindBearing        float64         // degrees (0-360)
    WindGustSpeed      float64
    ApparentTemperature float64
    DewPoint           float64
    Precipitation      float64
    PrecipitationUnit  string
    PrecipitationProbability float64
    CloudCoverage      float64
    Visibility         float64
    VisibilityUnit     string
    UVIndex            float64
    Ozone              float64
    Forecast           Forecast

// Note: Use separate DailyForecast and HourlyForecast structs
// (see data-models.md) rather than a flat ForecastItem.
// The port-plan shows HA-style flat model for reference;
// implementation uses the domain-specific split model.

type Forecast struct {
    Daily  []DailyForecast
    Hourly []HourlyForecast
}
}

type ForecastItem struct {
    Time                  time.Time
    IsDaytime             bool
    Condition             string
    CloudCoverage         float64
    Humidity              float64
    Temperature           float64
    TemperatureLow        float64
    ApparentTemperature   float64
    DewPoint              float64
    Precipitation         float64
    PrecipitationProbability float64
    Pressure              float64
    WindSpeed             float64
    WindGustSpeed         float64
    WindDirection         float64
    UVIndex               float64
}
```

### WMO → HA Condition Map

Mapping priority: 1) WMO code lookup, 2) is_day override for clear-night, 3) wind speed override.

`is_day` fallback: if hourly `is_day` field is missing, compute from sunrise/sunset in daily data.
If both missing, assume daytime (solar elevation approximated from time + latitude, or simply: 06:00-20:00 = day).

| WMO | Open-Meteo | HA Condition |
|-----|-----------|-------------|
| 0 | Clear sky | sunny (night: clear-night) |
| 1 | Mainly clear | sunny |
| 2 | Partly cloudy | partlycloudy |
| 3 | Overcast | cloudy |
| 45,48 | Fog / rime fog | fog |
| 51-57,80-81 | Drizzle, showers | rainy |
| 65,67,82 | Heavy rain | pouring |
| 61-63,66 | Rain | rainy |
| 71-77,85-86 | Snow | snowy |
| 95-99 | Thunderstorm | lightning |

Extra conditions from logic:
- **clear-night:** code 0 + !is_daytime
- **windy:** wind > 30 km/h + dry
- **windy-variant:** wind > 30 km/h + cloudy
- **hail:** code 96,99 (if separated from lightning)
- **lightning-rainy:** code 95 + precipitation > 0

### SVG Weather Icons

Port HA's inline SVG templates to Go `templ` components:
- Each condition → Templ component function
- Use daisyUI color tokens instead of HA CSS vars:
  - `--weather-icon-sun-color` → `text-warning`
  - `--weather-icon-rain-color` → `text-info`
  - `--weather-icon-snow-color` → `text-base-content`
  - `--weather-icon-cloud-color` → `text-neutral-content`
- 15 SVGs total (sunny, clear-night, partlycloudy, cloudy, fog,
  rainy, pouring, snowy, snowy-rainy, hail, lightning,
  lightning-rainy, windy, windy-variant, exceptional)

### Unit Conversion

Port HA's unit conversion to Go:
- Temperature: °C ↔ °F
- Wind: km/h, m/s, mph, kn, Beaufort
- Pressure: hPa, mbar, inHg, mmHg
- Precipitation: mm, inch
- Visibility: km, mi

### Wind Direction

Port 16-point compass rose logic (pure math):
```go
func WindBearingToCardinal(degrees float64) string {
    dirs := []string{"N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE",
                     "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"}
    return dirs[int(math.Round(degrees/22.5))%16]
}
```

### Extrema Calculation

From hourly forecast data, calculate daily highs/lows:
```go
func DailyExtrema(hourly []ForecastItem, date time.Time) (high, low float64) {
    // Filter items for date, find max/min temperature
}
```

### Responsive Breakpoints

Port HA's 4 width + 2 height breakpoints to Tailwind:

| HA Breakpoint | Width | Tailwind |
|---------------|-------|----------|
| regular | >375px | `sm:` |
| narrow | 300-375px | default (mobile-first) |
| very-narrow | 180-300px | `xs:` (custom) |
| very-very-narrow | <180px | minimum |
| tall | >235px | default |
| short | <235px | `min-h-[235px]` logic |

## What to Redesign

### LitElement Card → Templ Components

HA card structure maps to Templ components:

```
HA: hui-weather-forecast-card (1085 lines, one component)
  └── render()
        ├── Current conditions section
        │   ├── Weather icon (64x64)
        │   ├── Location name
        │   ├── Temperature (large)
        │   └── Secondary info (humidity/wind/feels-like)
        └── Forecast section
            ├── Forecast slot 1 (icon + high/low + day label)
            ├── Forecast slot 2
            ├── ...
            └── Forecast slot N

Templ redesign (multiple components):
  templ CurrentConditions(current WeatherEntity)
    └── div.grid
        ├── @WeatherIcon(current.State, "lg")
        ├── div.stack
        │   ├── span.text-2xl — location name
        │   ├── span.text-4xl.font-bold — temperature
        │   └── span.text-sm — secondary info
        └──

  templ ForecastRow(forecasts []ForecastItem)
    └── div.flex.overflow-x-auto
        ├── for _, fc := range forecasts
        │   └── @ForecastSlot(fc)
        └──

  templ ForecastSlot(f ForecastItem)
    └── div.flex.flex-col.items-center
        ├── span — day name (Mon/Tue...)
        ├── @WeatherIcon(f.Condition, "sm")
        ├── span.font-bold — high temp
        └── span.text-sm — low temp

  templ WeatherCard(entity WeatherEntity)
    └── div.card.bg-base-200
        ├── @CurrentConditions(entity)
        ├── div.divider
        └── @ForecastRow(entity.Forecast)
```

### WebSocket Subscription → HTMX SSE

HA pattern:
```
Browser ← WebSocket → HA Server
        (real-time push)
```

Go+Templ pattern:
```
Browser ← SSE (server-sent events) → Go Handler
        ↓
        HTMX v4 hx-sse triggers DOM swap
```

Implementation:
```go
// GET /weather/sse — pushes pre-rendered HTML fragments
func weatherSSE(c echo.Context) error {
    c.Response().Header().Set("Content-Type", "text/event-stream")
    ticker := time.NewTicker(30 * time.Second)
    defer ticker.Stop()
    for range ticker.C {
        if c.Request().Context().Err() != nil {
            return nil
        }
        var buf bytes.Buffer
        weatherCard(fetchWeatherCache()).Render(c.Request().Context(), &buf)
        fmt.Fprintf(c.Response(), "event: weather\ndata: %s\n\n", buf.String())
        c.Response().Flush()
    }
    return nil
}
```

HTMX binding (v4 built-in SSE):
```html
<div hx-sse="connect:/weather/sse swap:weather">
  @WeatherCard(currentData)
</div>
```

### HA Theme → daisyUI

| HA CSS Variable | daisyUI Class |
|-----------------|---------------|
| `--primary-text-color` | `text-base-content` |
| `--secondary-text-color` | `text-neutral-content` |
| `--card-background-color` | `bg-base-200` |
| `--divider-color` | `divider` |
| `--weather-icon-sun-color` | `text-warning` |
| `--weather-icon-rain-color` | `text-info` |
| `--weather-icon-snow-color` | `text-base-content` |
| `--weather-icon-cloud-color` | `text-neutral-content` |

### Drag-Scroll → Native Overflow

HA uses `DragScrollController` for forecast row horizontal scrolling.
Replace with CSS `overflow-x: auto` + snap-scroll:

```html
<div class="flex overflow-x-auto snap-x snap-mandatory scrollbar-hide
            -mx-4 px-4">
```

## Data Flow

```
[Open-Meteo API]
       │
       ▼
[Go Weather Client] ──caches──▶ [In-Memory Cache (sync.Map)]
       │                                    │
       ├── GET /weather (full page) ◀───────┘
       │   returns HTML fragment
       │
       └── GET /weather/sse (SSE stream)
           pushes cached data every N seconds
```
