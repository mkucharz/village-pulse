# Data Models: village-pulse

## SQLite Schema

```sql
-- Events (received via MQTT from ics-mqtt-bridge)
CREATE TABLE events (
    id          TEXT PRIMARY KEY,          -- MQTT topic suffix (event UID)
    village_id  TEXT NOT NULL DEFAULT 'default',
    feed_name   TEXT NOT NULL,
    feed_color  TEXT NOT NULL DEFAULT '#3b82f6',
    title       TEXT NOT NULL,
    description TEXT DEFAULT '',
    location    TEXT DEFAULT '',
    start_time  DATETIME NOT NULL,
    end_time    DATETIME NOT NULL,
    all_day     INTEGER NOT NULL DEFAULT 0,
    url         TEXT DEFAULT '',
    updated_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_events_village ON events(village_id);
CREATE INDEX idx_events_start ON events(village_id, start_time);
CREATE INDEX idx_events_feed ON events(village_id, feed_name);

-- Emergency alerts (admin-managed via web UI)
CREATE TABLE alerts (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    village_id  TEXT NOT NULL DEFAULT 'default',
    title       TEXT NOT NULL,
    message     TEXT NOT NULL,
    severity    INTEGER NOT NULL DEFAULT 0,  -- 0=info,1=warning,2=severe,3=critical
    pinned      INTEGER NOT NULL DEFAULT 0,
    start_time  DATETIME NOT NULL,
    expiry_time DATETIME,
    active      INTEGER NOT NULL DEFAULT 1,
    created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_alerts_village ON alerts(village_id);
CREATE INDEX idx_alerts_active ON alerts(village_id, active, start_time);

-- Energy history (per MQTT push)
CREATE TABLE energy_history (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    village_id  TEXT NOT NULL DEFAULT 'default',
    entity_id   TEXT NOT NULL,
    timestamp   DATETIME NOT NULL,          -- when MQTT message received
    value       REAL NOT NULL,
    unit        TEXT NOT NULL,
    created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_energy_village ON energy_history(village_id);
CREATE INDEX idx_energy_entity_time ON energy_history(village_id, entity_id, timestamp);
CREATE UNIQUE INDEX idx_energy_unique ON energy_history(village_id, entity_id, timestamp);
```

## Go Structs

### Config

```go
type Config struct {
    Village  VillageConfig  `yaml:"village"`
    MQTT     MQTTConfig     `yaml:"mqtt"`
    Weather  WeatherConfig  `yaml:"weather"`
    Events   EventsConfig   `yaml:"events"`
    Energy   EnergyConfig   `yaml:"energy"`
    Alerts   AlertsConfig   `yaml:"alerts"`
    Server   ServerConfig   `yaml:"server"`
    Database DatabaseConfig `yaml:"database"`
}

type VillageConfig struct {
    Name        string  `yaml:"name"`
    Description string  `yaml:"description"`
    Latitude    float64 `yaml:"latitude"`
    Longitude   float64 `yaml:"longitude"`
    Timezone    string  `yaml:"timezone"`
    Language    string  `yaml:"language"`
}

type MQTTConfig struct {
    Broker      string `yaml:"broker"`       // tcp://localhost:1883
    ClientID    string `yaml:"client_id"`    // unique per village instance
    Username    string `yaml:"username"`     // optional
    Password    string `yaml:"password"`     // optional
    TopicPrefix string `yaml:"topic_prefix"` // e.g. "village/my-village"
}

type WeatherConfig struct {
    Units         string `yaml:"units"`           // metric|imperial|hybrid
    ForecastDays  int    `yaml:"forecast_days"`   // 1-16
    SecondaryInfo string `yaml:"secondary_info"`  // humidity|wind_speed|feels_like|pressure
}

type EventsConfig struct {
    UpcomingCount int `yaml:"upcoming_count"` // events shown on dashboard
    RetentionDays int `yaml:"retention_days"` // cleanup past events after N days
}

type EnergyConfig struct {
    Entities           []EnergyEntity `yaml:"entities"`
    FreshnessThreshold time.Duration  `yaml:"freshness_threshold"` // warn if no MQTT data for this long
}

type EnergyEntity struct {
    EntityID string `yaml:"entity_id"`
    Name     string `yaml:"name"`
    Unit     string `yaml:"unit"`
    Icon     string `yaml:"icon"` // solar|consumption|grid|battery|gas|water
}

type AlertsConfig struct {
    AdminPassword string `yaml:"admin_password"`
}

type ServerConfig struct {
    Port            int           `yaml:"port"`
    Host            string        `yaml:"host"`
    LogLevel        string        `yaml:"log_level"`
    LogOutput       string        `yaml:"log_output"`
    LogPath         string        `yaml:"log_path"`
    ShutdownTimeout time.Duration `yaml:"shutdown_timeout"`
    SessionSecret   string        `yaml:"session_secret"`
    CSRFSecret      string        `yaml:"csrf_secret"`
}

type DatabaseConfig struct {
    Path string `yaml:"path"`
}
```

