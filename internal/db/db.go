package db

import (
	"database/sql"
	"fmt"
	"os"
	"path/filepath"

	_ "modernc.org/sqlite"
)

func Open(path string) (*sql.DB, error) {
	dir := filepath.Dir(path)
	if err := os.MkdirAll(dir, 0o755); err != nil {
		return nil, fmt.Errorf("create data dir %s: %w", dir, err)
	}

	db, err := sql.Open("sqlite", path+"?_journal_mode=WAL&_busy_timeout=5000")
	if err != nil {
		return nil, fmt.Errorf("open %s: %w", path, err)
	}

	db.SetMaxOpenConns(1)
	db.SetMaxIdleConns(1)

	return db, nil
}

func Migrate(db *sql.DB) error {
	migrations := []string{
		`CREATE TABLE IF NOT EXISTS events (
			id          TEXT PRIMARY KEY,
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
		)`,
		`CREATE INDEX IF NOT EXISTS idx_events_village ON events(village_id)`,
		`CREATE INDEX IF NOT EXISTS idx_events_start ON events(village_id, start_time)`,
		`CREATE INDEX IF NOT EXISTS idx_events_feed ON events(village_id, feed_name)`,

		`CREATE TABLE IF NOT EXISTS alerts (
			id          INTEGER PRIMARY KEY AUTOINCREMENT,
			village_id  TEXT NOT NULL DEFAULT 'default',
			title       TEXT NOT NULL,
			message     TEXT NOT NULL,
			severity    INTEGER NOT NULL DEFAULT 0,
			pinned      INTEGER NOT NULL DEFAULT 0,
			start_time  DATETIME NOT NULL,
			expiry_time DATETIME,
			active      INTEGER NOT NULL DEFAULT 1,
			created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
			updated_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
		)`,
		`CREATE INDEX IF NOT EXISTS idx_alerts_village ON alerts(village_id)`,
		`CREATE INDEX IF NOT EXISTS idx_alerts_active ON alerts(village_id, active, start_time)`,

		`CREATE TABLE IF NOT EXISTS energy_history (
			id          INTEGER PRIMARY KEY AUTOINCREMENT,
			village_id  TEXT NOT NULL DEFAULT 'default',
			entity_id   TEXT NOT NULL,
			timestamp   DATETIME NOT NULL,
			value       REAL NOT NULL,
			unit        TEXT NOT NULL,
			created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
		)`,
		`CREATE INDEX IF NOT EXISTS idx_energy_village ON energy_history(village_id)`,
		`CREATE INDEX IF NOT EXISTS idx_energy_entity_time ON energy_history(village_id, entity_id, timestamp)`,
		`CREATE UNIQUE INDEX IF NOT EXISTS idx_energy_unique ON energy_history(village_id, entity_id, timestamp)`,
	}

	for _, m := range migrations {
		if _, err := db.Exec(m); err != nil {
			return fmt.Errorf("migration: %w", err)
		}
	}
	return nil
}
