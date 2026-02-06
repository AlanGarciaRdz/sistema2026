const pool = require('../config/db');

// Get all vehicles
const getAllVehicles = async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM vehicles ORDER BY vehicle_code'
    );
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error fetching vehicles:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Get vehicle by ID
const getVehicleById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM vehicles WHERE id = $1', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Vehicle not found' });
    }
    
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error fetching vehicle:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Create new vehicle
const createVehicle = async (req, res) => {
  try {
    const {
      vehicle_code, brand, model, year, vehicle_type, license_plate,
      vin_number, motor, acquisition_date, acquisition_cost, sale_date,
      sale_price, insurance_policy, insurance_company, insurance_expiry,
      passenger_capacity, fuel_type, drivedocs, status, notes
    } = req.body;
    
    const result = await pool.query(
      `INSERT INTO vehicles (
        vehicle_code, brand, model, year, vehicle_type, license_plate,
        vin_number, motor, acquisition_date, acquisition_cost, sale_date,
        sale_price, insurance_policy, insurance_company, insurance_expiry,
        passenger_capacity, fuel_type, drivedocs, status, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
      RETURNING *`,
      [
        vehicle_code, brand, model, year, vehicle_type, license_plate,
        vin_number, motor, acquisition_date, acquisition_cost, sale_date,
        sale_price, insurance_policy, insurance_company, insurance_expiry,
        passenger_capacity, fuel_type, drivedocs, status || 'Active', notes
      ]
    );
    
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error creating vehicle:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Update vehicle
const updateVehicle = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      vehicle_code, brand, model, year, vehicle_type, license_plate,
      vin_number, motor, acquisition_date, acquisition_cost, sale_date,
      sale_price, insurance_policy, insurance_company, insurance_expiry,
      passenger_capacity, fuel_type, drivedocs, status, notes
    } = req.body;
    
    const result = await pool.query(
      `UPDATE vehicles SET
        vehicle_code = $1, brand = $2, model = $3, year = $4, vehicle_type = $5,
        license_plate = $6, vin_number = $7, motor = $8, acquisition_date = $9,
        acquisition_cost = $10, sale_date = $11, sale_price = $12,
        insurance_policy = $13, insurance_company = $14, insurance_expiry = $15,
        passenger_capacity = $16, fuel_type = $17, drivedocs = $18, status = $19,
        notes = $20, updated_at = CURRENT_TIMESTAMP
      WHERE id = $21
      RETURNING *`,
      [
        vehicle_code, brand, model, year, vehicle_type, license_plate,
        vin_number, motor, acquisition_date, acquisition_cost, sale_date,
        sale_price, insurance_policy, insurance_company, insurance_expiry,
        passenger_capacity, fuel_type, drivedocs, status, notes, id
      ]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Vehicle not found' });
    }
    
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error updating vehicle:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Delete vehicle
const deleteVehicle = async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query('DELETE FROM vehicles WHERE id = $1 RETURNING *', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Vehicle not found' });
    }
    
    res.json({ success: true, message: 'Vehicle deleted successfully' });
  } catch (error) {
    console.error('Error deleting vehicle:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = {
  getAllVehicles,
  getVehicleById,
  createVehicle,
  updateVehicle,
  deleteVehicle
};
