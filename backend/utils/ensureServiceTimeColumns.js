const pool = require('../config/db');

let ready = false;

/** Idempotente: el reporte de mantenimiento por días funciona aunque no se haya corrido el SQL a mano. */
async function ensureServiceTimeColumns() {
  if (ready) return;
  await pool.query(`
    ALTER TABLE vehicle_service_items
      ADD COLUMN IF NOT EXISTS schedule_basis VARCHAR(16) DEFAULT 'km',
      ADD COLUMN IF NOT EXISTS interval_days INTEGER,
      ADD COLUMN IF NOT EXISTS warn_before_days INTEGER,
      ADD COLUMN IF NOT EXISTS critical_before_days INTEGER,
      ADD COLUMN IF NOT EXISTS next_due_date DATE
  `);
  ready = true;
}

module.exports = { ensureServiceTimeColumns };
