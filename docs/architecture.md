# Architecture: village-pulse

## Data Flow (MQTT)

```
┌──────────┐   ┌──────────┐   ┌──────────┐
│ Open-Meteo│   │ICS Feeds │   │ Home Asst│
└────┬─────┘   └────┬─────┘   └────┬─────┘
     │              │              │
     ▼              ▼              ▼
┌──────────┐  ┌──────────┐  ┌──────────┐
│ weather- │  │ ics-mqtt │  │ HA MQTT  │
│ mqtt-    │  │ -bridge  │  │ integrat │
│ bridge   │  │          │  │          │
└────┬─────┘  └────┬─────┘  └────┬─────┘
     │              │              │
     ▼              ▼              ▼
┌────────────────────────────────────────┐
│          Mosquitto MQTT Broker         │
│                                        │
│  village/{id}/weather/current          │
│  village/{id}/weather/forecast         │
│  village/{id}/events/{uid}            │
│  village/{id}/energy/{entity_id}      │
└───────────────────┬────────────────────┘
                    │ subscribe QoS 1
                    ▼
┌────────────────────────────────────────┐
│            village-pulse               │
│                                        │
│  MQTT Client ──▶ In-Memory Cache       │
│                   │                    │
│                   ├──▶ Templ Dashboard │
│                   ├──▶ SSE Stream      │
│                   └──▶ SQLite (events, │
│                          energy hist)  │
│                                        │
│  Alert CRUD ──▶ SQLite                 │
└────────────────────────────────────────┘
```

## Package Structure

```
village-pulse/
├── cmd/
│   └── village-pulse/
│       └── main.go
├── internal/
│   ├── server/
│   │   ├── server.go
│   │   ├── routes.go
│   │   └── middleware.go
│   ├── config/
│   │   ├── config.go
│   │   ├── validate.go
│   │   └── default.go
│   ├── mqtt/
│   │   ├── client.go              # MQTT connection, connect/subscribe/reconnect
│   │   └── handler.go             # Topic routing → domain handlers
│   ├── weather/
│   │   ├── cache.go               # In-memory weather cache
│   │   ├── handler.go             # HTTP handlers (/weather, /weather/sse)
│   │   ├── types.go               # WeatherEntity, Forecast structs
│   │   ├── weather.templ          # Weather card + forecast row
│   │   └── icons/
│   │       ├── icons.templ        # HA SVG icons
│   │       └── icons_templ.go
│   ├── events/
│   │   ├── repository.go          # EventRepository + SQLite impl
│   │   ├── handler.go             # HTTP handlers (/events)
│   │   ├── types.go               # Event structs
│   │   ├── mqtt_handler.go        # MQTT event message handler
│   │   └── events.templ           # Events card + calendar grid
│   ├── alerts/
│   │   ├── repository.go          # AlertRepository + SQLite impl
│   │   ├── handler.go             # HTTP handlers (/alerts)
│   │   ├── types.go               # Alert, AlertSeverity
│   │   └── alerts.templ           # Alerts card
│   ├── energy/
│   │   ├── cache.go               # Energy data cache
│   │   ├── handler.go             # HTTP handlers (/energy)
│   │   ├── types.go               # EnergyData structs
│   │   ├── mqtt_handler.go        # MQTT energy message handler
│   │   └── energy.templ           # Energy card (StatCardMinimal + Sparkline)
│   ├── admin/
│   │   ├── handler.go             # Admin HTTP handlers
│   │   ├── auth.go                # Session + CSRF middleware
│   │   ├── admin-dashboard.templ
│   │   ├── admin-login.templ
│   │   ├── admin-alerts-list.templ
│   │   └── admin-alert-form.templ
│   ├── db/
│   │   ├── db.go                  # SQLite connection
│   │   └── migrations.go          # Schema versioning
│   └── templates/
│       ├── layout.templ           # Base layout
│       ├── landing.templ          # Landing page
│       ├── dashboard.templ        # 2x2 grid assembly
│       ├── calendar.templ         # Full month calendar
│       ├── event-detail.templ     # Event detail drawer
│       ├── error-404.templ
│       └── error-500.templ
├── assets/
│   └── input.css                  # Tailwind + daisyUI entry
├── static/
│   └── output.css                 # Compiled CSS
├── data/
│   └── village-pulse.db           # SQLite database
├── Taskfile.yml
├── .air.toml
├── .golangci.yml
├── go.mod
├── go.sum
├── village.example.yaml
└── README.md
```

## MQTT Client

