const pool = require('../config/db');
const { getVehicleByPortalKey, vehiclePortalSummary } = require('../utils/vehiclePortalKey');
const { buildInspectionSummary } = require('../utils/inspectionSummary');

const INSPECTION_TYPES = ['pre_trip', 'post_trip', 'general'];
const STATUSES = ['in_progress', 'completed'];

function safeJson(value) {
  if (value == null) return {};
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch {
    return {};
  }
}

function mergePayload(existing, patch) {
  const base = safeJson(existing);
  const next = safeJson(patch);
  return {
    ...base,
    ...next,
    answers: {
      ...(base.answers || {}),
      ...(next.answers || {})
    }
  };
}

// --- Admin (mantenimiento) ---

const listInspections = async (req, res) => {
  try {
    const { vehicle_id, status, limit = '100' } = req.query;
    const params = [];
    const where = [];
    if (vehicle_id) {
      params.push(parseInt(vehicle_id, 10));
      where.push(`i.vehicle_id = $${params.length}`);
    }
    if (status && STATUSES.includes(status)) {
      params.push(status);
      where.push(`i.status = $${params.length}`);
    }
    const lim = Math.min(500, Math.max(1, parseInt(limit, 10) || 100));
    params.push(lim);

    const result = await pool.query(
      `SELECT
         i.id,
         i.vehicle_id,
         i.driver_name,
         i.inspection_type,
         i.status,
         i.mileage,
         i.current_step_index,
         i.summary,
         i.started_at,
         i.completed_at,
         i.created_at,
         v.vehicle_code,
         v.license_plate,
         v.brand,
         v.model
       FROM vehicle_inspections i
       LEFT JOIN vehicles v ON v.id = i.vehicle_id
       ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
       ORDER BY COALESCE(i.completed_at, i.updated_at) DESC NULLS LAST, i.id DESC
       LIMIT $${params.length}`,
      params
    );

    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('listInspections:', error);
    const msg = String(error.message || '');
    if (msg.includes('vehicle_inspections') && msg.includes('does not exist')) {
      return res.json({ success: true, data: [], tableMissing: true });
    }
    res.status(500).json({ success: false, error: error.message });
  }
};

