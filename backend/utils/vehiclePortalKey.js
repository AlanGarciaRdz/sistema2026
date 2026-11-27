const pool = require('../config/db');

async function getVehicleByPortalKey(portalKey) {
  const raw = decodeURIComponent(String(portalKey || '').trim());
  if (!raw) return null;

  if (/^\d+$/.test(raw)) {
    const byId = await pool.query('SELECT * FROM vehicles WHERE id = $1 LIMIT 1', [
      parseInt(raw, 10)
    ]);
    if (byId.rows[0]) return byId.rows[0];
  }

  const byCode = await pool.query(
    `SELECT * FROM vehicles
     WHERE vehicle_code IS NOT NULL AND TRIM(vehicle_code) ILIKE $1
     LIMIT 1`,
    [raw]
  );
  if (byCode.rows[0]) return byCode.rows[0];

  const byPlate = await pool.query(
    `SELECT * FROM vehicles
     WHERE license_plate IS NOT NULL AND TRIM(license_plate) ILIKE $1
     LIMIT 1`,
    [raw]
  );
  if (byPlate.rows[0]) return byPlate.rows[0];

  return null;
}

function vehiclePortalSummary(vehicle) {
  if (!vehicle) return null;
  return {
    id: vehicle.id,
    vehicle_code: vehicle.vehicle_code,
    brand: vehicle.brand,
    model: vehicle.model,
    license_plate: vehicle.license_plate,
    vin_number: vehicle.vin_number,
    current_mileage: vehicle.current_mileage
  };
}

module.exports = { getVehicleByPortalKey, vehiclePortalSummary };