```go
type Client struct {
    client   mqtt.Client
    cfg      config.MQTTConfig
    handlers map[string]mqtt.MessageHandler
}

func NewClient(cfg config.MQTTConfig) *Client {
    opts := mqtt.NewClientOptions()
    opts.AddBroker(cfg.Broker)
    opts.SetClientID(cfg.ClientID)
    opts.SetUsername(cfg.Username)
    opts.SetPassword(cfg.Password)
    opts.SetAutoReconnect(true)
    opts.SetConnectRetry(true)
    opts.SetCleanSession(false)
    opts.OnConnect = func(c mqtt.Client) {
        log.Info("MQTT connected", "broker", cfg.Broker)
    }
    opts.OnConnectionLost = func(c mqtt.Client, err error) {
        log.Warn("MQTT disconnected", "error", err)
    }
    return &Client{cfg: cfg, client: mqtt.NewClient(opts), handlers: make(map[string]mqtt.MessageHandler)}
}

func (c *Client) Subscribe(topic string, qos byte, handler mqtt.MessageHandler) {
    c.handlers[topic] = handler
    token := c.client.Subscribe(topic, qos, handler)
    token.Wait()
}

func (c *Client) Connect() error {
    token := c.client.Connect()
    token.Wait()
    return token.Error()
}

func (c *Client) Disconnect() {
    c.client.Disconnect(250)
}
```

## MQTT Topic Routing

```go
func (s *Server) setupMQTT() error {
    prefix := s.cfg.MQTT.TopicPrefix

    client := mqtt.NewClient(s.cfg.MQTT)
    if err := client.Connect(); err != nil {
        return fmt.Errorf("mqtt: %w", err)
    }

    // Weather: single topic (retained message = instant data on startup)
    client.Subscribe(prefix+"/weather/current", 1, s.weatherMQTT.HandleCurrent)
    client.Subscribe(prefix+"/weather/forecast", 1, s.weatherMQTT.HandleForecast)

    // Events: wildcard — one message per event
    client.Subscribe(prefix+"/events/+", 1, s.eventsMQTT.HandleEvent)

    // Energy: wildcard — one topic per entity
    client.Subscribe(prefix+"/energy/+", 1, s.energyMQTT.HandleEnergy)

    s.mqttClient = client
    return nil
}
```

## Weather MQTT Handler

```go
func (h *WeatherMQTTHandler) HandleCurrent(_ mqtt.Client, msg mqtt.Message) {
    var data WeatherEntity
    if err := json.Unmarshal(msg.Payload(), &data); err != nil {
        log.Error("weather/current parse failed", "error", err)
        return
    }
    h.cache.SetCurrent(data)
}

func (h *WeatherMQTTHandler) HandleForecast(_ mqtt.Client, msg mqtt.Message) {
    var data Forecast
    if err := json.Unmarshal(msg.Payload(), &data); err != nil {
        log.Error("weather/forecast parse failed", "error", err)
        return
    }
    h.cache.SetForecast(data)
}
```

## Events MQTT Handler

```go
func (h *EventsMQTTHandler) HandleEvent(_ mqtt.Client, msg mqtt.Message) {
    var event Event
    if err := json.Unmarshal(msg.Payload(), &event); err != nil {
        log.Error("events parse failed", "error", err)
        return
    }
    // Topic suffix is the UID: events/{uid}
    uid := msg.Topic()[strings.LastIndex(msg.Topic(), "/")+1:]
    event.ID = uid

    if err := h.repo.Upsert(context.Background(), event); err != nil {
        log.Error("event upsert failed", "uid", uid, "error", err)
    }
}
```

## Energy MQTT Handler

```go
func (h *EnergyMQTTHandler) HandleEnergy(_ mqtt.Client, msg mqtt.Message) {
    var data struct {
        EntityID  string  `json:"entity_id"`
        Value     float64 `json:"value"`
        Unit      string  `json:"unit"`
        Timestamp string  `json:"timestamp"`
    }
    if err := json.Unmarshal(msg.Payload(), &data); err != nil {
        log.Error("energy parse failed", "error", err)
        return
    }

    now := time.Now()
    if err := h.repo.Upsert(data.EntityID, data.Value, data.Unit, now); err != nil {
        log.Error("energy upsert failed", "entity", data.EntityID, "error", err)
        return
    }
    h.cache.Update(data.EntityID, data.Value, data.Unit, now)
}
```

## Dependency Wire-up

