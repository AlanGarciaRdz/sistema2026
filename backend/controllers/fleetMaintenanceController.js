const pool = require('../config/db');
const {
  computeKmServiceStatus,
  computeIntervalProgress,
  resolveEffectiveMileage
} = require('../utils/maintenanceStatus');

async function bumpVehicleMileageIfHigher(vehicleId, km, dateStr) {
  const n = parseInt(km, 10);
  if (!Number.isFinite(n)) return;
  const d = dateStr || new Date().toISOString().slice(0, 10);
  await pool.query(
    `UPDATE vehicles SET
       current_mileage = $1,
       current_mileage_at = $2,
       updated_at = CURRENT_TIMESTAMP
     WHERE id = $3 AND (current_mileage IS NULL OR current_mileage < $1)`,
    [n, d, vehicleId]
  );
}

function normalizeServiceDate(value) {
  if (!value) return null;
  return String(value).slice(0, 10);
}

function parseServiceKm(value) {
  if (value == null || value === '') return null;
  const n = parseInt(value, 10);
  return Number.isFinite(n) ? n : null;
}

function lastServiceEventChanged(prev, next) {
  const prevKm = parseServiceKm(prev.last_service_km);
  const nextKm = parseServiceKm(next.last_service_km);
  const prevDate = normalizeServiceDate(prev.last_service_date);
  const nextDate = normalizeServiceDate(next.last_service_date);
  return prevKm !== nextKm || prevDate !== nextDate;
}

function hasLastServiceEvent(km, dateStr) {
  return parseServiceKm(km) != null || normalizeServiceDate(dateStr) != null;
}

