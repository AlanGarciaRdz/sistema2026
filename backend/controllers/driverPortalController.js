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

/** Valida cuenta activa; devuelve id y unidad de negocio. */
const resolvePaymentAccountId = async (payment_account_id) => {
  if (payment_account_id == null || payment_account_id === '') {
    return { accountId: null, businessUnit: null };
  }
  const parsed = parseInt(payment_account_id, 10);
  if (!Number.isFinite(parsed)) {
    return { error: 'Cuenta bancaria no válida' };
  }
  const acc = await pool.query(
    `SELECT id, business_unit FROM payment_accounts
     WHERE id = $1 AND (status IS NULL OR status = 'Active')`,
    [parsed]
  );
  if (acc.rows.length === 0) {
    return { error: 'Cuenta bancaria no encontrada' };
  }
  return {
    accountId: parsed,
    businessUnit: acc.rows[0].business_unit || null
  };
};

const getContractByNumber = async (contractNumber) => {
  const r = await pool.query(
    `SELECT co.*,
            c.name AS client_name,
            c.phone AS client_phone
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

const resolveAssignedDrivers = async (contract) => {
  const assignmentResult = await pool.query(
    `SELECT a.id, a.driver_id, a.driving_date, a.assigned_date,
            d.name AS driver_name,
            v.vehicle_code, v.license_plate
     FROM assignments a
     LEFT JOIN drivers d ON a.driver_id = d.id
     LEFT JOIN vehicles v ON a.vehicle_id = v.id
     WHERE a.contract_id = $1
     ORDER BY a.driving_date DESC NULLS LAST, d.name ASC NULLS LAST, a.id ASC`,
    [contract.id]
  );

  const rows = assignmentResult.rows.filter((row) => row.driver_name);
  if (rows.length) {
    return rows.map((row) => ({
      driver_name: row.driver_name,
      vehicle_code: row.vehicle_code,
      license_plate: row.license_plate,
      driving_date: row.driving_date
    }));
  }

  try {
    const notes = typeof contract.notes === 'string' ? JSON.parse(contract.notes || '{}') : {};
    if (Array.isArray(notes.assignments) && notes.assignments.length) {
      return notes.assignments
        .filter((a) => a?.driver_name)
        .map((a) => ({
          driver_name: a.driver_name,
          vehicle_code: a.vehicle_code || null,
          license_plate: a.license_plate || null,
          driving_date: a.driving_date || null
        }));
    }
    const a = notes?.assignment;
    if (a?.driver_name) {
      return [
        {
          driver_name: a.driver_name,
          vehicle_code: a.vehicle_code || null,
          license_plate: a.license_plate || null,
          driving_date: a.driving_date || null
        }
      ];
    }
  } catch {
    /* ignore */
  }

  return [];
};

const resolveAssignedDriver = async (contract) => {
  const drivers = await resolveAssignedDrivers(contract);
  return drivers[0] || null;
};

const getDriverPortal = async (req, res) => {
  try {
    const { contractNumber } = req.params;
    const contract = await getContractByNumber(contractNumber);
    if (!contract) {
      return res.status(404).json({ success: false, error: 'Contrato no encontrado' });
    }

    const assignedDriver = await resolveAssignedDriver(contract);
    const assignedDrivers = await resolveAssignedDrivers(contract);

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

    const accountsResult = await pool.query(
      `SELECT id, account_code, account_name, bank_name, business_unit
       FROM payment_accounts
       WHERE status IS NULL OR status = 'Active'
       ORDER BY account_code`
    );

    res.json({
      success: true,
      data: {
        contract,
        assignedDriver,
        assignedDrivers,
        recentExpenses: expensesResult.rows,
        recentPayments: paymentsResult.rows,
        paymentAccounts: accountsResult.rows
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

    const { expense_type, amount, expense_date, notes, payment_method, payment_account_id } =
      req.body;
    if (!expense_type || amount == null || amount === '') {
      return res.status(400).json({ success: false, error: 'Tipo y monto son obligatorios' });
    }
    const method = payment_method || 'Efectivo';
    if (!PAYMENT_METHODS.includes(method)) {
      return res.status(400).json({ success: false, error: 'Forma de pago no válida' });
    }

    const accountResolved = await resolvePaymentAccountId(payment_account_id);
    if (accountResolved.error) {
      return res.status(400).json({ success: false, error: accountResolved.error });
    }
    const { accountId, businessUnit } = accountResolved;
    const validationStatus = accountId ? 'approved' : 'pending';

    const expenseNotes = JSON.stringify({
      driver_portal: true,
      payment_method: method,
      extra_notes: notes || ''
    });

    const result = await pool.query(
      `INSERT INTO expenses (
        contract_id, expense_type, amount, payment_account_id,
        business_unit, expense_date, notes, validation_status, driver_payment_method
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *`,
      [
        contract.id,
        expense_type,
        parseFloat(amount),
        accountId,
        businessUnit,
        expense_date || new Date().toISOString().slice(0, 10),
        expenseNotes,
        validationStatus,
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

    const { expense_type, amount, expense_date, notes, payment_method, payment_account_id } =
      req.body;
    const method = payment_method || 'Efectivo';
    if (!PAYMENT_METHODS.includes(method)) {
      return res.status(400).json({ success: false, error: 'Forma de pago no válida' });
    }

    const accountResolved = await resolvePaymentAccountId(payment_account_id);
    if (accountResolved.error) {
      return res.status(400).json({ success: false, error: accountResolved.error });
    }
    const { accountId, businessUnit } = accountResolved;
    const validationStatus = accountId ? 'approved' : 'pending';

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
        payment_account_id = $6,
        business_unit = $7,
        validation_status = $8,
        updated_at = CURRENT_TIMESTAMP
       WHERE id = $9 AND contract_id = $10 AND validation_status = 'pending'
       RETURNING *`,
      [
        expense_type,
        parseFloat(amount),
        expense_date || row.expense_date,
        expenseNotes,
        method,
        accountId,
        businessUnit,
        validationStatus,
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

const deleteDriverExpense = async (req, res) => {
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
        error: 'Solo puede eliminar gastos pendientes registrados desde aquí'
      });
    }

    await pool.query('DELETE FROM expenses WHERE id = $1 AND contract_id = $2', [
      expenseId,
      contract.id
    ]);

    res.json({ success: true, message: 'Gasto eliminado' });
  } catch (error) {
    console.error('Error driver portal delete expense:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

const extractTagFolio = (notes) => {
  try {
    const n = typeof notes === 'string' ? JSON.parse(notes || '{}') : notes || {};
    return n.tag_folio != null ? String(n.tag_folio) : null;
  } catch {
    return null;
  }
};

const postDriverExpensesBulk = async (req, res) => {
  try {
    const { contractNumber } = req.params;
    const contract = await getContractByNumber(contractNumber);
    if (!contract) {
      return res.status(404).json({ success: false, error: 'Contrato no encontrado' });
    }

    const { items, payment_method, payment_account_id } = req.body;
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, error: 'No hay gastos para importar' });
    }

    const method = payment_method || 'Transferencia';
    if (!PAYMENT_METHODS.includes(method)) {
      return res.status(400).json({ success: false, error: 'Forma de pago no válida' });
    }

    const accountResolved = await resolvePaymentAccountId(payment_account_id);
    if (accountResolved.error) {
      return res.status(400).json({ success: false, error: accountResolved.error });
    }
    const { accountId, businessUnit } = accountResolved;
    const validationStatus = accountId ? 'approved' : 'pending';

    const existingRes = await pool.query(
      `SELECT notes FROM expenses WHERE contract_id = $1`,
      [contract.id]
    );
    const usedFolios = new Set();
    for (const row of existingRes.rows) {
      const f = extractTagFolio(row.notes);
      if (f) usedFolios.add(f);
    }

    const created = [];
    let skipped = 0;

    for (const item of items) {
      const amount = parseFloat(item.amount);
      if (!item.expense_type || !Number.isFinite(amount) || amount <= 0) {
        skipped++;
        continue;
      }

      const folio = item.tag_folio != null && item.tag_folio !== '' ? String(item.tag_folio) : null;
      if (folio && usedFolios.has(folio)) {
        skipped++;
        continue;
      }

      const expenseNotes = JSON.stringify({
        driver_portal: true,
        payment_method: method,
        extra_notes: item.notes || '',
        tag_folio: folio,
        tag_import: 'casetas_csv',
        caseta: item.caseta || null,
        carril: item.carril || null
      });

      const ins = await pool.query(
        `INSERT INTO expenses (
          contract_id, expense_type, amount, payment_account_id,
          business_unit, expense_date, notes, validation_status, driver_payment_method
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING id, expense_type, amount, expense_date, validation_status, payment_account_id`,
        [
          contract.id,
          item.expense_type,
          amount,
          accountId,
          businessUnit,
          item.expense_date || new Date().toISOString().slice(0, 10),
          expenseNotes,
          validationStatus,
          method
        ]
      );

      if (folio) usedFolios.add(folio);
      created.push(ins.rows[0]);
    }

    res.status(201).json({
      success: true,
      created: created.length,
      skipped,
      data: created
    });
  } catch (error) {
    console.error('Error driver portal bulk expenses:', error);
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

    const { amount, payment_date, notes, payment_method, payment_account_id } = req.body;
    if (amount == null || amount === '') {
      return res.status(400).json({ success: false, error: 'Monto obligatorio' });
    }
    const method = payment_method || 'Efectivo';
    if (!PAYMENT_METHODS.includes(method)) {
      return res.status(400).json({ success: false, error: 'Forma de pago no válida' });
    }

    const accountResolved = await resolvePaymentAccountId(payment_account_id);
    if (accountResolved.error) {
      return res.status(400).json({ success: false, error: accountResolved.error });
    }
    const { accountId } = accountResolved;

    const payNotes = JSON.stringify({
      driver_portal: true,
      payment_method: method,
      extra_notes: notes || ''
    });

    const result = await pool.query(
      `INSERT INTO payments (
        contract_id, contract_number, payment_type, amount, payment_method,
        payment_account_id, payment_date, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *`,
      [
        contract.id,
        contract.contract_number,
        'Parcial',
        parseFloat(amount),
        method,
        accountId,
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
  postDriverExpensesBulk,
  putDriverExpense,
  deleteDriverExpense,
  postDriverPayment
};
