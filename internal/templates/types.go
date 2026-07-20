package templates

import "time"

// Dashboard

type DashboardData struct {
	VillageName string
	Description string
	Weather     WeatherData
	Events      EventsData
	Alerts      AlertsData
	Energy      EnergyData
}

// Weather

type WeatherData struct {
	Condition       string
	ConditionText   string
	Temperature     float64
	TemperatureUnit string
	Humidity        float64
	WindSpeed       float64
	WindSpeedUnit   string
	WindDirection   string
	FeelsLike       float64
	Pressure        float64
	PressureUnit    string
	Forecast        []ForecastDay
}

type ForecastDay struct {
	Day         string
	Condition   string
	High        float64
	Low         float64
	PrecipProb  int
	PrecipAmount float64
	WindDir     string
}

// Events

type EventsData struct {
	Today      []EventItem
	ThisWeek   []EventItem
	TotalCount int
}

type EventItem struct {
	Title    string
	Time     string
	Location string
	Color    string
}

// Alerts

type AlertsData struct {
	Items []AlertItem
}

type AlertItem struct {
	Severity string // info, warning, severe, critical
	Title    string
	Message  string
	Expiry   string
	Pinned   bool
}

// Energy

type EnergyData struct {
	Entities  []EnergyEntity
	Sparkline []int
	UpdatedAt string
}

type EnergyEntity struct {
	Name       string
	Value      string
	Unit       string
	Icon       string
	Trend      string // up, down, neutral
	TrendLabel string
}

// Calendar

type CalendarMonth struct {
	Year  int
	Month time.Month
	Days  []CalendarDay
}

type CalendarDay struct {
	Date   int
	Month  time.Month
	Events []EventItem
	IsToday bool
	IsCurrentMonth bool
}
