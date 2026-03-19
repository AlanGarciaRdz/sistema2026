const pool = require('../config/db');

// Get all maintenance records
const getAllMaintenance = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT m.*, v.vehicle_code, v.brand, v.model, v.license_plate,
        COALESCE(v.vehicle_code, v.license_plate, 'N/A') as vehicle_label,
        pa.account_name
      FROM vehicle_maintenance m
      LEFT JOIN vehicles v ON m.vehicle_id = v.id
      LEFT JOIN payment_accounts pa ON m.payment_account_id = pa.id
      ORDER BY m.maintenance_date DESC
    `);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error fetching maintenance:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Get maintenance by ID
const getMaintenanceById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(`
      SELECT m.*, v.vehicle_code, v.brand, v.model, v.license_plate, pa.account_name
      FROM vehicle_maintenance m
      LEFT JOIN vehicles v ON m.vehicle_id = v.id
      LEFT JOIN payment_accounts pa ON m.payment_account_id = pa.id
      WHERE m.id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Maintenance record not found' });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error fetching maintenance:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Create new maintenance record
const createMaintenance = async (req, res) => {
  try {
    const {
      vehicle_id, maintenance_date, mileage, maintenance_type,
      cost, payment_account_id, notes
    } = req.body;

    const result = await pool.query(
      `INSERT INTO vehicle_maintenance (
        vehicle_id, maintenance_date, mileage, maintenance_type,
        cost, payment_account_id, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *`,
      [vehicle_id, maintenance_date, mileage || null, maintenance_type, cost || null, payment_account_id || null, notes]
    );

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error creating maintenance:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Update maintenance record
const updateMaintenance = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      vehicle_id, maintenance_date, mileage, maintenance_type,
      cost, payment_account_id, notes
    } = req.body;

    const result = await pool.query(
      `UPDATE vehicle_maintenance SET
        vehicle_id = $1, maintenance_date = $2, mileage = $3, maintenance_type = $4,
        cost = $5, payment_account_id = $6, notes = $7,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $8
      RETURNING *`,
      [vehicle_id, maintenance_date, mileage || null, maintenance_type, cost || null, payment_account_id || null, notes, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Maintenance record not found' });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error updating maintenance:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Delete maintenance record
const deleteMaintenance = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query('DELETE FROM vehicle_maintenance WHERE id = $1 RETURNING *', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Maintenance record not found' });
    }

    res.json({ success: true, message: 'Maintenance record deleted successfully' });
  } catch (error) {
    console.error('Error deleting maintenance:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = {
  getAllMaintenance,
  getMaintenanceById,
  createMaintenance,
  updateMaintenance,
  deleteMaintenance
};
