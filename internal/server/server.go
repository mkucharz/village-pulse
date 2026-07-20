package server

import (
	"context"
	"database/sql"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"time"

	"github.com/labstack/echo/v4"
	"github.com/labstack/echo/v4/middleware"

	"mkucharz/village-pulse/internal/config"
	"mkucharz/village-pulse/internal/templates"
)

type Server struct {
	echo *echo.Echo
	cfg  *config.Config
	db   *sql.DB
	log  *slog.Logger
	srv  *http.Server
}

func New(cfg *config.Config, db *sql.DB, log *slog.Logger) (*Server, error) {
	e := echo.New()
	e.HideBanner = true
	e.HidePort = true

	e.Use(middleware.RequestID())
	e.Use(middleware.Recover())

	s := &Server{echo: e, cfg: cfg, db: db, log: log}

	e.GET("/health", s.healthHandler)
	e.GET("/", s.dashboardHandler)
	e.GET("/dashboard", s.dashboardHandler)

	e.HTTPErrorHandler = s.errorHandler

	return s, nil
}

func (s *Server) Start(ctx context.Context) error {
	addr := fmt.Sprintf("%s:%d", s.cfg.Server.Host, s.cfg.Server.Port)
	s.srv = &http.Server{Addr: addr, Handler: s.echo}

	go func() {
		s.log.Info("server started", "addr", addr)
		if err := s.srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			s.log.Error("server error", "error", err)
		}
	}()

	<-ctx.Done()

	shutdownCtx, cancel := context.WithTimeout(context.Background(), s.cfg.Server.ShutdownTimeout)
	defer cancel()

	if err := s.srv.Shutdown(shutdownCtx); err != nil {
		return fmt.Errorf("shutdown: %w", err)
	}
	return nil
}

func (s *Server) dashboardHandler(c echo.Context) error {
	// Demo data
	data := templates.DashboardData{
		VillageName:    s.cfg.Village.Name,
		Description:    s.cfg.Village.Description,
		Weather:        demoWeather(),
		Events:         demoEvents(),
		Alerts:         demoAlerts(),
		Energy:         demoEnergy(),
	}
	return templates.DashboardPage(data).Render(c.Request().Context(), c.Response())
}

func (s *Server) healthHandler(c echo.Context) error {
	var dbStatus string
	if err := s.db.Ping(); err != nil {
		dbStatus = "error"
	} else {
		dbStatus = "ok"
	}
	return c.JSON(http.StatusOK, map[string]string{
		"status": "ok",
		"db":     dbStatus,
	})
}

func (s *Server) errorHandler(err error, c echo.Context) {
	code := http.StatusInternalServerError
	if he, ok := err.(*echo.HTTPError); ok {
		code = he.Code
	}
	c.HTML(code, fmt.Sprintf(`<html><body><h1>%d</h1><p>Something went wrong.</p></body></html>`, code))
}

func init() { _ = os.Setenv("TZ", "UTC") }

// ── Demo data ─────────────────────────────────────────────────────────────────

func demoWeather() templates.WeatherData {
	return templates.WeatherData{
		Condition:       "partlycloudy",
		ConditionText:   "Partly Cloudy",
		Temperature:     22.5,
		TemperatureUnit: "°C",
		Humidity:        56,
		WindSpeed:       12.5,
		WindSpeedUnit:   "km/h",
		WindDirection:   "SW",
		FeelsLike:       24.1,
		Pressure:        1013.2,
		PressureUnit:    "hPa",
		Forecast: []templates.ForecastDay{
			{Day: "Mon", Condition: "sunny", High: 28, Low: 14, PrecipProb: 5, PrecipAmount: 0, WindDir: "NE"},
			{Day: "Tue", Condition: "cloudy", High: 24, Low: 12, PrecipProb: 60, PrecipAmount: 2.4, WindDir: "SW"},
			{Day: "Wed", Condition: "rainy", High: 18, Low: 10, PrecipProb: 90, PrecipAmount: 8.1, WindDir: "W"},
			{Day: "Thu", Condition: "partlycloudy", High: 21, Low: 13, PrecipProb: 15, PrecipAmount: 0.3, WindDir: "N"},
			{Day: "Fri", Condition: "sunny", High: 26, Low: 15, PrecipProb: 0, PrecipAmount: 0, WindDir: "SE"},
		},
	}
}

func demoEvents() templates.EventsData {
	now := time.Now()
	today := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location())

	return templates.EventsData{
		Today: []templates.EventItem{
			{Title: "Farmers Market", Time: "14:00 - 18:00", Location: "Market Square", Color: "#10b981"},
			{Title: "Village Assembly", Time: "19:00", Location: "Community Hall", Color: "#3b82f6"},
		},
		ThisWeek: []templates.EventItem{
			{Title: "Summer Festival", Time: fmt.Sprintf("%s 10:00 → %s 22:00",
				today.AddDate(0, 0, 5).Format("Mon"),
				today.AddDate(0, 0, 6).Format("Sun")), Location: "Park", Color: "#10b981"},
			{Title: "Village Council", Time: today.AddDate(0, 0, 2).Format("Mon") + " 18:00", Location: "Town Hall", Color: "#3b82f6"},
			{Title: "Waste Collection", Time: today.AddDate(0, 0, 3).Format("Mon") + " 07:00", Location: "All streets", Color: "#f59e0b"},
		},
		TotalCount: 5,
	}
}

func demoAlerts() templates.AlertsData {
	return templates.AlertsData{
		Items: []templates.AlertItem{
			{Severity: "critical", Title: "Heatwave Warning", Message: "Temperatures up to 38°C expected. Stay hydrated. Community pool open extended hours.", Expiry: "Fri 22:00", Pinned: true},
			{Severity: "warning", Title: "Road Works", Message: "Main Street closed between Church and School. Detour via Park Road.", Expiry: "18.07.2026", Pinned: false},
		},
	}
}

func demoEnergy() templates.EnergyData {
	return templates.EnergyData{
		Entities: []templates.EnergyEntity{
			{Name: "Solar Production", Value: "42.5", Unit: "kWh", Icon: "sun", Trend: "up", TrendLabel: "12%"},
			{Name: "Village Consumption", Value: "-28.3", Unit: "kWh", Icon: "zap", Trend: "down", TrendLabel: "5%"},
			{Name: "Grid Export", Value: "+14.2", Unit: "kWh", Icon: "plug", Trend: "neutral", TrendLabel: "0%"},
		},
		Sparkline: []int{5, 12, 8, 15, 20, 18, 25},
		UpdatedAt: "2 min ago",
	}
}
