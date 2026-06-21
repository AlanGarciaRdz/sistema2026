/**
 * Portal público para que choferes reporten incidentes de una unidad (sin login).
 * Acceso por código/placas de unidad en la URL.
 */
const pool = require('../config/db');

const INCIDENT_TYPES = ['crash', 'noise', 'damage', 'mechanical', 'other'];
const SEVERITIES = ['low', 'moderate', 'high'];

async function getVehicleByPortalKey(portalKey) {
  const raw = decodeURIComponent(String(portalKey || '').trim());
  if (!raw) return null;

  // ID numérico (link recomendado: /sistema/u/1)
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

const getVehicleReportPortal = async (req, res) => {
  try {
    const vehicle = await getVehicleByPortalKey(req.params.vehicleKey);
    if (!vehicle) {
      return res.status(404).json({ success: false, error: 'Unidad no encontrada' });
    }

    let recentReports = [];
    try {
      const reportsResult = await pool.query(
        `SELECT id, report_date, reported_by, report_type, title, description,
                severity, mileage, status, created_at
         FROM vehicle_incident_reports
         WHERE vehicle_id = $1
         ORDER BY report_date DESC, id DESC
         LIMIT 20`,
        [vehicle.id]
      );
      recentReports = reportsResult.rows;
    } catch (err) {
      console.warn('[vehicleReportPortal] reports list:', err.message);
    }

    res.json({
      success: true,
      data: {
        vehicle: {
          id: vehicle.id,
          vehicle_code: vehicle.vehicle_code,
          brand: vehicle.brand,
          model: vehicle.model,
          license_plate: vehicle.license_plate,
          current_mileage: vehicle.current_mileage
        },
        recentReports
      }
    });
  } catch (error) {
    console.error('Error vehicle report portal GET:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

const postVehicleReport = async (req, res) => {
  try {
    const vehicle = await getVehicleByPortalKey(req.params.vehicleKey);
    if (!vehicle) {
      return res.status(404).json({ success: false, error: 'Unidad no encontrada' });
    }

    const {
      report_date,
      reported_by,
      report_type,
      title,
      description,
      severity,
      mileage
    } = req.body;

    if (!report_date || !reported_by?.trim() || !title?.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Fecha, tu nombre y resumen del reporte son obligatorios'
      });
    }

    const type = INCIDENT_TYPES.includes(report_type) ? report_type : 'other';
    const sev = SEVERITIES.includes(severity) ? severity : 'moderate';
    const km =
      mileage != null && mileage !== '' && Number.isFinite(parseInt(mileage, 10))
        ? parseInt(mileage, 10)
        : null;

    const result = await pool.query(
      `INSERT INTO vehicle_incident_reports (
        vehicle_id, report_date, reported_by, report_type, title, description,
        severity, mileage, status, resolution_notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'open', $9)
      RETURNING *`,
      [
        vehicle.id,
        report_date,
        String(reported_by).trim(),
        type,
        String(title).trim(),
        description?.trim() || null,
        sev,
        km,
        'Enviado desde portal del chofer'
      ]
    );

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error vehicle report portal POST:', error);
    const msg = String(error.message || '');
    if (msg.includes('vehicle_incident_reports') && msg.includes('does not exist')) {
      return res.status(503).json({
        success: false,
        error: 'El sistema de reportes no está configurado en el servidor'
      });
    }
    res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = {
  getVehicleReportPortal,
  postVehicleReport
};