### Weather (from MQTT)

```go
type WeatherEntity struct {
    State              string    // HA condition: sunny, cloudy...
    Temperature        float64
    TemperatureUnit    string
    Humidity           float64
    Pressure           float64
    PressureUnit       string
    WindSpeed          float64
    WindSpeedUnit      string
    WindBearing        float64
    WindDirection      string    // cardinal: "N", "SW"...
    WindGustSpeed      float64
    ApparentTemperature float64
    DewPoint           float64
    Precipitation      float64
    PrecipitationUnit  string
    PrecipitationProb  float64
    CloudCoverage      float64
    Visibility         float64
    VisibilityUnit     string
    UVIndex            float64
    IsDaytime          bool
    Timestamp          time.Time // MQTT message timestamp
}

type Forecast struct {
    Daily  []DailyForecast
    Hourly []HourlyForecast
}

type DailyForecast struct {
    Date                  time.Time
    Condition             string
    TemperatureHigh       float64
    TemperatureLow        float64
    PrecipitationSum      float64
    PrecipitationProbMax  float64
    WindSpeedMax          float64
    WindDirectionDominant string
    UVIndexMax            float64
    Sunrise               time.Time
    Sunset                time.Time
}

type HourlyForecast struct {
    Time                time.Time
    IsDaytime           bool
    Condition           string
    Temperature         float64
    Humidity            float64
    Precipitation       float64
    PrecipitationProb   float64
    WindSpeed           float64
    WindDirection       string
    CloudCoverage       float64
    UVIndex             float64
}
```

### Events (from MQTT)

```go
type Event struct {
    ID          string    // MQTT topic suffix (UID)
    VillageID   string
    FeedName    string
    FeedColor   string
    Title       string
    Description string
    Location    string
    StartTime   time.Time
    EndTime     time.Time
    AllDay      bool
    URL         string
    UpdatedAt   time.Time
}
```

### Alerts

```go
type Alert struct {
    ID         int
    VillageID  string
    Title      string
    Message    string
    Severity   AlertSeverity
    Pinned     bool
    StartTime  time.Time
    ExpiryTime *time.Time
    Active     bool
}

type AlertSeverity int

const (
    SeverityInfo     AlertSeverity = 0
    SeverityWarning  AlertSeverity = 1
    SeveritySevere   AlertSeverity = 2
    SeverityCritical AlertSeverity = 3
)
```

### Energy (from MQTT)

```go
type EnergyData struct {
    Entities  []EnergyEntityData
    UpdatedAt time.Time
}

type EnergyEntityData struct {
    EntityID string
    Name     string
    Unit     string
    Icon     string
    Value    float64
    Trend    StatTrend
    History  []EnergyHistoryPoint
}

type EnergyHistoryPoint struct {
    Date  time.Time
    Value float64
    Unit  string
}
```

## Repository Pattern

```go
type EventRepository interface {
    Upsert(ctx context.Context, event Event) error
    GetByID(ctx context.Context, id string) (*Event, error)
    GetUpcoming(ctx context.Context, villageID string, limit int) ([]Event, error)
    GetByDateRange(ctx context.Context, villageID string, from, to time.Time) ([]Event, error)
    Cleanup(ctx context.Context, villageID string, before time.Time) (int64, error)
}

type AlertRepository interface {
    Create(ctx context.Context, alert *Alert) error
    Update(ctx context.Context, alert *Alert) error
    Delete(ctx context.Context, id int) error
    GetActive(ctx context.Context, villageID string) ([]Alert, error)
    GetAll(ctx context.Context, villageID string) ([]Alert, error)
    DeactivateExpired(ctx context.Context) (int64, error)
}

type EnergyRepository interface {
    Upsert(ctx context.Context, entityID string, value float64, unit string, timestamp time.Time) error
    GetHistory(ctx context.Context, villageID string, entityID string, days int) ([]EnergyHistoryPoint, error)
    Cleanup(ctx context.Context, villageID string, before time.Time) (int64, error)
}
```
