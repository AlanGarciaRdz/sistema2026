const crypto = require('crypto');
const pool = require('../config/db');
const {
  EXPENSE_TYPE_INTERNAL,
  deletePairPaymentForExpense
} = require('../utils/accountTransfers');

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

/** Notes JSON marcando líneas del mismo reparto multipartida. */
const buildExpenseNotesForSplit = (userNotesRaw, groupId, partIndexOneBased, partTotal) => {
  const trimmed = userNotesRaw != null ? String(userNotesRaw).trim() : '';
  let base = {};
  if (trimmed) {
    try {
      const p = JSON.parse(trimmed);
      if (p && typeof p === 'object' && !Array.isArray(p)) base = p;
      else base = { user_notes: trimmed };
    } catch {
      base = { user_notes: trimmed };
    }
  }
  return JSON.stringify({
    ...base,
    expense_split_group: groupId,
    expense_split_part: partIndexOneBased,
    expense_split_parts: partTotal
  });
};

/** Suma líneas como centavos; tolerancia ±1 ctvs por float. */
const splitSumMatchesAmount = (splits, amountNum) => {
  const sumCents = splits.reduce((s, x) => s + Math.round(Number(x.amount) * 100), 0);
  const totalCents = Math.round(Number(amountNum) * 100);
  return Math.abs(sumCents - totalCents) <= 1;
};

// Get all expenses (?validation_status=pending|approved|rejected&start=&end=&limit=)
const getAllExpenses = async (req, res) => {
  try {
    const { validation_status, limit, start, end } = req.query;
    let rangeStart =
      start && DATE_ONLY.test(String(start).trim()) ? String(start).trim() : null;
    let rangeEnd =
      end && DATE_ONLY.test(String(end).trim()) ? String(end).trim() : null;
    if (rangeStart && rangeEnd && rangeStart > rangeEnd) {
      const t = rangeStart;
      rangeStart = rangeEnd;
      rangeEnd = t;
    }
    const hasDateRange = Boolean(rangeStart && rangeEnd);
    console.log('hasDateRange', hasDateRange);

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
    const conditions = [];

    if (validation_status) {
      params.push(validation_status);
      conditions.push(`e.validation_status = $${params.length}`);
    }
    if (hasDateRange) {
      params.push(rangeStart, rangeEnd);
      conditions.push(
        `e.expense_date >= $${params.length - 1}::date AND e.expense_date <= $${params.length}::date`
      );
    }

    if (conditions.length) {
      sql += ` WHERE ${conditions.join(' AND ')}`;
    }
    sql += ' ORDER BY e.expense_date DESC, e.id DESC';

    let lim = parseInt(limit, 10);
    if (hasDateRange) {
      if (Number.isNaN(lim) || lim <= 0) lim = 2000;
      lim = Math.min(Math.max(lim, 1), 5000);
      params.push(lim);
      sql += ` LIMIT $${params.length}`;
    } else if (!Number.isNaN(lim) && lim > 0 && lim <= 500) {
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

// Create new expense (opcional multipartida `splits` con varias cuentas)
const createExpense = async (req, res) => {
  const {
    contract_id, expense_type, amount, payment_account_id,
    business_unit, expense_date, notes, splits
  } = req.body;

  const amountNum =
    amount != null && amount !== ''
      ? Number(amount)
      : NaN;
  const splitsArr = Array.isArray(splits) ? splits : null;

  if (splitsArr && splitsArr.length >= 2) {
    if (!Number.isFinite(amountNum) || amountNum <= 0) {
      return res.status(400).json({ success: false, error: 'Monto inválido para reparto' });
    }
    for (const ln of splitsArr) {
      const pid =
        ln.payment_account_id != null ? parseInt(ln.payment_account_id, 10) : NaN;
      const amt = ln.amount != null ? Number(ln.amount) : NaN;
      if (Number.isNaN(pid) || pid < 1) {
        return res.status(400).json({ success: false, error: 'Cuenta inválida en reparto' });
      }
      if (!Number.isFinite(amt) || amt <= 0) {
        return res.status(400).json({
          success: false,
          error: 'Cada línea debe tener monto mayor a cero'
        });
      }
    }
    if (!splitSumMatchesAmount(splitsArr, amountNum)) {
      return res.status(400).json({
        success: false,
        error: 'Los importes por cuenta deben sumar exactamente el monto total'
      });
    }

    let client;
    try {
      client = await pool.connect();
      await client.query('BEGIN');
      const groupId = crypto.randomUUID();
      const createdRows = [];
      const n = splitsArr.length;
      let idx = 0;
      for (const ln of splitsArr) {
        idx += 1;
        const pid = parseInt(ln.payment_account_id, 10);
        const lineAmount = Number(ln.amount);
        const buLookup = await client.query(
          'SELECT business_unit FROM payment_accounts WHERE id = $1',
          [pid]
        );
        const bu =
          business_unit ||
          buLookup.rows[0]?.business_unit ||
          null;
        const noteStr = buildExpenseNotesForSplit(notes, groupId, idx, n);
        const ins = await client.query(
          `INSERT INTO expenses (
            contract_id, expense_type, amount, payment_account_id,
            business_unit, expense_date, notes, validation_status, driver_payment_method
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, COALESCE($8, 'approved'), $9)
          RETURNING *`,
          [
            contract_id || null,
            expense_type,
            lineAmount,
            pid,
            bu,
            expense_date,
            noteStr,
            req.body.validation_status,
            req.body.driver_payment_method || null
          ]
        );
        createdRows.push(ins.rows[0]);
      }
      await client.query('COMMIT');
      res.status(201).json({
        success: true,
        data: createdRows,
        split_group_id: groupId
      });
      return;
    } catch (inner) {
      if (client) await client.query('ROLLBACK').catch(() => {});
      console.error('Error creating split expenses:', inner);
      return res.status(500).json({ success: false, error: inner.message });
    } finally {
      if (client) client.release();
    }
  }
    const result = await pool.query(
      `INSERT INTO expenses (
        contract_id, expense_type, amount, payment_account_id,
        business_unit, expense_date, notes, validation_status, driver_payment_method
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, COALESCE($8, 'approved'), $9)
      RETURNING *`,
      [
        contract_id,
        expense_type,
        amount,
        payment_account_id,
        business_unit,
        expense_date,
        notes,
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

    const sel = await pool.query(
      'SELECT id, notes, expense_type FROM expenses WHERE id = $1',
      [id]
    );
    if (sel.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Expense not found' });
    }
    const row = sel.rows[0];
    if (row.expense_type === EXPENSE_TYPE_INTERNAL) {
      await deletePairPaymentForExpense(row.notes);
    }

    await pool.query('DELETE FROM expenses WHERE id = $1', [id]);

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
