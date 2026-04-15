/**
 * API del portal del chofer: sin autenticación por usuario/contraseña.
 * El acceso se limita por número de contrato en la URL; no añadir middleware de login aquí
 * salvo que se diseñe otro mecanismo (token por contrato, etc.).
 */
const pool = require('../config/db');

const PAYMENT_METHODS = [
  'Efectivo',
  'Depósito',
  'Transferencia',
  'Tarjeta'
];

const getContractByNumber = async (contractNumber) => {
  const r = await pool.query(
    `SELECT co.id, co.contract_number, co.total_amount, co.origin, co.destination,
            co.start_date, co.end_date, co.status, c.name as client_name
     FROM contracts co
     LEFT JOIN clients c ON co.client_id = c.id
     WHERE co.contract_number = $1`,
    [contractNumber]
  );
  return r.rows[0] || null;
};

const isDriverPortalExpense = (notes) => {
  try {
    const n = typeof notes === 'string' ? JSON.parse(notes || '{}') : notes || {};
    return n.driver_portal === true;
  } catch {
    return false;
  }
};

const getDriverPortal = async (req, res) => {
  try {
    const { contractNumber } = req.params;
    const contract = await getContractByNumber(contractNumber);
    if (!contract) {
      return res.status(404).json({ success: false, error: 'Contrato no encontrado' });
    }

    const expensesResult = await pool.query(
      `SELECT e.id, e.expense_type, e.amount, e.expense_date, e.notes, e.validation_status,
              e.driver_payment_method, pa.account_name
       FROM expenses e
       LEFT JOIN payment_accounts pa ON e.payment_account_id = pa.id
       WHERE e.contract_id = $1
       ORDER BY e.expense_date DESC, e.id DESC
       LIMIT 40`,
      [contract.id]
    );

    const paymentsResult = await pool.query(
      `SELECT p.id, p.amount, p.payment_date, p.payment_method, p.notes, pa.account_name
       FROM payments p
       LEFT JOIN payment_accounts pa ON p.payment_account_id = pa.id
       WHERE p.contract_id = $1
       ORDER BY p.payment_date DESC, p.id DESC
       LIMIT 40`,
      [contract.id]
    );

    res.json({
      success: true,
      data: {
        contract,
        recentExpenses: expensesResult.rows,
        recentPayments: paymentsResult.rows
      }
    });
  } catch (error) {
    console.error('Error driver portal GET:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

const postDriverExpense = async (req, res) => {
  try {
    const { contractNumber } = req.params;
    const contract = await getContractByNumber(contractNumber);
    if (!contract) {
      return res.status(404).json({ success: false, error: 'Contrato no encontrado' });
    }

    const { expense_type, amount, expense_date, notes, payment_method } = req.body;
    if (!expense_type || amount == null || amount === '') {
      return res.status(400).json({ success: false, error: 'Tipo y monto son obligatorios' });
    }
    const method = payment_method || 'Efectivo';
    if (!PAYMENT_METHODS.includes(method)) {
      return res.status(400).json({ success: false, error: 'Forma de pago no válida' });
    }

    const expenseNotes = JSON.stringify({
      driver_portal: true,
      payment_method: method,
      extra_notes: notes || ''
    });

    const result = await pool.query(
      `INSERT INTO expenses (
        contract_id, expense_type, amount, payment_account_id,
        business_unit, expense_date, notes, validation_status, driver_payment_method
      ) VALUES ($1, $2, $3, NULL, NULL, $4, $5, 'pending', $6)
      RETURNING *`,
      [
        contract.id,
        expense_type,
        parseFloat(amount),
        expense_date || new Date().toISOString().slice(0, 10),
        expenseNotes,
        method
      ]
    );

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error driver portal expense:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

const putDriverExpense = async (req, res) => {
  try {
    const { contractNumber, expenseId } = req.params;
    const contract = await getContractByNumber(contractNumber);
    if (!contract) {
      return res.status(404).json({ success: false, error: 'Contrato no encontrado' });
    }

    const ex = await pool.query(
      'SELECT * FROM expenses WHERE id = $1 AND contract_id = $2',
      [expenseId, contract.id]
    );
    if (ex.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Gasto no encontrado' });
    }
    const row = ex.rows[0];
    if (row.validation_status !== 'pending' || !isDriverPortalExpense(row.notes)) {
      return res.status(400).json({
        success: false,
        error: 'Solo puede editar gastos pendientes registrados desde aquí'
      });
    }

    const { expense_type, amount, expense_date, notes, payment_method } = req.body;
    const method = payment_method || 'Efectivo';
    if (!PAYMENT_METHODS.includes(method)) {
      return res.status(400).json({ success: false, error: 'Forma de pago no válida' });
    }

    const expenseNotes = JSON.stringify({
      driver_portal: true,
      payment_method: method,
      extra_notes: notes || ''
    });

    const result = await pool.query(
      `UPDATE expenses SET
        expense_type = $1,
        amount = $2,
        expense_date = $3,
        notes = $4,
        driver_payment_method = $5,
        updated_at = CURRENT_TIMESTAMP
       WHERE id = $6 AND contract_id = $7 AND validation_status = 'pending'
       RETURNING *`,
      [
        expense_type,
        parseFloat(amount),
        expense_date || row.expense_date,
        expenseNotes,
        method,
        expenseId,
        contract.id
      ]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ success: false, error: 'No se pudo actualizar' });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error driver portal put expense:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

const postDriverPayment = async (req, res) => {
  try {
    const { contractNumber } = req.params;
    const contract = await getContractByNumber(contractNumber);
    if (!contract) {
      return res.status(404).json({ success: false, error: 'Contrato no encontrado' });
    }

    const { amount, payment_date, notes, payment_method } = req.body;
    if (amount == null || amount === '') {
      return res.status(400).json({ success: false, error: 'Monto obligatorio' });
    }
    const method = payment_method || 'Efectivo';
    if (!PAYMENT_METHODS.includes(method)) {
      return res.status(400).json({ success: false, error: 'Forma de pago no válida' });
    }

    const payNotes = JSON.stringify({
      driver_portal: true,
      payment_method: method,
      extra_notes: notes || ''
    });

    const result = await pool.query(
      `INSERT INTO payments (
        contract_id, contract_number, payment_type, amount, payment_method,
        payment_account_id, payment_date, notes
      ) VALUES ($1, $2, $3, $4, $5, NULL, $6, $7)
      RETURNING *`,
      [
        contract.id,
        contract.contract_number,
        'Parcial',
        parseFloat(amount),
        method,
        payment_date || new Date().toISOString().slice(0, 10),
        payNotes
      ]
    );

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error driver portal payment:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = {
  getDriverPortal,
  postDriverExpense,
  putDriverExpense,
  postDriverPayment
};
