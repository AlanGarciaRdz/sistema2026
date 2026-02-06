const pool = require('../config/db');

// Get all payment accounts
const getAllPaymentAccounts = async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM payment_accounts ORDER BY account_code'
    );
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error fetching payment accounts:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Get payment account by ID
const getPaymentAccountById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'SELECT * FROM payment_accounts WHERE id = $1',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Payment account not found' });
    }
    
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error fetching payment account:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Create new payment account
const createPaymentAccount = async (req, res) => {
  try {
    const {
      account_code, account_name, account_type, bank_name,
      business_unit, status, notes
    } = req.body;
    
    if (!account_code || !account_name) {
      return res.status(400).json({
        success: false,
        error: 'Account code and name are required'
      });
    }
    
    const result = await pool.query(
      `INSERT INTO payment_accounts (
        account_code, account_name, account_type, bank_name,
        business_unit, status, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *`,
      [
        account_code, account_name, account_type, bank_name,
        business_unit, status || 'Active', notes
      ]
    );
    
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error creating payment account:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Update payment account
const updatePaymentAccount = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      account_code, account_name, account_type, bank_name,
      business_unit, status, notes
    } = req.body;
    
    const result = await pool.query(
      `UPDATE payment_accounts SET
        account_code = $1, account_name = $2, account_type = $3, bank_name = $4,
        business_unit = $5, status = $6, notes = $7,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $8
      RETURNING *`,
      [
        account_code, account_name, account_type, bank_name,
        business_unit, status, notes, id
      ]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Payment account not found' });
    }
    
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error updating payment account:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Delete payment account
const deletePaymentAccount = async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(
      'DELETE FROM payment_accounts WHERE id = $1 RETURNING *',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Payment account not found' });
    }
    
    res.json({ success: true, message: 'Payment account deleted successfully' });
  } catch (error) {
    console.error('Error deleting payment account:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = {
  getAllPaymentAccounts,
  getPaymentAccountById,
  createPaymentAccount,
  updatePaymentAccount,
  deletePaymentAccount
};
