-- Vehicle Maintenance table
CREATE TABLE IF NOT EXISTS vehicle_maintenance (
    id SERIAL PRIMARY KEY,
    vehicle_id INTEGER REFERENCES vehicles(id) ON DELETE CASCADE,
    maintenance_date DATE NOT NULL,
    mileage INTEGER,
    maintenance_type VARCHAR(255),
    cost DECIMAL(10,2),
    payment_account_id INTEGER REFERENCES payment_accounts(id) ON DELETE SET NULL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