```go
func NewServer(cfg *config.Config) (*Server, error) {
    db, err := db.Open(cfg.Database.Path)
    if err != nil {
        return nil, fmt.Errorf("db: %w", err)
    }

    eventRepo := events.NewSQLiteRepository(db)
    alertRepo := alerts.NewSQLiteRepository(db)
    energyRepo := energy.NewSQLiteRepository(db)

    weatherCache := weather.NewCache()
    energyCache := energy.NewCache()

    weatherMQTT := weather.NewMQTTHandler(weatherCache)
    eventsMQTT := events.NewMQTTHandler(eventRepo)
    energyMQTT := energy.NewMQTTHandler(energyRepo, energyCache)

    weatherHandler := weather.NewHandler(weatherCache, cfg.Village)
    eventsHandler := events.NewHandler(eventRepo, cfg.Events)
    alertsHandler := alerts.NewHandler(alertRepo)
    energyHandler := energy.NewHandler(energyCache, cfg.Energy)
    adminHandler := admin.NewHandler(alertRepo, cfg.Alerts.AdminPassword, cfg.Server)

    e := echo.New()
    e.HideBanner = true
    e.Use(middleware.Logger())
    e.Use(middleware.Recover())

    s := &Server{
        echo:        e,
        cfg:         cfg,
        db:          db,
        mqttClient:  nil, // set after setupMQTT
        weatherMQTT: weatherMQTT,
        eventsMQTT:  eventsMQTT,
        energyMQTT:  energyMQTT,
        weatherCache: weatherCache,
        energyCache: energyCache,
    }

    s.registerRoutes(weatherHandler, eventsHandler, alertsHandler, energyHandler, adminHandler)
    return s, nil
}
```

## SSE Handler (Weather)

```go
func (h *WeatherHandler) SSE(c echo.Context) error {
    c.Response().Header().Set("Content-Type", "text/event-stream")
    c.Response().Header().Set("Cache-Control", "no-cache")
    c.Response().Header().Set("Connection", "keep-alive")

    ticker := time.NewTicker(30 * time.Second)
    heartbeat := time.NewTicker(15 * time.Second)
    defer ticker.Stop()
    defer heartbeat.Stop()

    h.pushWeather(c)

    for {
        select {
        case <-ticker.C:
            if c.Request().Context().Err() != nil { return nil }
            h.pushWeather(c)
        case <-heartbeat.C:
            fmt.Fprintf(c.Response(), "event: heartbeat\ndata: \n\n")
            c.Response().Flush()
        case <-c.Request().Context().Done():
            return nil
        }
    }
}

func (h *WeatherHandler) pushWeather(c echo.Context) {
    data := h.cache.Get()
    var buf bytes.Buffer
    weatherCard(data, h.cfg).Render(c.Request().Context(), &buf)
    fmt.Fprintf(c.Response(), "event: weather\ndata: %s\n\n", buf.String())
    c.Response().Flush()
}
```

## In-Memory Cache

```go
type Cache[T any] struct {
    mu         sync.RWMutex
    data       T
    lastUpdate time.Time
}

func (c *Cache[T]) Get() (T, time.Time) {
    c.mu.RLock()
    defer c.mu.RUnlock()
    return c.data, c.lastUpdate
}

func (c *Cache[T]) Set(data T) {
    c.mu.Lock()
    defer c.mu.Unlock()
    c.data = data
    c.lastUpdate = time.Now()
}
```

## Taskfile.yml

```yaml
version: "3"

tasks:
  build:
    desc: Build binary + CSS
    cmds:
      - templ generate
      - tailwindcss -i assets/input.css -o static/output.css --minify
      - go build -o village-pulse ./cmd/village-pulse

  dev:
    desc: Dev mode (hot reload + CSS watch)
    cmds:
      - task css:watch &
      - air

  generate:
    desc: Generate Templ code
    cmds:
      - templ generate

  css:
    desc: Build CSS
    cmds:
      - tailwindcss -i assets/input.css -o static/output.css --minify

  css:watch:
    desc: Watch CSS changes
    cmds:
      - tailwindcss -i assets/input.css -o static/output.css --watch

  lint:
    desc: Lint Go code
    cmds:
      - golangci-lint run ./...

  test:
    desc: Run tests
    cmds:
      - go test -race -count=1 ./...

  clean:
    desc: Remove build artifacts
    cmds:
      - rm -f village-pulse
      - rm -rf static/
      - rm -rf data/
```

## Deployment Configs

### Caddy Reverse Proxy

```
my-village.example.com {
    reverse_proxy localhost:9080
    encode gzip
    header Strict-Transport-Security "max-age=63072000"
}
```

### Systemd Service

```ini
[Unit]
Description=Village Pulse Dashboard
After=network.target mosquitto.service

[Service]
Type=simple
User=village-pulse
WorkingDirectory=/opt/village-pulse
EnvironmentFile=/etc/village-pulse/env
ExecStart=/opt/village-pulse/village-pulse serve
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
```

### Crontab (Backup)

```
0 3 * * * curl -s -o /backup/village-pulse-$(date +\%Y-\%m-\%d).db -b /tmp/session http://localhost:9080/admin/backup
```
