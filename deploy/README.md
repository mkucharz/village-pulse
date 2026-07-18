# Deployment Guide: village-pulse

## Architecture

```
village-pulse (Go, :9080) ←→ mosquitto (MQTT, :1883)
                              ↑
                              ├── weather-mqtt-bridge (Open-Meteo → MQTT)
                              └── ics-mqtt-bridge (ICS feeds → MQTT)
```

All data flows through MQTT. village-pulse subscribes to topics, caches in memory + SQLite.

## Prerequisites

- Docker + Docker Compose
- Traefik reverse proxy (with Let's Encrypt)
- Domain pointing to server (e.g., `village-pulse.b4ng.link`)

## Quick Start (Manual)

```bash
mkdir -p /opt/village-pulse && cd /opt/village-pulse

# From repo root
cp docker-compose.yml deploy/mosquitto.conf /opt/village-pulse/
cp deploy/village.example.yaml /opt/village-pulse/village.yaml          # edit me
cp deploy/weather-bridge.example.yaml /opt/village-pulse/weather-bridge.yaml  # edit me
cp deploy/ics-bridge.example.yaml /opt/village-pulse/ics-bridge.yaml        # edit me

# Secrets
cat > /opt/village-pulse/.env << EOF
VERSION=latest
ADMIN_PASSWORD=$(openssl rand -hex 8)
SESSION_SECRET=$(openssl rand -hex 16)
CSRF_SECRET=$(openssl rand -hex 16)
EOF

docker compose up -d
```

## GitHub Actions Deploy (Recommended)

### Setup

1. Navigate to repository Settings → Environments → Create `production`
2. Add these secrets to the repo (Settings → Secrets and variables → Actions):

| Secret | Description |
|--------|-------------|
| `TS_AUTHKEY` | Tailscale auth key (`tag:ci`) |
| `DEPLOY_HOST` | Tailscale IP or hostname of target server |
| `DEPLOY_USER` | SSH user (e.g., `root`) |
| `DEPLOY_SSH_KEY` | SSH private key for deploy user |
| `GHCR_PAT` | GitHub PAT with `read:packages` scope |
| `GHCR_USER` | GitHub username for GHCR login |
| `ADMIN_PASSWORD` | village-pulse admin panel password |
| `SESSION_SECRET` | 32-char random string for cookie encryption |
| `CSRF_SECRET` | 32-char random string for CSRF tokens |

3. Run the workflow: Actions → Deploy village-pulse → Run workflow

**Note:** The first deploy creates `/opt/village-pulse/` directory on the target host. Ensure config files (village.yaml, bridge configs) are manually placed on the host before first deploy.

### How It Works

```
Push to main → Build Docker image → Push to ghcr.io/mkucharz/village-pulse
                                    → Tailscale VPN
                                    → SSH to host
                                    → Write .env with secrets
                                    → docker compose pull
                                    → docker compose up -d
                                    → Health check (120s)
                                    → Rollback on failure
```

## Configuration Files

### village.yaml (main dashboard config)

```yaml
village:
  name: "My Village"
  description: "Welcome to our community dashboard"
  latitude: 48.8566
  longitude: 2.3522
  timezone: Europe/Paris
  language: en

mqtt:
  broker: "tcp://mosquitto:1883"
  client_id: "village-pulse"
  topic_prefix: "village/my-village"

weather:
  units: metric
  forecast_days: 7
  secondary_info: humidity

events:
  upcoming_count: 7
  retention_days: 30

energy:
  entities:
    - entity_id: sensor.solar_production_today
      name: "Solar Production"
      unit: kWh
      icon: solar
  freshness_threshold: 10m

alerts:
  admin_password: "${ADMIN_PASSWORD}"

server:
  port: 9080
  host: "0.0.0.0"
  log_level: info
  log_output: both
  log_path: /data/village-pulse.log
  shutdown_timeout: 15s
  session_secret: "${SESSION_SECRET}"
  csrf_secret: "${CSRF_SECRET}"

database:
  path: /data/village-pulse.db
```

**Note:** MQTT broker hostname is `mosquitto` (Docker service name, internal network).
Environment variables (`${VAR}`) are resolved from the `.env` file at container start.

### weather-bridge.yaml

```yaml
village:
  name: "My Village"
  latitude: 48.8566
  longitude: 2.3522
  timezone: Europe/Paris

mqtt:
  broker: "tcp://mosquitto:1883"
  topic_prefix: "village/my-village"

weather:
  units: metric
  forecast_days: 7
  current_interval: 15m
  forecast_interval: 30m
```

### ics-bridge.yaml

```yaml
village:
  name: "My Village"
  timezone: Europe/Paris

mqtt:
  broker: "tcp://mosquitto:1883"
  topic_prefix: "village/my-village"

feeds:
  - url: https://calendar.google.com/calendar/ical/.../basic.ics
    name: "Village Events"
    color: "#3b82f6"

sync:
  interval: 1h
  recurrence_expand_days: 90
```

## Secrets

Village-pulse `.env` file:

```env
VERSION=latest
ADMIN_PASSWORD=your-admin-password
SESSION_SECRET=a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6
CSRF_SECRET=f6e5d4c3b2a1a1b2c3d4e5f6a7b8c9d0
```

Generate secrets:
```bash
openssl rand -hex 16
```

## Volume Layout

```
/data/
├── village-pulse.db     # SQLite database (events, alerts, energy history)
├── village-pulse.log    # Application logs
└── village.yaml         # Village configuration (read-only)
```

## Backups

### Automated (crontab)

```bash
0 3 * * * curl -s -o /backup/village-pulse-$(date +\%Y-\%m-\%d).db \
    -b /tmp/village-session \
    http://localhost:9080/admin/backup
```

### Manual

```bash
# Login first (save session cookie)
curl -c /tmp/village-session \
    -X POST http://localhost:9080/admin/login \
    -d "password=${ADMIN_PASSWORD}"

# Download backup
curl -b /tmp/village-session \
    -o village-pulse-$(date +%Y-%m-%d).db \
    http://localhost:9080/admin/backup
```

## Updates

```bash
cd /opt/village-pulse
docker compose pull
docker compose up -d
```

## Health Check

```bash
curl https://village-pulse.b4ng.link/health
# {"status":"ok","db":"ok","mqtt_connected":true,"weather_last_message":"45s ago",...}
```

## Troubleshooting

| Problem | Check |
|---------|-------|
| No data on dashboard | `docker compose logs mosquitto` — verify MQTT broker is running |
| Weather shows stale | `docker compose logs weather-bridge` — check Open-Meteo connectivity |
| Events not showing | `docker compose logs ics-bridge` — verify ICS feed URLs |
| Admin login fails | Check `ADMIN_PASSWORD` in `.env`, restart container |
| MQTT disconnected | `docker compose logs village-pulse` — look for "mqtt" errors |
| Port conflict | Change `9080:9080` in docker-compose.yml |
