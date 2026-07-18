# API Reference: village-pulse

## MQTT Topics

### Weather

```
Topic: {prefix}/weather/current (QoS 1, retained)
{
  "temperature": 22.5,
  "temperature_unit": "°C",
  "humidity": 56,
  "condition": "partlycloudy",
  "wind_speed": 12.5,
  "wind_speed_unit": "km/h",
  "wind_direction": "SW",
  "wind_bearing": 225,
  "wind_gust_speed": 18.2,
  "apparent_temperature": 24.1,
  "dew_point": 14.3,
  "precipitation": 0,
  "precipitation_unit": "mm",
  "precipitation_probability": 5,
  "pressure": 1013.2,
  "pressure_unit": "hPa",
  "cloud_coverage": 45,
  "visibility": 10,
  "visibility_unit": "km",
  "uv_index": 5,
  "is_daytime": true,
  "timestamp": "2026-07-14T11:00:00Z"
}

Topic: {prefix}/weather/forecast (QoS 1, retained)
{
  "daily": [
    {
      "date": "2026-07-15",
      "condition": "sunny",
      "temperature_high": 28.1,
      "temperature_low": 14.2,
      "precipitation_sum": 0,
      "precipitation_probability_max": 5,
      "wind_speed_max": 15,
      "wind_direction_dominant": "NE",
      "uv_index_max": 8,
      "sunrise": "2026-07-15T05:30:00+02:00",
      "sunset": "2026-07-15T21:15:00+02:00"
    }
  ],
  "hourly": [
    {
      "time": "2026-07-15T00:00:00+02:00",
      "is_daytime": false,
      "condition": "clear-night",
      "temperature": 15.2,
      "humidity": 72,
      "precipitation": 0,
      "precipitation_probability": 0,
      "wind_speed": 8.5,
      "wind_direction": "N",
      "cloud_coverage": 5,
      "uv_index": 0
    }
  ]
}
```

### Events

```
Topic: {prefix}/events/{uid} (QoS 1, retained)
{
  "uid": "abc123@google.com",
  "title": "Village Assembly",
  "description": "Monthly village council meeting. All residents welcome.",
  "location": "Community Hall, Main St 12",
  "start_time": "2026-07-15T19:00:00+02:00",
  "end_time": "2026-07-15T21:00:00+02:00",
  "all_day": false,
  "feed_name": "Village Events",
  "feed_color": "#3b82f6",
  "url": "https://calendar.google.com/event?eid=abc123"
}
```

### Energy

```
Topic: {prefix}/energy/{entity_id} (QoS 1)
{
  "entity_id": "sensor.solar_production_today",
  "value": 42.5,
  "unit": "kWh",
  "timestamp": "2026-07-14T11:05:00+02:00"
}
```

---

## HTTP Endpoints

### Landing

```
GET /
  Returns: Landing page (no config) OR 302 redirect to /dashboard (configured)
```

### Dashboard

```
GET /dashboard
  Returns: Full dashboard HTML with all 4 widgets
  Cache: No (dynamic)
  Partial rendering: per-widget error states. Page always returns 200.
```

### Health

```
GET /health
  Returns: Health status JSON
  Response:
    200: {"status":"ok","db":"ok","mqtt_connected":true,"weather_last_message":"12s ago",...}
    503: {"status":"degraded","db":"ok","mqtt_connected":false,...}
  Checks: DB ping, MQTT connection state, last message timestamps, uptime
```

### Weather

```
GET /weather
  Returns: Weather widget HTML fragment
  Query: type=current|forecast|full, forecast_type=daily|hourly
  Response:
    200: Templ-rendered weather widget
    Stale: cached data with "Updated 12 min ago" when no recent MQTT message

GET /weather/sse
  Returns: SSE stream (pre-rendered HTML)
  Content-Type: text/event-stream
  Events:
    event: weather
    data: <div id="weather-widget">...HTML...</div>
    event: heartbeat
    data:
  Heartbeat: 15s. Reconnect: exponential backoff (HTMX v4).
  Note: HTML fragments, not JSON.

GET /weather/forecast/{type}?format=html
  Returns: Forecast detail HTML
  Path: daily | hourly
```

### Events

```
GET /events
  Returns: Events widget HTML fragment
  Query: view=upcoming|month, month=2026-07
  Response:
    200: Templ-rendered events
    200 empty: "No upcoming events"

GET /events/calendar
  Returns: Full month calendar HTML
  Query: month=2026-07

GET /events/{id}
  Returns: Event detail HTML (drawer content)
  Response:
    200: Event detail card
    404: Not found
```

### Energy

```
GET /energy
  Returns: Energy widget HTML fragment
  Response:
    200: go-daisy StatCardMinimal + StatCardSparkline (from MQTT cache)
    Stale: last values with "Last update: 12 min ago"

GET /energy/history
  Returns: Energy history JSON (for debugging)
  Query: entity_id=..., days=7
  Response:
    200: [{timestamp: "...", value: 42.5, unit: "kWh"}, ...]
```

### Alerts

```
GET /alerts
  Returns: Alerts widget HTML fragment
  Response:
    200: Active alerts sorted by severity + pinned
    200 empty: "No active alerts"
```

### Admin

```
GET /admin/login
  Returns: Login form (password-only, username hardcoded "admin")

POST /admin/login
  Body: password={password}
  Rate limit: 5/min per IP
  Response:
    302 → /admin (success, sets session cookie)
    403: "Invalid credentials"

POST /admin/logout
  Auth: Session
  Response: 302 → / (clears cookie)

GET /admin
  Auth: Session
  Response: Admin dashboard HTML

GET /admin/alerts
  Auth: Session + CSRF
  Response: Alert management table

GET /admin/alerts/new
  Returns: New alert form

POST /admin/alerts
  Auth: Session + CSRF
  Body: title, message, severity, pinned, start_time, expiry_time
  Response:
    201 → /admin/alerts
    422: Validation errors

GET /admin/alerts/{id}/edit
  Returns: Edit form pre-filled

PUT /admin/alerts/{id}
  Auth: Session + CSRF
  Response:
    200 → /admin/alerts
    422: Validation errors

DELETE /admin/alerts/{id}
  Auth: Session + CSRF
  Response: 200 HTMX remove row

GET /admin/backup
  Auth: Session
  Response: 200 application/octet-stream (SQLite file download)
```
