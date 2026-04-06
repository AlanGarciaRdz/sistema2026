const { randomUUID } = require('crypto');
const pool = require('../config/db');
const {
  PAYMENT_TYPE_INTERNAL,
  EXPENSE_TYPE_INTERNAL,
  deletePairExpenseForPayment
} = require('../utils/accountTransfers');

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

// Transferencia entre cuentas: egreso en origen + ingreso en destino (mismo monto, vinculados)
const createAccountTransfer = async (req, res) => {
  const { from_account_id, to_account_id, amount, transfer_date, note } = req.body;
  const fromId = parseInt(from_account_id, 10);
  const toId = parseInt(to_account_id, 10);
  const amt = parseFloat(amount);

  if (!Number.isFinite(fromId) || !Number.isFinite(toId) || fromId === toId) {
    return res.status(400).json({ success: false, error: 'Seleccione dos cuentas distintas' });
  }
  if (!Number.isFinite(amt) || amt <= 0) {
    return res.status(400).json({ success: false, error: 'Monto inválido' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const accRows = await client.query(
      `SELECT id, business_unit, account_name, bank_name FROM payment_accounts WHERE id IN ($1, $2)`,
      [fromId, toId]
    );
    if (accRows.rows.length !== 2) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, error: 'Una o ambas cuentas no existen' });
    }

    const fromAcc = accRows.rows.find((r) => r.id === fromId);
    const toAcc = accRows.rows.find((r) => r.id === toId);
    const pairId = randomUUID();
    const dateStr = transfer_date || new Date().toISOString().slice(0, 10);

    const baseMeta = note && String(note).trim()
      ? { user_note: String(note).trim() }
      : {};

    const expenseNotes = JSON.stringify({
      transfer_pair_id: pairId,
      transfer_to_account_id: toId,
      transfer_to_name: toAcc.account_name,
      ...baseMeta
    });
    const paymentNotes = JSON.stringify({
      transfer_pair_id: pairId,
      transfer_from_account_id: fromId,
      transfer_from_name: fromAcc.account_name,
      ...baseMeta
    });

    const biz = fromAcc.business_unit || null;

    await client.query(
      `INSERT INTO expenses (
        contract_id, expense_type, amount, payment_account_id,
        business_unit, expense_date, notes, validation_status, driver_payment_method
      ) VALUES (NULL, $1, $2, $3, $4, $5, $6, 'approved', NULL)`,
      [EXPENSE_TYPE_INTERNAL, amt, fromId, biz, dateStr, expenseNotes]
    );

    await client.query(
      `INSERT INTO payments (
        contract_id, contract_number, payment_type, amount, payment_method,
        payment_account_id, payment_date, invoice_number, iva_amount, notes
      ) VALUES (NULL, NULL, $1, $2, $3, $4, $5, NULL, NULL, $6)`,
      [PAYMENT_TYPE_INTERNAL, amt, 'Transferencia', toId, dateStr, paymentNotes]
    );

    await client.query('COMMIT');
    res.status(201).json({
      success: true,
      message: 'Transferencia registrada',
      data: { transfer_pair_id: pairId }
    });
  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch (_) {}
    console.error('Error creating account transfer:', error);
    res.status(500).json({ success: false, error: error.message });
  } finally {
    client.release();
  }
};

// Delete payment
const deletePayment = async (req, res) => {
  try {
    const { id } = req.params;

    const sel = await pool.query(
      'SELECT id, notes, payment_type FROM payments WHERE id = $1',
      [id]
    );
    if (sel.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Payment not found' });
    }
    const row = sel.rows[0];
    if (row.payment_type === PAYMENT_TYPE_INTERNAL) {
      await deletePairExpenseForPayment(row.notes);
    }

    await pool.query('DELETE FROM payments WHERE id = $1', [id]);

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
  createAccountTransfer,
  updatePayment,
  deletePayment
};