async function logServiceItemToMaintenanceHistory({
  vehicleId,
  serviceItemId,
  title,
  lastServiceKm,
  lastServiceDate,
  nextDueKm,
  intervalKm,
  notes
}) {
  if (!vehicleId || !serviceItemId) return false;
  const km = parseServiceKm(lastServiceKm);
  const dateStr = normalizeServiceDate(lastServiceDate) || new Date().toISOString().slice(0, 10);
  if (km == null && !normalizeServiceDate(lastServiceDate)) return false;

  const userNotes = notes && String(notes).trim();
  const historyNotes = userNotes || 'Registrado desde servicio programado';

  await pool.query(
    `INSERT INTO vehicle_maintenance (
      vehicle_id, maintenance_date, mileage, maintenance_type,
      notes, next_service_km, interval_km, service_item_id
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [
      vehicleId,
      dateStr,
      km,
      title,
      historyNotes,
      parseServiceKm(nextDueKm),
      parseServiceKm(intervalKm),
      serviceItemId
    ]
  );
  return true;
}

async function logOdometerReadingToHistory(vehicleId, km, dateStr) {
  const mileage = parseServiceKm(km);
  const recordedAt = normalizeServiceDate(dateStr) || new Date().toISOString().slice(0, 10);
  if (!vehicleId || mileage == null) return false;

  await pool.query(
    `INSERT INTO vehicle_maintenance (
      vehicle_id, maintenance_date, mileage, maintenance_type, notes
    ) VALUES ($1, $2, $3, $4, $5)`,
    [
      vehicleId,
      recordedAt,
      mileage,
      'Lectura odómetro',
      'Lectura al guardar km actual de la unidad'
    ]
  );
  return true;
}

const mapServiceItemRow = (row, effectiveKm) => {
  const st = computeKmServiceStatus(
    effectiveKm,
    row.next_due_km,
    row.warn_before_km,
    row.critical_before_km
  );
  const interval = computeIntervalProgress(
    effectiveKm,
    row.last_service_km,
    row.next_due_km,
    row.interval_km
  );
  const last = parseInt(row.last_service_km, 10);
  const next = parseInt(row.next_due_km, 10);
  const intervalN = parseInt(row.interval_km, 10);
  const nextMismatch =
    Number.isFinite(last) &&
    Number.isFinite(next) &&
    Number.isFinite(intervalN) &&
    next !== last + intervalN;

  return {
    id: row.id,
    vehicle_id: row.vehicle_id,
    title: row.title,
    item_kind: row.item_kind,
    next_due_km: row.next_due_km,
    warn_before_km: row.warn_before_km,
    critical_before_km: row.critical_before_km,
    interval_km: row.interval_km,
    last_service_km: row.last_service_km,
    last_service_date: row.last_service_date,
    notes: row.notes,
    is_active: row.is_active,
    status: st.status,
    km_remaining: st.kmRemaining,
    interval_progress_pct: interval.percent,
    interval_consumed_km: interval.consumedKm,
    interval_total_km: interval.totalKm,
    next_due_mismatch: nextMismatch,
    expected_next_due_km:
      Number.isFinite(last) && Number.isFinite(intervalN) ? last + intervalN : null
  };
};

const getFleetOverview = async (req, res) => {
  try {
    const vehiclesResult = await pool.query(`
      SELECT id, vehicle_code, brand, model, license_plate, fuel_type, status,
             current_mileage, current_mileage_at
      FROM vehicles
      WHERE COALESCE(status, 'Active') ILIKE 'active'
      ORDER BY vehicle_code NULLS LAST, license_plate
    `);

    const itemsResult = await pool.query(`
      SELECT * FROM vehicle_service_items
      WHERE is_active = TRUE
      ORDER BY vehicle_id, title
    `);

    const maintenanceResult = await pool.query(`
      SELECT m.*, v.vehicle_code
      FROM vehicle_maintenance m
      LEFT JOIN vehicles v ON m.vehicle_id = v.id
      ORDER BY m.maintenance_date DESC, m.id DESC
      LIMIT 500
    `);

    const itemsByVehicle = new Map();
    for (const row of itemsResult.rows) {
      const list = itemsByVehicle.get(row.vehicle_id) || [];
      list.push(row);
      itemsByVehicle.set(row.vehicle_id, list);
    }

    const maintByVehicle = new Map();
    for (const row of maintenanceResult.rows) {
      if (!row.vehicle_id) continue;
      const list = maintByVehicle.get(row.vehicle_id) || [];
      if (list.length < 5) list.push(row);
      maintByVehicle.set(row.vehicle_id, list);
    }

    const vehicles = vehiclesResult.rows.map((v) => {
      const rawItems = itemsByVehicle.get(v.id) || [];
      const recent = maintByVehicle.get(v.id) || [];
      const mileage = resolveEffectiveMileage(v.current_mileage, rawItems, recent);
      const serviceItems = rawItems.map((row) => mapServiceItemRow(row, mileage.effectiveKm));
      const worst = serviceItems.reduce((acc, it) => {
        const rank = { unknown: 0, ok: 1, warning: 2, critical: 3, overdue: 4 };
        return rank[it.status] > rank[acc] ? it.status : acc;
      }, 'ok');

      return {
        ...v,
        effective_mileage: mileage.effectiveKm,
        mileage_stale: mileage.mileageStale,
        mileage_source: mileage.mileageSource,
        service_items: serviceItems,
        fleet_status: serviceItems.length ? worst : 'unknown',
        recent_maintenance: recent
      };
    });

    res.json({ success: true, data: { vehicles } });
  } catch (error) {
    console.error('Error fetching fleet overview:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

const updateVehicleMileage = async (req, res) => {
  try {
    const { vehicleId } = req.params;
    const { current_mileage, current_mileage_at } = req.body;
    const km = current_mileage != null && current_mileage !== '' ? parseInt(current_mileage, 10) : null;
    if (km != null && (!Number.isFinite(km) || km < 0)) {
      return res.status(400).json({ success: false, error: 'Kilometraje inválido' });
    }
    const dateVal =
      current_mileage_at && /^\d{4}-\d{2}-\d{2}$/.test(String(current_mileage_at).slice(0, 10))
        ? String(current_mileage_at).slice(0, 10)
        : new Date().toISOString().slice(0, 10);

    const prevRes = await pool.query(
      'SELECT current_mileage, current_mileage_at FROM vehicles WHERE id = $1',
      [vehicleId]
    );
    if (!prevRes.rows.length) {
      return res.status(404).json({ success: false, error: 'Vehículo no encontrado' });
    }
    const prev = prevRes.rows[0];
    const prevKm = parseServiceKm(prev.current_mileage);
    const prevDate = normalizeServiceDate(prev.current_mileage_at);

    const result = await pool.query(
      `UPDATE vehicles SET
         current_mileage = $1,
         current_mileage_at = $2,
         updated_at = CURRENT_TIMESTAMP
       WHERE id = $3
       RETURNING *`,
      [km, km != null ? dateVal : null, vehicleId]
    );

    let historyLogged = false;
    if (
      km != null &&
      (prevKm !== km || prevDate !== dateVal)
    ) {
      historyLogged = await logOdometerReadingToHistory(vehicleId, km, dateVal);
    }

    res.json({ success: true, data: result.rows[0], history_logged: historyLogged });
  } catch (error) {
    console.error('Error updating vehicle mileage:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

const createServiceItem = async (req, res) => {
  try {
    const {
      vehicle_id,
      title,
      item_kind,
      next_due_km,
      warn_before_km,
      critical_before_km,
      interval_km,
      last_service_km,
      last_service_date,
      notes
    } = req.body;

    const result = await pool.query(
      `INSERT INTO vehicle_service_items (
        vehicle_id, title, item_kind, next_due_km, warn_before_km, critical_before_km,
        interval_km, last_service_km, last_service_date, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *`,
      [
        vehicle_id,
        title,
        item_kind || 'custom',
        next_due_km ?? null,
        warn_before_km ?? 5000,
        critical_before_km ?? 2000,
        interval_km ?? null,
        last_service_km ?? null,
        last_service_date || null,
        notes || null
      ]
    );
    const row = result.rows[0];
    if (last_service_km) {
      await bumpVehicleMileageIfHigher(vehicle_id, last_service_km, last_service_date);
    }
    let historyLogged = false;
    if (hasLastServiceEvent(last_service_km, last_service_date)) {
      historyLogged = await logServiceItemToMaintenanceHistory({
        vehicleId: vehicle_id,
        serviceItemId: row.id,
        title: row.title,
        lastServiceKm: last_service_km,
        lastServiceDate: last_service_date,
        nextDueKm: row.next_due_km,
        intervalKm: row.interval_km,
        notes
      });
    }
    res.status(201).json({ success: true, data: row, history_logged: historyLogged });
  } catch (error) {
    console.error('Error creating service item:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

const updateServiceItem = async (req, res) => {
  try {
    const { id } = req.params;
    const prevRes = await pool.query('SELECT * FROM vehicle_service_items WHERE id = $1', [id]);
    if (!prevRes.rows.length) {
      return res.status(404).json({ success: false, error: 'Servicio no encontrado' });
    }
    const prev = prevRes.rows[0];

    const {
      title,
      item_kind,
      next_due_km,
      warn_before_km,
      critical_before_km,
      interval_km,
      last_service_km,
      last_service_date,
      notes,
      is_active
    } = req.body;

    const result = await pool.query(
      `UPDATE vehicle_service_items SET
        title = COALESCE($1, title),
        item_kind = COALESCE($2, item_kind),
        next_due_km = $3,
        warn_before_km = COALESCE($4, warn_before_km),
        critical_before_km = COALESCE($5, critical_before_km),
        interval_km = $6,
        last_service_km = $7,
        last_service_date = $8,
        notes = $9,
        is_active = COALESCE($10, is_active),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $11
      RETURNING *`,
      [
        title,
        item_kind,
        next_due_km ?? null,
        warn_before_km,
        critical_before_km,
        interval_km ?? null,
        last_service_km ?? null,
        last_service_date || null,
        notes,
        is_active,
        id
      ]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Servicio no encontrado' });
    }
    const row = result.rows[0];
    if (last_service_km) {
      await bumpVehicleMileageIfHigher(row.vehicle_id, last_service_km, last_service_date);
    }

    const nextSnapshot = {
      last_service_km: last_service_km ?? null,
      last_service_date: last_service_date || null
    };
    let historyLogged = false;
    if (
      lastServiceEventChanged(prev, nextSnapshot) &&
      hasLastServiceEvent(last_service_km, last_service_date)
    ) {
      historyLogged = await logServiceItemToMaintenanceHistory({
        vehicleId: row.vehicle_id,
        serviceItemId: row.id,
        title: row.title,
        lastServiceKm: last_service_km,
        lastServiceDate: last_service_date,
        nextDueKm: row.next_due_km,
        intervalKm: row.interval_km,
        notes
      });
    }

    res.json({ success: true, data: row, history_logged: historyLogged });
  } catch (error) {
    console.error('Error updating service item:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

const deleteServiceItem = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'UPDATE vehicle_service_items SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *',
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Servicio no encontrado' });
    }
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error deleting service item:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = {
  getFleetOverview,
  updateVehicleMileage,
  createServiceItem,
  updateServiceItem,
  deleteServiceItem,
  mapServiceItemRow
};
