const pool = require('../config/db');

// Get all payments
const getAllPayments = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT p.*, co.contract_number, pa.account_name
      FROM payments p
      LEFT JOIN contracts co ON p.contract_id = co.id
      LEFT JOIN payment_accounts pa ON p.payment_account_id = pa.id
      ORDER BY p.payment_date DESC
    `);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error fetching payments:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Get payments by contract number
const getPaymentsByContractNumber = async (req, res) => {
  try {
    const { contract_number } = req.params;
    const result = await pool.query(`
      SELECT p.*, co.contract_number, pa.account_name
      FROM payments p
      LEFT JOIN contracts co ON p.contract_id = co.id
      LEFT JOIN payment_accounts pa ON p.payment_account_id = pa.id
      WHERE p.contract_number = $1 OR co.contract_number = $1
      ORDER BY p.payment_date ASC
    `, [contract_number]);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error fetching payments by contract:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Get payment by ID
const getPaymentById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(`
      SELECT p.*, co.contract_number, pa.account_name
      FROM payments p
      LEFT JOIN contracts co ON p.contract_id = co.id
      LEFT JOIN payment_accounts pa ON p.payment_account_id = pa.id
      WHERE p.id = $1
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Payment not found' });
    }
    
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error fetching payment:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

const parseContractId = (value) => {
  if (value === undefined || value === null || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

// Create new payment
const createPayment = async (req, res) => {
  try {
    const {
      contract_id, quote_id, contract_number, payment_type, amount, payment_method,
      payment_account_id, payment_date, invoice_number, iva_amount, notes
    } = req.body;

    const cid = parseContractId(contract_id);
    const notesValue =
      notes != null && String(notes).trim() !== ''
        ? notes
        : quote_id != null && quote_id !== ''
          ? JSON.stringify({ quote_id: quote_id })
          : null;

    const result = await pool.query(
      `INSERT INTO payments (
        contract_id, contract_number, payment_type, amount, payment_method,
        payment_account_id, payment_date, invoice_number, iva_amount, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *`,
      [
        cid, contract_number, payment_type, amount, payment_method,
        payment_account_id, payment_date, invoice_number, iva_amount,
        notesValue
      ]
    );
    
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error creating payment:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Update payment
const updatePayment = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      contract_id, quote_id, contract_number, payment_type, amount, payment_method,
      payment_account_id, payment_date, invoice_number, iva_amount, notes
    } = req.body;
    
    const cid = parseContractId(contract_id);
    const notesValue =
      notes != null && String(notes).trim() !== ''
        ? notes
        : quote_id != null && quote_id !== ''
          ? JSON.stringify({ quote_id: quote_id })
          : null;

    const result = await pool.query(
      `UPDATE payments SET
        contract_id = $1, contract_number = $2, payment_type = $3, amount = $4,
        payment_method = $5, payment_account_id = $6, payment_date = $7,
        invoice_number = $8, iva_amount = $9, notes = $10,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $11
      RETURNING *`,
      [
        cid, contract_number, payment_type, amount, payment_method,
        payment_account_id, payment_date, invoice_number, iva_amount,
        notesValue, id
      ]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Payment not found' });
    }
    
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error updating payment:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Delete payment
const deletePayment = async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query('DELETE FROM payments WHERE id = $1 RETURNING *', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Payment not found' });
    }
    
    res.json({ success: true, message: 'Payment deleted successfully' });
  } catch (error) {
    console.error('Error deleting payment:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = {
  getAllPayments,
  getPaymentById,
  getPaymentsByContractNumber,
  createPayment,
  updatePayment,
  deletePayment
};
