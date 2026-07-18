# village-pulse

Open-source community dashboard for villages. Displays weather, events, emergency alerts,
and energy monitoring on a single responsive page.

**Stack:** Go + [Templ](https://templ.guide) + [HTMX](https://htmx.org) v4 + [daisyUI](https://daisyui.com) 5 + SQLite + MQTT

## Quick Start

```bash
git clone https://github.com/mkucharz/village-pulse
cd village-pulse

# Install tools (Go 1.25+ required)
go install github.com/a-h/templ/cmd/templ@latest
curl -sLO https://github.com/tailwindlabs/tailwindcss/releases/download/v4.3.2/tailwindcss-linux-x64
chmod +x tailwindcss-linux-x64 && sudo mv tailwindcss-linux-x64 /usr/local/bin/tailwindcss

# Build
task build

# Configure
cp deploy/weather-bridge.example.yaml weather-bridge.yaml   # edit me
cp deploy/ics-bridge.example.yaml ics-bridge.yaml           # edit me
# Edit village.yaml with your village details

# Run
./village-pulse serve
# http://localhost:9080
```

## Architecture

```
weather-mqtt-bridge ──┐
ics-mqtt-bridge     ──▶ Mosquitto MQTT ──▶ village-pulse ──▶ Dashboard
HA MQTT integration ──┘
```

All data arrives via MQTT. No HTTP polling, no ICS fetching, no API clients in the dashboard.
Bridges (separate repos) publish to MQTT topics. village-pulse subscribes and caches.

## Deploy

See [`deploy/README.md`](deploy/README.md) for Docker Compose + GitHub Actions deployment guide.

## Documentation

| File | Content |
|------|---------|
| [docs/SPEC.md](docs/SPEC.md) | Full project specification |
| [docs/architecture.md](docs/architecture.md) | Package structure, data flows, patterns |
| [docs/api.md](docs/api.md) | HTTP endpoints, MQTT topics |
| [docs/data-models.md](docs/data-models.md) | SQLite schema, Go structs |
| [docs/pages-mockups.md](docs/pages-mockups.md) | Page layouts and ASCII mockups |
| [docs/ui-ux.md](docs/ui-ux.md) | Component tree, daisyUI mapping, interactions |
| [docs/edge-cases.md](docs/edge-cases.md) | 97 edge cases with expected behavior |
| [docs/mqtt-bridges.md](docs/mqtt-bridges.md) | Bridge service specifications |
| [docs/landing-page.md](docs/landing-page.md) | Product landing page spec |
| [docs/use-cases.md](docs/use-cases.md) | 8 usage scenarios |
| [docs/port-plan.md](docs/port-plan.md) | Home Assistant weather card port plan |

## License

MIT
