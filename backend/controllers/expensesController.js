const pool = require('../config/db');

// Get all expenses
const getAllExpenses = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT e.*, co.contract_number, pa.account_name
      FROM expenses e
      LEFT JOIN contracts co ON e.contract_id = co.id
      LEFT JOIN payment_accounts pa ON e.payment_account_id = pa.id
      ORDER BY e.expense_date DESC
    `);
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
      SELECT e.*, co.contract_number, pa.account_name
      FROM expenses e
      LEFT JOIN contracts co ON e.contract_id = co.id
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
        business_unit, expense_date, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *`,
      [contract_id, expense_type, amount, payment_account_id, business_unit, expense_date, notes]
    );
    
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error creating expense:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Update expense
const updateExpense = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      contract_id, expense_type, amount, payment_account_id,
      business_unit, expense_date, notes
    } = req.body;
    
    const result = await pool.query(
      `UPDATE expenses SET
        contract_id = $1, expense_type = $2, amount = $3, payment_account_id = $4,
        business_unit = $5, expense_date = $6, notes = $7,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $8
      RETURNING *`,
      [contract_id, expense_type, amount, payment_account_id, business_unit, expense_date, notes, id]
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
  updateExpense,
  deleteExpense
};
