const pool = require('../config/db');

// Get all drivers
const getAllDrivers = async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM drivers ORDER BY name'
    );
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error fetching drivers:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Get driver by ID
const getDriverById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM drivers WHERE id = $1', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Driver not found' });
    }
    
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error fetching driver:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Create new driver
const createDriver = async (req, res) => {
  try {
    const { name, license_number, documents, phone, email, status } = req.body;
    
    if (!name) {
      return res.status(400).json({ success: false, error: 'Name is required' });
    }
    
    const result = await pool.query(
      `INSERT INTO drivers (name, license_number, documents, phone, email, status)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [name, license_number, documents, phone, email, status || 'Active']
    );
    
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error creating driver:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Update driver
const updateDriver = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, license_number, documents, phone, email, status } = req.body;
    
    const result = await pool.query(
      `UPDATE drivers SET
        name = $1, license_number = $2, documents = $3, phone = $4,
        email = $5, status = $6, updated_at = CURRENT_TIMESTAMP
      WHERE id = $7
      RETURNING *`,
      [name, license_number, documents, phone, email, status, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Driver not found' });
    }
    
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error updating driver:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Delete driver
const deleteDriver = async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query('DELETE FROM drivers WHERE id = $1 RETURNING *', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Driver not found' });
    }
    
    res.json({ success: true, message: 'Driver deleted successfully' });
  } catch (error) {
    console.error('Error deleting driver:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = {
  getAllDrivers,
  getDriverById,
  createDriver,
  updateDriver,
  deleteDriver
};