const getInspectionById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT i.*, v.vehicle_code, v.license_plate, v.brand, v.model, v.vin_number
       FROM vehicle_inspections i
       LEFT JOIN vehicles v ON v.id = i.vehicle_id
       WHERE i.id = $1`,
      [id]
    );
    if (!result.rows[0]) {
      return res.status(404).json({ success: false, error: 'Inspección no encontrada' });
    }
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('getInspectionById:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// --- Portal chofer ---

const getPortalInspectionContext = async (req, res) => {
  try {
    const vehicle = await getVehicleByPortalKey(req.params.vehicleKey);
    if (!vehicle) {
      return res.status(404).json({ success: false, error: 'Unidad no encontrada' });
    }

    let inProgress = null;
    try {
      const open = await pool.query(
        `SELECT id, driver_name, inspection_type, current_step_index, payload, mileage, started_at
         FROM vehicle_inspections
         WHERE vehicle_id = $1 AND status = 'in_progress'
         ORDER BY updated_at DESC
         LIMIT 1`,
        [vehicle.id]
      );
      inProgress = open.rows[0] || null;
    } catch (err) {
      console.warn('[inspection portal] in_progress:', err.message);
    }

    res.json({
      success: true,
      data: {
        vehicle: vehiclePortalSummary(vehicle),
        inProgressInspection: inProgress,
        inspectionTypes: INSPECTION_TYPES
      }
    });
  } catch (error) {
    console.error('getPortalInspectionContext:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

const createPortalInspection = async (req, res) => {
  try {
    const vehicle = await getVehicleByPortalKey(req.params.vehicleKey);
    if (!vehicle) {
      return res.status(404).json({ success: false, error: 'Unidad no encontrada' });
    }

    const {
      driver_name,
      inspection_type,
      mileage,
      payload,
      current_step_index
    } = req.body;

    const type = INSPECTION_TYPES.includes(inspection_type) ? inspection_type : 'pre_trip';
    const km =
      mileage != null && mileage !== '' && Number.isFinite(parseInt(mileage, 10))
        ? parseInt(mileage, 10)
        : null;

    const result = await pool.query(
      `INSERT INTO vehicle_inspections (
        vehicle_id, driver_name, inspection_type, status, mileage,
        current_step_index, payload
      ) VALUES ($1, $2, $3, 'in_progress', $4, $5, $6)
      RETURNING *`,
      [
        vehicle.id,
        driver_name?.trim() || null,
        type,
        km,
        Number.isFinite(parseInt(current_step_index, 10))
          ? parseInt(current_step_index, 10)
          : 0,
        JSON.stringify(safeJson(payload))
      ]
    );

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('createPortalInspection:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

const updatePortalInspection = async (req, res) => {
  try {
    const vehicle = await getVehicleByPortalKey(req.params.vehicleKey);
    if (!vehicle) {
      return res.status(404).json({ success: false, error: 'Unidad no encontrada' });
    }

    const inspectionId = parseInt(req.params.inspectionId, 10);
    const existing = await pool.query(
      `SELECT * FROM vehicle_inspections WHERE id = $1 AND vehicle_id = $2`,
      [inspectionId, vehicle.id]
    );
    if (!existing.rows[0]) {
      return res.status(404).json({ success: false, error: 'Inspección no encontrada' });
    }
    if (existing.rows[0].status === 'completed') {
      return res.status(400).json({ success: false, error: 'La inspección ya está finalizada' });
    }

    const {
      driver_name,
      inspection_type,
      mileage,
      payload,
      current_step_index
    } = req.body;

    const mergedPayload = mergePayload(existing.rows[0].payload, payload);
    const type =
      inspection_type && INSPECTION_TYPES.includes(inspection_type)
        ? inspection_type
        : existing.rows[0].inspection_type;

    const km =
      mileage !== undefined
        ? mileage != null && mileage !== '' && Number.isFinite(parseInt(mileage, 10))
          ? parseInt(mileage, 10)
          : null
        : existing.rows[0].mileage;

    const step =
      current_step_index !== undefined && Number.isFinite(parseInt(current_step_index, 10))
        ? parseInt(current_step_index, 10)
        : existing.rows[0].current_step_index;

    const result = await pool.query(
      `UPDATE vehicle_inspections SET
        driver_name = COALESCE($1, driver_name),
        inspection_type = $2,
        mileage = $3,
        current_step_index = $4,
        payload = $5,
        updated_at = CURRENT_TIMESTAMP
       WHERE id = $6
       RETURNING *`,
      [
        driver_name?.trim() || existing.rows[0].driver_name,
        type,
        km,
        step,
        JSON.stringify(mergedPayload),
        inspectionId
      ]
    );

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('updatePortalInspection:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

const completePortalInspection = async (req, res) => {
  try {
    const vehicle = await getVehicleByPortalKey(req.params.vehicleKey);
    if (!vehicle) {
      return res.status(404).json({ success: false, error: 'Unidad no encontrada' });
    }

    const inspectionId = parseInt(req.params.inspectionId, 10);
    const existing = await pool.query(
      `SELECT * FROM vehicle_inspections WHERE id = $1 AND vehicle_id = $2`,
      [inspectionId, vehicle.id]
    );
    if (!existing.rows[0]) {
      return res.status(404).json({ success: false, error: 'Inspección no encontrada' });
    }

    const finalPayload = mergePayload(existing.rows[0].payload, req.body?.payload);
    const summary = buildInspectionSummary(finalPayload);

    const result = await pool.query(
      `UPDATE vehicle_inspections SET
        status = 'completed',
        payload = $1,
        summary = $2,
        completed_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP,
        current_step_index = $3
       WHERE id = $4
       RETURNING *`,
      [JSON.stringify(finalPayload), JSON.stringify(summary), req.body?.current_step_index ?? 999, inspectionId]
    );

    res.json({ success: true, data: result.rows[0], summary });
  } catch (error) {
    console.error('completePortalInspection:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = {
  listInspections,
  getInspectionById,
  getPortalInspectionContext,
  createPortalInspection,
  updatePortalInspection,
  completePortalInspection
};
