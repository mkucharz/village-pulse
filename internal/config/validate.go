package config

import "fmt"

func Validate(cfg *Config) error {
	if cfg.Village.Name == "" {
		cfg.Village.Name = "My Village"
	}
	if cfg.Village.Latitude < -90 || cfg.Village.Latitude > 90 {
		return fmt.Errorf("village.latitude must be between -90 and 90")
	}
	if cfg.Village.Longitude < -180 || cfg.Village.Longitude > 180 {
		return fmt.Errorf("village.longitude must be between -180 and 180")
	}
	if cfg.Server.Port < 1 || cfg.Server.Port > 65535 {
		return fmt.Errorf("server.port must be between 1 and 65535")
	}
	if cfg.Weather.ForecastDays < 1 || cfg.Weather.ForecastDays > 16 {
		return fmt.Errorf("weather.forecast_days must be between 1 and 16")
	}
	if cfg.Events.RetentionDays < 1 {
		return fmt.Errorf("events.retention_days must be >= 1")
	}
	return nil
}
