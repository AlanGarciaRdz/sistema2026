const pool = require('../config/db');

// Get all expenses (?validation_status=pending|approved|rejected)
const getAllExpenses = async (req, res) => {
  try {
    const { validation_status, limit } = req.query;
    let sql = `
      SELECT e.*, co.contract_number,
        co.origin AS contract_origin, co.destination AS contract_destination,
        c.name AS client_name, pa.account_name
      FROM expenses e
      LEFT JOIN contracts co ON e.contract_id = co.id
      LEFT JOIN clients c ON co.client_id = c.id
      LEFT JOIN payment_accounts pa ON e.payment_account_id = pa.id
    `;
    const params = [];
    if (validation_status) {
      params.push(validation_status);
      sql += ` WHERE e.validation_status = $${params.length}`;
    }
    sql += ' ORDER BY e.expense_date DESC, e.id DESC';
    const lim = parseInt(limit, 10);
    if (!Number.isNaN(lim) && lim > 0 && lim <= 500) {
      params.push(lim);
      sql += ` LIMIT $${params.length}`;
    }
    const result = await pool.query(sql, params);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error fetching expenses:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Get expense by ID
const getExpenseById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(`
      SELECT e.*, co.contract_number,
        co.origin AS contract_origin, co.destination AS contract_destination,
        c.name AS client_name, pa.account_name
      FROM expenses e
      LEFT JOIN contracts co ON e.contract_id = co.id
      LEFT JOIN clients c ON co.client_id = c.id
      LEFT JOIN payment_accounts pa ON e.payment_account_id = pa.id
      WHERE e.id = $1
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Expense not found' });
    }
    
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error fetching expense:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Create new expense
const createExpense = async (req, res) => {
  try {
    const {
      contract_id, expense_type, amount, payment_account_id,
      business_unit, expense_date, notes
    } = req.body;
    
    const result = await pool.query(
      `INSERT INTO expenses (
        contract_id, expense_type, amount, payment_account_id,
        business_unit, expense_date, notes, validation_status, driver_payment_method
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, COALESCE($8, 'approved'), $9)
      RETURNING *`,
      [
        contract_id, expense_type, amount, payment_account_id, business_unit, expense_date, notes,
        req.body.validation_status,
        req.body.driver_payment_method || null
      ]
    );
    
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error creating expense:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Validar gasto del chofer (solo pending)
const validateExpense = async (req, res) => {
  try {
    const { id } = req.params;
    const { action, payment_account_id, business_unit } = req.body;

    const cur = await pool.query(
      'SELECT id, validation_status FROM expenses WHERE id = $1',
      [id]
    );
    if (cur.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Gasto no encontrado' });
    }
    if (cur.rows[0].validation_status !== 'pending') {
      return res.status(400).json({ success: false, error: 'Solo se validan gastos pendientes' });
    }

    if (action === 'reject') {
      const result = await pool.query(
        `UPDATE expenses SET validation_status = 'rejected', updated_at = CURRENT_TIMESTAMP
         WHERE id = $1 RETURNING *`,
        [id]
      );
      return res.json({ success: true, data: result.rows[0] });
    }

    if (action !== 'approve') {
      return res.status(400).json({ success: false, error: 'action debe ser approve o reject' });
    }
    if (!payment_account_id) {
      return res.status(400).json({ success: false, error: 'Seleccione cuenta al aprobar' });
    }

    let bu = business_unit || null;
    if (!bu) {
      const pa = await pool.query(
        'SELECT business_unit FROM payment_accounts WHERE id = $1',
        [payment_account_id]
      );
      bu = pa.rows[0]?.business_unit || null;
    }

    const result = await pool.query(
      `UPDATE expenses SET
        validation_status = 'approved',
        payment_account_id = $1,
        business_unit = $2,
        updated_at = CURRENT_TIMESTAMP
       WHERE id = $3
       RETURNING *`,
      [payment_account_id, bu, id]
    );

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error validating expense:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Update expense
const updateExpense = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      contract_id, expense_type, amount, payment_account_id,
      business_unit, expense_date, notes, validation_status, driver_payment_method
    } = req.body;
    
    const result = await pool.query(
      `UPDATE expenses SET
        contract_id = $1, expense_type = $2, amount = $3, payment_account_id = $4,
        business_unit = $5, expense_date = $6, notes = $7,
        validation_status = COALESCE($8, validation_status),
        driver_payment_method = COALESCE($9, driver_payment_method),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $10
      RETURNING *`,
      [
        contract_id, expense_type, amount, payment_account_id, business_unit, expense_date, notes,
        validation_status || null,
        driver_payment_method !== undefined ? driver_payment_method : null,
        id
      ]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Expense not found' });
    }
    
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error updating expense:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Delete expense
const deleteExpense = async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query('DELETE FROM expenses WHERE id = $1 RETURNING *', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Expense not found' });
    }
    
    res.json({ success: true, message: 'Expense deleted successfully' });
  } catch (error) {
    console.error('Error deleting expense:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = {
  getAllExpenses,
  getExpenseById,
  createExpense,
  validateExpense,
  updateExpense,
  deleteExpense
};
