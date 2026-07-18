package config

import (
	"fmt"
	"os"
	"strconv"
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
