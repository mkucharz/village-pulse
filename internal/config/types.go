package config

import "time"

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
	Address     string  `yaml:"address"`
	Latitude    float64 `yaml:"latitude"`
	Longitude   float64 `yaml:"longitude"`
	Timezone    string  `yaml:"timezone"`
	Language    string  `yaml:"language"`
}

type MQTTConfig struct {
	Broker      string `yaml:"broker"`
	ClientID    string `yaml:"client_id"`
	Username    string `yaml:"username"`
	Password    string `yaml:"password"`
	TopicPrefix string `yaml:"topic_prefix"`
}

type WeatherConfig struct {
	Units         string `yaml:"units"`
	ForecastDays  int    `yaml:"forecast_days"`
	SecondaryInfo string `yaml:"secondary_info"`
}

type EventsConfig struct {
	UpcomingCount int `yaml:"upcoming_count"`
	RetentionDays int `yaml:"retention_days"`
}

type EnergyConfig struct {
	Entities           []EnergyEntity `yaml:"entities"`
	FreshnessThreshold time.Duration  `yaml:"freshness_threshold"`
}

type EnergyEntity struct {
	EntityID string `yaml:"entity_id"`
	Name     string `yaml:"name"`
	Unit     string `yaml:"unit"`
	Icon     string `yaml:"icon"`
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
