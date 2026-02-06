const pool = require('../config/db');

// Get all contracts
const getAllContracts = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT co.*, c.name as client_name, q.quote_number
      FROM contracts co
      LEFT JOIN clients c ON co.client_id = c.id
      LEFT JOIN quotes q ON co.quote_id = q.id
      ORDER BY co.created_at DESC
    `);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error fetching contracts:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Get contract by ID
const getContractById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(`
      SELECT co.*, c.name as client_name, q.quote_number
      FROM contracts co
      LEFT JOIN clients c ON co.client_id = c.id
      LEFT JOIN quotes q ON co.quote_id = q.id
      WHERE co.id = $1
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Contract not found' });
    }
    
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error fetching contract:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Create new contract
const createContract = async (req, res) => {
  try {
    const {
      contract_number, quote_id, client_id, start_date, end_date,
      origin, destination, itinerary, passenger_count, total_amount, status
    } = req.body;
    
    if (!contract_number) {
      return res.status(400).json({ success: false, error: 'Contract number is required' });
    }
    
    const result = await pool.query(
      `INSERT INTO contracts (
        contract_number, quote_id, client_id, start_date, end_date,
        origin, destination, itinerary, passenger_count, total_amount, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *`,
      [
        contract_number, quote_id, client_id, start_date, end_date,
        origin, destination, itinerary, passenger_count, total_amount,
        status || 'Agendado'
      ]
    );
    
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error creating contract:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Update contract
const updateContract = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      contract_number, quote_id, client_id, start_date, end_date,
      origin, destination, itinerary, passenger_count, total_amount, status
    } = req.body;
    
    const result = await pool.query(
      `UPDATE contracts SET
        contract_number = $1, quote_id = $2, client_id = $3, start_date = $4,
        end_date = $5, origin = $6, destination = $7, itinerary = $8,
        passenger_count = $9, total_amount = $10, status = $11,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $12
      RETURNING *`,
      [
        contract_number, quote_id, client_id, start_date, end_date,
        origin, destination, itinerary, passenger_count, total_amount,
        status, id
      ]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Contract not found' });
    }
    
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error updating contract:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Delete contract
const deleteContract = async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query('DELETE FROM contracts WHERE id = $1 RETURNING *', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Contract not found' });
    }
    
    res.json({ success: true, message: 'Contract deleted successfully' });
  } catch (error) {
    console.error('Error deleting contract:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = {
  getAllContracts,
  getContractById,
  createContract,
  updateContract,
  deleteContract
};
