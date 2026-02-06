const pool = require('../config/db');

// Get all assignments
const getAllAssignments = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT a.*, co.contract_number, d.name as driver_name, v.vehicle_code
      FROM assignments a
      LEFT JOIN contracts co ON a.contract_id = co.id
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
      SELECT a.*, co.contract_number, d.name as driver_name, v.vehicle_code
      FROM assignments a
      LEFT JOIN contracts co ON a.contract_id = co.id
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
    
    res.status(201).json({ success: true, data: result.rows[0] });
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
