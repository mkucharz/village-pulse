package config

import (
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"os"
	"strconv"
	"strings"
	"time"

	"gopkg.in/yaml.v3"
)

func Load(args []string) (*Config, error) {
	path := findConfig(args)
	if path == "" {
		return nil, fmt.Errorf("no config found (--config flag, $VILLAGE_CONFIG, ./village.yaml, /etc/village-pulse/village.yaml)")
	}

	data, err := os.ReadFile(path)
	if err != nil {
		return nil, fmt.Errorf("read %s: %w", path, err)
	}

	cfg := Defaults()
	if err := yaml.Unmarshal(data, cfg); err != nil {
		return nil, fmt.Errorf("parse %s: %w", path, err)
	}

	applyEnvOverrides(cfg)

	if cfg.Village.Address != "" && (cfg.Village.Latitude == 0 && cfg.Village.Longitude == 0) {
		lat, lng, err := geocode(cfg.Village.Address)
		if err != nil {
			fmt.Fprintf(os.Stderr, "warn: geocode failed for '%s': %v\n", cfg.Village.Address, err)
		} else {
			cfg.Village.Latitude = lat
			cfg.Village.Longitude = lng
		}
	}

	if err := Validate(cfg); err != nil {
		return nil, err
	}

	return cfg, nil
}

func findConfig(args []string) string {
	for i, a := range args {
		if a == "-c" || a == "--config" {
			if i+1 < len(args) {
				return args[i+1]
			}
		}
	}
	if p := os.Getenv("VILLAGE_CONFIG"); p != "" {
		return p
	}
	for _, p := range []string{"./village.yaml", "/etc/village-pulse/village.yaml"} {
		if _, err := os.Stat(p); err == nil {
			return p
		}
	}
	return ""
}

func Defaults() *Config {
	return &Config{
		Village: VillageConfig{
			Language:    "en",
			Timezone:    "UTC",
			Description: "Community Dashboard",
		},
		MQTT: MQTTConfig{
			Broker:      "tcp://localhost:1883",
			ClientID:    "village-pulse",
			TopicPrefix: "village/default",
		},
		Weather: WeatherConfig{
			Units:         "metric",
			ForecastDays:  7,
			SecondaryInfo: "humidity",
		},
		Events: EventsConfig{
			UpcomingCount: 7,
			RetentionDays: 30,
		},
		Energy: EnergyConfig{
			FreshnessThreshold: 10 * time.Minute,
		},
		Server: ServerConfig{
			Port:            9080,
			Host:            "0.0.0.0",
			LogLevel:        "info",
			LogOutput:       "console",
			LogPath:         "./data/village-pulse.log",
			ShutdownTimeout: 15 * time.Second,
		},
		Database: DatabaseConfig{
			Path: "./data/village-pulse.db",
		},
	}
}

func applyEnvOverrides(cfg *Config) {
	if v := os.Getenv("PORT"); v != "" {
		if p, err := strconv.Atoi(v); err == nil {
			cfg.Server.Port = p
		}
	}
	if v := os.Getenv("LOG_LEVEL"); v != "" {
		cfg.Server.LogLevel = v
	}
	if v := os.Getenv("LOG_OUTPUT"); v != "" {
		cfg.Server.LogOutput = v
	}
	if v := os.Getenv("ADMIN_PASSWORD"); v != "" {
		cfg.Alerts.AdminPassword = v
	}
	if v := os.Getenv("SESSION_SECRET"); v != "" {
		cfg.Server.SessionSecret = v
	}
	if v := os.Getenv("CSRF_SECRET"); v != "" {
		cfg.Server.CSRFSecret = v
	}
}

func geocode(address string) (float64, float64, error) {
	clean := strings.ReplaceAll(address, ",", "")
	u := "https://nominatim.openstreetmap.org/search?format=json&limit=1&q=" + url.QueryEscape(clean)
	req, _ := http.NewRequest("GET", u, nil)
	req.Header.Set("User-Agent", "village-pulse/0.1")
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return 0, 0, fmt.Errorf("geocode request: %w", err)
	}
	defer resp.Body.Close()

	var results []struct {
		Lat string `json:"lat"`
		Lon string `json:"lon"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&results); err != nil {
		return 0, 0, fmt.Errorf("geocode parse: %w", err)
	}
	if len(results) == 0 {
		return 0, 0, fmt.Errorf("no results for address")
	}

	lat, _ := strconv.ParseFloat(results[0].Lat, 64)
	lng, _ := strconv.ParseFloat(results[0].Lon, 64)
	return lat, lng, nil
}
