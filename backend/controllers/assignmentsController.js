const pool = require('../config/db');

const safeJsonParse = (value) => {
  if (!value || typeof value !== 'string') return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
};

const safeJsonStringify = (value) => {
  try {
    return JSON.stringify(value);
  } catch {
    return null;
  }
};

// Get all assignments
const getAllAssignments = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        a.*,
        co.contract_number,
        co.origin,
        co.destination,
        co.total_amount,
        c.name AS client_name,
        d.name AS driver_name,
        v.vehicle_code,
        v.license_plate
      FROM assignments a
      LEFT JOIN contracts co ON a.contract_id = co.id
      LEFT JOIN clients c ON co.client_id = c.id
      LEFT JOIN drivers d ON a.driver_id = d.id
      LEFT JOIN vehicles v ON a.vehicle_id = v.id
      ORDER BY a.driving_date DESC
    `);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error fetching assignments:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Get assignment by ID
const getAssignmentById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(`
      SELECT
        a.*,
        co.contract_number,
        co.origin,
        co.destination,
        co.total_amount,
        c.name AS client_name,
        d.name AS driver_name,
        v.vehicle_code,
        v.license_plate
      FROM assignments a
      LEFT JOIN contracts co ON a.contract_id = co.id
      LEFT JOIN clients c ON co.client_id = c.id
      LEFT JOIN drivers d ON a.driver_id = d.id
      LEFT JOIN vehicles v ON a.vehicle_id = v.id
      WHERE a.id = $1
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Assignment not found' });
    }
    
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error fetching assignment:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Create new assignment
const createAssignment = async (req, res) => {
  try {
    const {
      contract_id, driver_id, vehicle_id, assigned_date,
      driving_date, external_company_id, notes
    } = req.body;
    
    const result = await pool.query(
      `INSERT INTO assignments (
        contract_id, driver_id, vehicle_id, assigned_date,
        driving_date, external_company_id, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *`,
      [contract_id, driver_id, vehicle_id, assigned_date, driving_date, external_company_id, notes]
    );

    // Operational convenience: store assignment info inside the contract notes JSON (best-effort)
    try {
      const [contractRes, driverRes, vehicleRes] = await Promise.all([
        pool.query('SELECT notes FROM contracts WHERE id = $1', [contract_id]),
        driver_id ? pool.query('SELECT id, name FROM drivers WHERE id = $1', [driver_id]) : Promise.resolve({ rows: [] }),
        vehicle_id ? pool.query('SELECT id, vehicle_code, license_plate, vehicle_type, model FROM vehicles WHERE id = $1', [vehicle_id]) : Promise.resolve({ rows: [] }),
      ]);

      const existingNotesText = contractRes.rows[0]?.notes || null;
      const existingNotesJson = safeJsonParse(existingNotesText);

      const driver = driverRes.rows[0] || null;
      const vehicle = vehicleRes.rows[0] || null;

      const merged = {
        ...(existingNotesJson && typeof existingNotesJson === 'object' ? existingNotesJson : {}),
        assignment: {
          contract_id,
          driver_id: driver?.id || driver_id || null,
          driver_name: driver?.name || null,
          vehicle_id: vehicle?.id || vehicle_id || null,
          vehicle_code: vehicle?.vehicle_code || null,
          license_plate: vehicle?.license_plate || null,
          assigned_date: assigned_date || null,
          driving_date: driving_date || null,
        },
      };

      const nextNotesText = safeJsonStringify(merged);
      if (nextNotesText) {
        await pool.query('UPDATE contracts SET notes = $1 WHERE id = $2', [nextNotesText, contract_id]);
      }
    } catch (e) {
      // Do not fail assignment creation if this fails
      console.error('Warning: could not update contract notes with assignment:', e.message);
    }

    const joined = await pool.query(
      `SELECT
         a.*,
         co.contract_number,
         co.origin,
         co.destination,
         co.total_amount,
         c.name AS client_name,
         d.name as driver_name,
         v.vehicle_code,
         v.license_plate
       FROM assignments a
       LEFT JOIN contracts co ON a.contract_id = co.id
       LEFT JOIN clients c ON co.client_id = c.id
       LEFT JOIN drivers d ON a.driver_id = d.id
       LEFT JOIN vehicles v ON a.vehicle_id = v.id
       WHERE a.id = $1`,
      [result.rows[0].id]
    );

    res.status(201).json({ success: true, data: joined.rows[0] || result.rows[0] });
  } catch (error) {
    console.error('Error creating assignment:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Update assignment
const updateAssignment = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      contract_id, driver_id, vehicle_id, assigned_date,
      driving_date, external_company_id, notes
    } = req.body;
    
    const result = await pool.query(
      `UPDATE assignments SET
        contract_id = $1, driver_id = $2, vehicle_id = $3, assigned_date = $4,
        driving_date = $5, external_company_id = $6, notes = $7,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $8
      RETURNING *`,
      [contract_id, driver_id, vehicle_id, assigned_date, driving_date, external_company_id, notes, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Assignment not found' });
    }
    
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error updating assignment:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Delete assignment
const deleteAssignment = async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query('DELETE FROM assignments WHERE id = $1 RETURNING *', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Assignment not found' });
    }
    
    res.json({ success: true, message: 'Assignment deleted successfully' });
  } catch (error) {
    console.error('Error deleting assignment:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = {
  getAllAssignments,
  getAssignmentById,
  createAssignment,
  updateAssignment,
  deleteAssignment
};
