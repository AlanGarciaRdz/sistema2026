-- Reportes e incidentes de unidad (choques, ruidos, daños, etc.)

CREATE TABLE IF NOT EXISTS vehicle_incident_reports (
    id SERIAL PRIMARY KEY,
    vehicle_id INTEGER NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
    report_date DATE NOT NULL,
    reported_by VARCHAR(255) NOT NULL,
    report_type VARCHAR(64) NOT NULL DEFAULT 'other',
    title VARCHAR(255) NOT NULL,
    description TEXT,
    severity VARCHAR(32) DEFAULT 'moderate',
    mileage INTEGER,
    status VARCHAR(32) DEFAULT 'open',
    resolution_notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_vehicle_incident_reports_vehicle
  ON vehicle_incident_reports(vehicle_id, report_date DESC);
