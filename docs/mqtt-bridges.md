# MQTT Bridges: village-pulse

## Overview

External services that publish data to Mosquitto MQTT topics consumed by village-pulse.
Each bridge is a standalone Go binary. Separate repositories. All share the same MQTT broker.

```
weather-mqtt-bridge:  Open-Meteo API → WMO mapping → unit conversion → MQTT
ics-mqtt-bridge:      ICS feeds → parse → RRULE expand → MQTT
HA MQTT integration:  HA sensors → MQTT (built-in, no separate bridge)
```

## Installation

```bash
# Mosquitto broker (shared by all bridges)
sudo apt install mosquitto mosquitto-clients

# Verify
mosquitto_sub -t 'village/#' -v
```

---

## 1. weather-mqtt-bridge

### Purpose
Fetches weather data from Open-Meteo API, maps WMO weather codes to HA conditions,
converts units, and publishes to MQTT topics.

### Topics Published

| Topic | QoS | Retained | Interval |
|-------|-----|----------|----------|
| `{prefix}/weather/current` | 1 | ✅ | 15min |
| `{prefix}/weather/forecast` | 1 | ✅ | 30min |

### Config (`weather-bridge.yaml`)

```yaml
village:
  name: "Schönfeld am See"
  latitude: 48.8566
  longitude: 13.4888
  timezone: Europe/Berlin

mqtt:
  broker: "tcp://localhost:1883"
  topic_prefix: "village/schoenfeld"

weather:
  units: metric
  forecast_days: 7
```

### Pseudo-code

```go
func main() {
    cfg := loadConfig()
    mqtt := connectMQTT(cfg.MQTT)

    ticker := time.NewTicker(15 * time.Minute)
    for range ticker.C {
        current := fetchOpenMeteo(cfg, "current")
        current.Condition = wmoToHACondition(current.WeatherCode, current.IsDaytime, current.WindSpeed)
        publishJSON(mqtt, cfg.MQTT.TopicPrefix+"/weather/current", current)

        forecast := fetchOpenMeteo(cfg, "daily+hourly")
        // Map WMO codes, set conditions
        publishJSON(mqtt, cfg.MQTT.TopicPrefix+"/weather/forecast", forecast)
    }
}
```

### Dependencies
- Open-Meteo HTTP client (no API key)
- paho.mqtt.golang
- WMO→HA condition mapper

---

## 2. ics-mqtt-bridge

### Purpose
Fetches ICS calendar feeds, parses VEVENT entries, expands recurring events (RRULE),
and publishes individual events to MQTT.

### Topics Published

| Topic | QoS | Retained | Interval |
|-------|-----|----------|----------|
| `{prefix}/events/{uid}` | 1 | ✅ | 1h (sync) |

### Config (`ics-bridge.yaml`)

```yaml
village:
  name: "Schönfeld am See"
  timezone: Europe/Berlin

mqtt:
  broker: "tcp://localhost:1883"
  topic_prefix: "village/schoenfeld"

feeds:
  - url: https://calendar.google.com/calendar/ical/.../basic.ics
    name: "Village Events"
    color: "#3b82f6"
  - url: https://outlook.office365.com/.../calendar.ics
    name: "Municipal Office"
    color: "#10b981"

sync:
  interval: 1h
  recurrence_expand_days: 90
```

### Pseudo-code

```go
func main() {
    cfg := loadConfig()
    mqtt := connectMQTT(cfg.MQTT)
    parser := ical.NewParser()

    // Initial sync
    sync(cfg, mqtt, parser)

    ticker := time.NewTicker(cfg.Sync.Interval)
    for range ticker.C {
        sync(cfg, mqtt, parser)
    }
}

func sync(cfg Config, mqtt MQTTClient, parser *ical.Parser) {
    for _, feed := range cfg.Feeds {
        resp, err := http.Get(feed.URL)
        // ... parse ICS, expand RRULE, publish each event
        for _, event := range events {
            topic := cfg.MQTT.TopicPrefix + "/events/" + event.UID
            publishJSON(mqtt, topic, event)
        }
    }
}
```

### Dependencies
- arran4/golang-ical (ICS parser + RRULE expansion)
- paho.mqtt.golang

---

## 3. Home Assistant → MQTT (Energy)

### Purpose
HA publishes sensor states directly to MQTT via built-in Mosquitto integration.
No separate bridge binary needed.

### HA Setup

1. **Install Mosquitto broker integration** in HA (Settings → Integrations → Add → MQTT)
2. **Configure MQTT**: broker = `localhost:1883` (or village-pulse MQTT broker)
3. **Add automations** to publish sensor values periodically:

```yaml
# HA configuration.yaml — automation to push energy data
automation:
  - alias: "Push energy data to village MQTT"
    trigger:
      - platform: time_pattern
        minutes: "/5"
    action:
      - service: mqtt.publish
        data:
          topic: "village/schoenfeld/energy/sensor.solar_production_today"
          payload_template: >-
            {
              "entity_id": "sensor.solar_production_today",
              "value": {{ states('sensor.solar_production_today') | float }},
              "unit": "{{ state_attr('sensor.solar_production_today', 'unit_of_measurement') }}",
              "timestamp": "{{ now().isoformat() }}"
            }
```

### HA Sensor Publishing

For each sensor entity in the village `energy.entities` config, add an `mqtt.publish` action in HA.
The automation runs every 5min and publishes current state + unit to the MQTT topic.

---

## MQTT Topic Convention

```
{village}/{domain}/{detail}

Examples:
  village/schoenfeld/weather/current
  village/schoenfeld/weather/forecast
  village/schoenfeld/events/abc123@google.com
  village/schoenfeld/energy/sensor.solar_production_today
  village/neudorf/weather/current
```

Topic prefix is configurable per village. Multiple villages can share one MQTT broker by using different prefixes.

## Retained Messages

Weather current + forecast use **retained** messages. When village-pulse reconnects to MQTT, the broker replays the last retained message, providing instant data without waiting for the next bridge publish cycle.

Energy messages are NOT retained (every push is a new reading — history is stored in SQLite).

Event messages are retained (persist between restarts, replayed on reconnect).

## Testing the Bridges

```bash
# Watch all village topics
mosquitto_sub -t 'village/#' -v

# Publish test weather manually
mosquitto_pub -t 'village/test/weather/current' \
  -m '{"temperature":22.5,"condition":"partlycloudy","timestamp":"2026-07-14T11:00:00Z"}' \
  -r

# Publish test event manually
mosquitto_pub -t 'village/test/events/test-001' \
  -m '{"uid":"test-001","title":"Test Event","start_time":"2026-07-15T19:00:00+02:00","end_time":"2026-07-15T21:00:00+02:00","all_day":false,"feed_name":"Test","feed_color":"#3b82f6"}' \
  -r

# Publish test energy manually
mosquitto_pub -t 'village/test/energy/sensor.solar' \
  -m '{"entity_id":"sensor.solar","value":42.5,"unit":"kWh","timestamp":"2026-07-14T11:05:00+02:00"}'
```
