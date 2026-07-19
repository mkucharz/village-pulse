package server

import (
	"context"
	"database/sql"
	"fmt"
	"log/slog"
	"net/http"
	"os"

	"github.com/labstack/echo/v4"
	"github.com/labstack/echo/v4/middleware"

	"mkucharz/village-pulse/internal/config"
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
	e.Use(func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c echo.Context) error {
			c.Response().Header().Set("Content-Security-Policy",
				"default-src 'self'; "+
					"script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://cdn.tailwindcss.com; "+
					"style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; "+
					"img-src 'self' data:; "+
					"connect-src 'self'")
			return next(c)
		}
	})

	e.File("/favicon.ico", "static/favicon.ico")

	s := &Server{
		echo: e,
		cfg:  cfg,
		db:   db,
		log:  log,
	}

	e.GET("/health", s.healthHandler)
	e.GET("/", s.indexHandler)
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
		"mode":   s.mode(),
	})
}

func (s *Server) indexHandler(c echo.Context) error {
	if s.cfg.Village.Name == "" || s.cfg.Village.Name == "My Village" {
		return c.HTML(http.StatusOK, `<html><body><h1>village-pulse</h1><p>Configure village.yaml to get started.</p></body></html>`)
	}
	return c.Redirect(http.StatusFound, "/dashboard")
}

func (s *Server) dashboardHandler(c echo.Context) error {
	return c.HTML(http.StatusOK, fmt.Sprintf(`<html><body><h1>%s</h1><p>Dashboard coming soon.</p></body></html>`, s.cfg.Village.Name))
}

func (s *Server) errorHandler(err error, c echo.Context) {
	code := http.StatusInternalServerError
	if he, ok := err.(*echo.HTTPError); ok {
		code = he.Code
	}
	c.HTML(code, fmt.Sprintf(`<html><body><h1>%d</h1><p>Something went wrong.</p></body></html>`, code))
}

func (s *Server) mode() string {
	if s.cfg.Village.Name == "" || s.cfg.Village.Name == "My Village" {
		return "unconfigured"
	}
	return "live"
}

func init() {
	_ = os.Setenv("TZ", "UTC")
}
