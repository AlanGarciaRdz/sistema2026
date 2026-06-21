-- Kilometraje actual por unidad y seguimiento de servicios programados

ALTER TABLE vehicles
  ADD COLUMN IF NOT EXISTS current_mileage INTEGER,
  ADD COLUMN IF NOT EXISTS current_mileage_at DATE;

ALTER TABLE vehicle_maintenance
  ADD COLUMN IF NOT EXISTS next_service_km INTEGER,
  ADD COLUMN IF NOT EXISTS interval_km INTEGER;

CREATE TABLE IF NOT EXISTS vehicle_service_items (
    id SERIAL PRIMARY KEY,
    vehicle_id INTEGER NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    item_kind VARCHAR(64) DEFAULT 'custom',
    next_due_km INTEGER,
    warn_before_km INTEGER DEFAULT 5000,
    critical_before_km INTEGER DEFAULT 2000,
    interval_km INTEGER,
    last_service_km INTEGER,
    last_service_date DATE,
    notes TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE vehicle_maintenance
  ADD COLUMN IF NOT EXISTS service_item_id INTEGER
    REFERENCES vehicle_service_items(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_vehicle_service_items_vehicle
  ON vehicle_service_items(vehicle_id) WHERE is_active = TRUE;
