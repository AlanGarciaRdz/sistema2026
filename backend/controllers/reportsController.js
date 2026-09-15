const pool = require('../config/db');

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;
const IVA_RATE = 0.16;

function getContractAmountDue(row) {
  let notesData = {};
  try {
    notesData = row.notes ? JSON.parse(row.notes) : {};
  } catch {
    notesData = {};
  }
  const subtotal = parseFloat(row.total_amount) || 0;
  if (!notesData.includeIva) return subtotal;
  const iva = Math.round(subtotal * IVA_RATE * 100) / 100;
  return Math.round((subtotal + iva) * 100) / 100;
}

/** Claves de unidad de negocio para vincular egresos (Crédito, seguros, etc.) con el vehículo. */
function getVehicleBusinessUnitKeys(vehicle) {
  const code = (vehicle.vehicle_code || '').trim();
  const keys = new Set();
  if (!code) return [];
  keys.add(code.toUpperCase());
  keys.add(code.replace(/-/g, '_').toUpperCase());
  keys.add(code.replace(/-/g, ' ').toUpperCase());
  const m = code.match(/^([A-Za-z]+)-(\d{4})$/);
  if (m) keys.add(`${m[1].toUpperCase()} ${m[2]}`);
  return [...keys];
}

function isCreditoExpense(row) {
  const t = String(row.expense_type || '').trim().toLowerCase();
  return t === 'credito' || t === 'crédito';
}

/**
 * GET /reports/unit?start=YYYY-MM-DD&end=YYYY-MM-DD&vehicle_id=
 */
const getUnitReport = async (req, res) => {
  try {
    const { start, end, vehicle_id } = req.query;

    if (!vehicle_id) {
      return res.status(400).json({ success: false, error: 'Selecciona una unidad (vehicle_id)' });
    }
    if (!start || !end || !DATE_ONLY.test(String(start)) || !DATE_ONLY.test(String(end))) {
      return res.status(400).json({
        success: false,
        error: 'Rango de fechas inválido. Use start y end (YYYY-MM-DD).'
      });
    }

    const vehicleId = parseInt(vehicle_id, 10);
    if (!Number.isInteger(vehicleId) || vehicleId <= 0) {
      return res.status(400).json({ success: false, error: 'vehicle_id inválido' });
    }

    let rangeStart = String(start).trim();
    let rangeEnd = String(end).trim();
    if (rangeStart > rangeEnd) {
      const t = rangeStart;
      rangeStart = rangeEnd;
      rangeEnd = t;
    }

    const vehicleRes = await pool.query(
      `SELECT id, vehicle_code, brand, model, license_plate, fuel_type, status
       FROM vehicles WHERE id = $1`,
      [vehicleId]
    );
    if (!vehicleRes.rows.length) {
      return res.status(404).json({ success: false, error: 'Unidad no encontrada' });
    }
    const vehicle = vehicleRes.rows[0];
    const plate = (vehicle.license_plate || '').trim();
    const code = (vehicle.vehicle_code || '').trim();

    const contractsRes = await pool.query(
      `SELECT c.*, cl.name AS client_name
       FROM contracts c
       LEFT JOIN clients cl ON c.client_id = cl.id
       WHERE c.start_date >= $1::date AND c.start_date <= $2::date
       AND (
         ($3 <> '' AND c.vehicle_name = $3)
         OR ($4 <> '' AND c.vehicle_name = $4)
         OR (
           c.notes IS NOT NULL
           AND c.notes::text ~ '^\\s*\\{'
           AND (c.notes::jsonb->'vehicle'->>'id') = $5::text
         )
         OR EXISTS (
           SELECT 1 FROM assignments a
           WHERE a.contract_id = c.id AND a.vehicle_id = $6
         )
       )
       ORDER BY c.start_date ASC, c.contract_number ASC`,
      [rangeStart, rangeEnd, plate, code, String(vehicleId), vehicleId]
    );

    const contracts = contractsRes.rows;
    const contractIds = contracts.map((c) => c.id);

    let payments = [];
    if (contractIds.length > 0) {
      const payRes = await pool.query(
        `SELECT p.*, c.contract_number, cl.name AS client_name
         FROM payments p
         LEFT JOIN contracts c ON p.contract_id = c.id
         LEFT JOIN clients cl ON c.client_id = cl.id
         WHERE p.contract_id = ANY($1::int[])
         AND p.payment_date >= $2::date AND p.payment_date <= $3::date
         ORDER BY p.payment_date ASC, p.id ASC`,
        [contractIds, rangeStart, rangeEnd]
      );
      payments = payRes.rows;
    }

    let contractExpenses = [];
    if (contractIds.length > 0) {
      const expRes = await pool.query(
        `SELECT e.*, c.contract_number, cl.name AS client_name
         FROM expenses e
         LEFT JOIN contracts c ON e.contract_id = c.id
         LEFT JOIN clients cl ON c.client_id = cl.id
         WHERE e.contract_id = ANY($1::int[])
         AND e.expense_date >= $2::date AND e.expense_date <= $3::date
         ORDER BY e.expense_date ASC, e.id ASC`,
        [contractIds, rangeStart, rangeEnd]
      );
      contractExpenses = expRes.rows;
    }

    const maintRes = await pool.query(
      `SELECT m.*, v.vehicle_code, v.license_plate
       FROM vehicle_maintenance m
       LEFT JOIN vehicles v ON m.vehicle_id = v.id
       WHERE m.vehicle_id = $1
       AND m.maintenance_date >= $2::date AND m.maintenance_date <= $3::date
       ORDER BY m.maintenance_date ASC, m.id ASC`,
      [vehicleId, rangeStart, rangeEnd]
    );
    const maintenance = maintRes.rows;

    const businessUnitKeys = getVehicleBusinessUnitKeys(vehicle);

    let unitExpenses = [];
    if (businessUnitKeys.length > 0) {
      const unitExpRes = await pool.query(
        `SELECT e.*, pa.account_name, pa.business_unit AS account_business_unit
         FROM expenses e
         LEFT JOIN payment_accounts pa ON e.payment_account_id = pa.id
         WHERE e.expense_date >= $1::date AND e.expense_date <= $2::date
         AND e.contract_id IS NULL
         AND COALESCE(e.expense_type, '') <> 'Mantenimiento'
         AND (
           UPPER(TRIM(COALESCE(e.business_unit, ''))) = ANY($3::text[])
           OR UPPER(TRIM(COALESCE(pa.business_unit, ''))) = ANY($3::text[])
           OR (
             e.notes IS NOT NULL
             AND e.notes::text ~ '^\\s*\\{'
             AND (e.notes::jsonb->>'vehicle_id') = $4::text
           )
         )
         ORDER BY e.expense_date ASC, e.id ASC`,
        [rangeStart, rangeEnd, businessUnitKeys, String(vehicleId)]
      );
      unitExpenses = unitExpRes.rows;
    }
    const creditExpenses = unitExpenses.filter(isCreditoExpense);
    const otherUnitExpenses = unitExpenses.filter((e) => !isCreditoExpense(e));

    const totalQuoted = contracts.reduce((s, c) => s + getContractAmountDue(c), 0);
    const totalIncome = payments.reduce((s, p) => s + (parseFloat(p.amount) || 0), 0);
    const totalContractExpenses = contractExpenses.reduce(
      (s, e) => s + (parseFloat(e.amount) || 0),
      0
    );
    const totalMaintenanceCost = maintenance.reduce(
      (s, m) => s + (parseFloat(m.cost) || 0),
      0
    );
    const totalCreditExpenses = creditExpenses.reduce(
      (s, e) => s + (parseFloat(e.amount) || 0),
      0
    );
    const totalOtherUnitExpenses = otherUnitExpenses.reduce(
      (s, e) => s + (parseFloat(e.amount) || 0),
      0
    );
    const totalUnitExpenses = totalCreditExpenses + totalOtherUnitExpenses;
    const totalExpenses =
      totalContractExpenses + totalMaintenanceCost + totalUnitExpenses;
    const profitCollected = totalIncome - totalExpenses;
    const profitProjected = totalQuoted - totalExpenses;

    const clients = [...new Set(contracts.map((c) => c.client_name).filter(Boolean))];

    res.json({
      success: true,
      data: {
        period: { start: rangeStart, end: rangeEnd },
        vehicle: {
          ...vehicle,
          label:
            vehicle.vehicle_code ||
            vehicle.license_plate ||
            [vehicle.brand, vehicle.model].filter(Boolean).join(' ') ||
            `Unidad #${vehicle.id}`
        },
        summary: {
          contracts_count: contracts.length,
          clients,
          total_quoted: totalQuoted,
          total_income_collected: totalIncome,
          total_contract_expenses: totalContractExpenses,
          total_maintenance_cost: totalMaintenanceCost,
          total_credit_expenses: totalCreditExpenses,
          total_other_unit_expenses: totalOtherUnitExpenses,
          total_unit_expenses: totalUnitExpenses,
          total_expenses: totalExpenses,
          profit_collected: profitCollected,
          profit_projected: profitProjected,
          has_profit: profitProjected >= 0
        },
        contracts: contracts.map((c) => ({
          id: c.id,
          contract_number: c.contract_number,
          client_name: c.client_name,
          start_date: c.start_date,
          end_date: c.end_date,
          status: c.status,
          origin: c.origin,
          destination: c.destination,
          quoted_amount: getContractAmountDue(c)
        })),
        maintenance: maintenance.map((m) => ({
          id: m.id,
          maintenance_date: m.maintenance_date,
          mileage: m.mileage,
          maintenance_type: m.maintenance_type,
          cost: parseFloat(m.cost) || 0,
          notes: m.notes
        })),
        payments,
        contract_expenses: contractExpenses,
        credit_expenses: creditExpenses.map((e) => ({
          id: e.id,
          expense_date: e.expense_date,
          amount: parseFloat(e.amount) || 0,
          expense_type: e.expense_type,
          business_unit: e.business_unit || e.account_business_unit,
          account_name: e.account_name,
          notes: e.notes
        })),
        other_unit_expenses: otherUnitExpenses.map((e) => ({
          id: e.id,
          expense_date: e.expense_date,
          amount: parseFloat(e.amount) || 0,
          expense_type: e.expense_type,
          business_unit: e.business_unit || e.account_business_unit,
          account_name: e.account_name,
          notes: e.notes
        }))
      }
    });
  } catch (error) {
    console.error('Error unit report:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

function parseReportRange(start, end) {
  if (!start || !end || !DATE_ONLY.test(String(start)) || !DATE_ONLY.test(String(end))) {
    return { error: 'Rango de fechas inválido. Use start y end (YYYY-MM-DD).' };
  }
  let rangeStart = String(start).trim();
  let rangeEnd = String(end).trim();
  if (rangeStart > rangeEnd) {
    const t = rangeStart;
    rangeStart = rangeEnd;
    rangeEnd = t;
  }
  return { rangeStart, rangeEnd };
}

/** Una sola clave por unidad: SPRINTER-2026, SPRINTER_2026 y SPRINTER 2026 → SPRINTER 2026 */
function canonicalUnitKey(raw) {
  const s = String(raw ?? '').trim().toUpperCase();
  if (!s || s === 'SIN UNIDAD') return 'SIN UNIDAD';
  return s.replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').trim();
}

function normalizeUnitKey(raw) {
  return canonicalUnitKey(raw);
}

function buildVehicleUnitIndex(vehicles) {
  const keyToLabel = new Map();
  for (const v of vehicles) {
    const label = v.vehicle_code || v.license_plate || `Unidad ${v.id}`;
    const canonical = canonicalUnitKey(label);
    keyToLabel.set(canonical, label);
    for (const k of getVehicleBusinessUnitKeys(v)) {
      keyToLabel.set(canonicalUnitKey(k), label);
    }
  }
  return keyToLabel;
}

function contractBusinessUnitKey(row, vehicleIdToKeys) {
  if (row.vehicle_id && vehicleIdToKeys.has(row.vehicle_id)) {
    return vehicleIdToKeys.get(row.vehicle_id);
  }
  try {
    if (row.notes && String(row.notes).trim().startsWith('{')) {
      const n = JSON.parse(row.notes);
      const vid = n?.vehicle?.id;
      if (vid != null && vehicleIdToKeys.has(Number(vid))) {
        return vehicleIdToKeys.get(Number(vid));
      }
    }
  } catch {
    /* ignore */
  }
  const vn = String(row.vehicle_name || '').trim();
  if (vn) return canonicalUnitKey(vn);
  return 'SIN UNIDAD';
}

/** Ingreso: cuenta bancaria; si no hay, unidad del contrato (vehículo asignado). */
function resolvePaymentUnitKey(row, vehicleIdToKeys) {
  const accountUnit = String(row.account_business_unit ?? '').trim();
  if (accountUnit) return canonicalUnitKey(accountUnit);
  if (row.contract_id) return contractBusinessUnitKey(row, vehicleIdToKeys);
  return 'SIN UNIDAD';
}

/**
 * GET /reports/company?start=YYYY-MM-DD&end=YYYY-MM-DD
 */
const getCompanyReport = async (req, res) => {
  try {
    const { start, end } = req.query;
    const range = parseReportRange(start, end);
    if (range.error) {
      return res.status(400).json({ success: false, error: range.error });
    }
    const { rangeStart, rangeEnd } = range;

    const vehiclesRes = await pool.query(
      `SELECT id, vehicle_code, brand, model, license_plate
       FROM vehicles ORDER BY vehicle_code NULLS LAST, license_plate`
    );
    const vehicles = vehiclesRes.rows;
    const vehicleIdToKeys = new Map();
    const unitKeyToLabel = buildVehicleUnitIndex(vehicles);
    for (const v of vehicles) {
      const label = v.vehicle_code || v.license_plate || `Unidad ${v.id}`;
      const canonical = canonicalUnitKey(v.vehicle_code || label);
      vehicleIdToKeys.set(v.id, canonical);
      unitKeyToLabel.set(canonical, label);
    }

    const [
      revenueRes,
      expensesRes,
      tripsRes,
      porCobrarRes,
      incomePaymentsRes,
      expensesByUnitRes,
      taxesRes,
      taxesByUnitRes,
      expensesByTypeRes,
      tripsByVehicleRes,
      accountsRes
    ] = await Promise.all([
      pool.query(
        `SELECT COALESCE(SUM(amount), 0)::numeric AS total FROM payments
         WHERE payment_date::date >= $1::date AND payment_date::date <= $2::date`,
        [rangeStart, rangeEnd]
      ),
      pool.query(
        `SELECT COALESCE(SUM(amount), 0)::numeric AS total FROM expenses
         WHERE expense_date::date >= $1::date AND expense_date::date <= $2::date
         AND expense_type IS DISTINCT FROM 'Transferencia entre cuentas'`,
        [rangeStart, rangeEnd]
      ),
      pool.query(
        `SELECT COUNT(*)::int AS total_trips,
                COALESCE(SUM(total_amount), 0)::numeric AS contracts_value
         FROM contracts
         WHERE start_date IS NOT NULL
           AND start_date::date >= $1::date AND start_date::date <= $2::date`,
        [rangeStart, rangeEnd]
      ),
      pool.query(
        `SELECT c.*, cl.name AS client_name,
          (SELECT a.vehicle_id FROM assignments a WHERE a.contract_id = c.id LIMIT 1) AS vehicle_id
         FROM contracts c
         LEFT JOIN clients cl ON c.client_id = cl.id
         WHERE c.status = 'Por cobrar'
         ORDER BY c.start_date DESC`
      ),
      pool.query(
        `SELECT p.amount, p.contract_id,
                pa.business_unit AS account_business_unit,
                c.vehicle_name,
                c.notes,
                (SELECT a.vehicle_id FROM assignments a WHERE a.contract_id = c.id LIMIT 1) AS vehicle_id
         FROM payments p
         LEFT JOIN payment_accounts pa ON p.payment_account_id = pa.id
         LEFT JOIN contracts c ON p.contract_id = c.id
         WHERE p.payment_date::date >= $1::date AND p.payment_date::date <= $2::date`,
        [rangeStart, rangeEnd]
      ),
      pool.query(
        `SELECT normalize_unit AS business_unit, COALESCE(SUM(amount), 0)::numeric AS total
         FROM (
           SELECT e.amount,
             UPPER(TRIM(COALESCE(
               NULLIF(e.business_unit, ''),
               NULLIF(pa.business_unit, ''),
               'SIN UNIDAD'
             ))) AS normalize_unit
           FROM expenses e
           LEFT JOIN payment_accounts pa ON e.payment_account_id = pa.id
           WHERE e.expense_date::date >= $1::date AND e.expense_date::date <= $2::date
             AND e.expense_type IS DISTINCT FROM 'Transferencia entre cuentas'
         ) sub
         GROUP BY normalize_unit`,
        [rangeStart, rangeEnd]
      ),
      pool.query(
        `SELECT COALESCE(SUM(amount), 0)::numeric AS total FROM expenses
         WHERE expense_date::date >= $1::date AND expense_date::date <= $2::date
         AND expense_type IS DISTINCT FROM 'Transferencia entre cuentas'
         AND (
           LOWER(TRIM(expense_type)) IN ('impuestos', 'imss')
           OR LOWER(TRIM(expense_type)) LIKE '%impuesto%'
         )`,
        [rangeStart, rangeEnd]
      ),
      pool.query(
        `SELECT normalize_unit AS business_unit, COALESCE(SUM(amount), 0)::numeric AS total
         FROM (
           SELECT e.amount,
             UPPER(TRIM(COALESCE(
               NULLIF(e.business_unit, ''),
               NULLIF(pa.business_unit, ''),
               'SIN UNIDAD'
             ))) AS normalize_unit
           FROM expenses e
           LEFT JOIN payment_accounts pa ON e.payment_account_id = pa.id
           WHERE e.expense_date::date >= $1::date AND e.expense_date::date <= $2::date
             AND e.expense_type IS DISTINCT FROM 'Transferencia entre cuentas'
             AND (
               LOWER(TRIM(e.expense_type)) IN ('impuestos', 'imss')
               OR LOWER(TRIM(e.expense_type)) LIKE '%impuesto%'
             )
         ) sub
         GROUP BY normalize_unit`,
        [rangeStart, rangeEnd]
      ),
      pool.query(
        `SELECT COALESCE(NULLIF(TRIM(expense_type), ''), 'Sin tipo') AS expense_type,
                COALESCE(SUM(amount), 0)::numeric AS total,
                COUNT(*)::int AS expense_count
         FROM expenses
         WHERE expense_date::date >= $1::date AND expense_date::date <= $2::date
           AND expense_type IS DISTINCT FROM 'Transferencia entre cuentas'
         GROUP BY 1 ORDER BY total DESC`,
        [rangeStart, rangeEnd]
      ),
      pool.query(
        `SELECT v.id AS vehicle_id, v.vehicle_code, v.license_plate,
                COUNT(DISTINCT c.id)::int AS trips,
                COALESCE(SUM(c.total_amount), 0)::numeric AS quoted_subtotal
         FROM contracts c
         INNER JOIN assignments a ON a.contract_id = c.id
         INNER JOIN vehicles v ON v.id = a.vehicle_id
         WHERE c.start_date::date >= $1::date AND c.start_date::date <= $2::date
         GROUP BY v.id, v.vehicle_code, v.license_plate`,
        [rangeStart, rangeEnd]
      ),
      pool.query(
        `SELECT pa.id, pa.account_name, pa.bank_name, pa.account_type,
                COALESCE(pa.business_unit, 'Sin unidad') AS business_unit,
                COALESCE(pay.income, 0)::numeric AS income,
                COALESCE(exp.expenses, 0)::numeric AS expenses,
                (COALESCE(pay.income, 0) - COALESCE(exp.expenses, 0))::numeric AS balance
         FROM payment_accounts pa
         LEFT JOIN (
           SELECT payment_account_id, SUM(amount) AS income FROM payments
           WHERE payment_date::date >= $1::date AND payment_date::date <= $2::date
           GROUP BY payment_account_id
         ) pay ON pay.payment_account_id = pa.id
         LEFT JOIN (
           SELECT payment_account_id, SUM(amount) AS expenses FROM expenses
           WHERE expense_date::date >= $1::date AND expense_date::date <= $2::date
             AND expense_type IS DISTINCT FROM 'Transferencia entre cuentas'
           GROUP BY payment_account_id
         ) exp ON exp.payment_account_id = pa.id
         WHERE COALESCE(pa.status, 'Active') ILIKE 'active'
         ORDER BY pa.business_unit, pa.account_type, pa.account_name`,
        [rangeStart, rangeEnd]
      )
    ]);

    const totalIncome = parseFloat(revenueRes.rows[0].total) || 0;
    const totalExpenses = parseFloat(expensesRes.rows[0].total) || 0;
    const totalTrips = parseInt(tripsRes.rows[0].total_trips, 10) || 0;
    const contractsValue = parseFloat(tripsRes.rows[0].contracts_value) || 0;
    const totalTaxes = parseFloat(taxesRes.rows[0].total) || 0;
    const netFlow = totalIncome - totalExpenses;

    const porCobrarContracts = porCobrarRes.rows;
    let porCobrarTotal = 0;
    const porCobrarByUnit = new Map();

    const incomeByUnit = new Map();
    for (const row of incomePaymentsRes.rows) {
      const unitKey = resolvePaymentUnitKey(row, vehicleIdToKeys);
      const amount = parseFloat(row.amount) || 0;
      incomeByUnit.set(unitKey, (incomeByUnit.get(unitKey) || 0) + amount);
    }

    for (const c of porCobrarContracts) {
      const amount = getContractAmountDue(c);
      porCobrarTotal += amount;
      const unitKey = contractBusinessUnitKey(c, vehicleIdToKeys);
      porCobrarByUnit.set(unitKey, (porCobrarByUnit.get(unitKey) || 0) + amount);
    }

    const unitMap = new Map();
    const touchUnit = (key) => {
      const k = canonicalUnitKey(key);
      if (!unitMap.has(k)) {
        unitMap.set(k, {
          business_unit: k,
          label: unitKeyToLabel.get(k) || k,
          trips: 0,
          income: 0,
          expenses: 0,
          taxes: 0,
          por_cobrar: 0,
          quoted_value: 0,
          profit: 0
        });
      }
      return unitMap.get(k);
    };

    for (const [key, total] of incomeByUnit) {
      touchUnit(key).income += total;
    }
    for (const row of expensesByUnitRes.rows) {
      const u = touchUnit(row.business_unit);
      u.expenses += parseFloat(row.total) || 0;
    }
    for (const row of taxesByUnitRes.rows) {
      const u = touchUnit(row.business_unit);
      u.taxes += parseFloat(row.total) || 0;
    }
    for (const [key, amount] of porCobrarByUnit) {
      touchUnit(key).por_cobrar += amount;
    }
    for (const row of tripsByVehicleRes.rows) {
      const unitKey = vehicleIdToKeys.get(row.vehicle_id) || canonicalUnitKey(row.vehicle_code);
      const u = touchUnit(unitKey);
      u.trips += parseInt(row.trips, 10) || 0;
      u.quoted_value += parseFloat(row.quoted_subtotal) || 0;
      if (row.vehicle_code) u.label = row.vehicle_code;
    }

    const byUnit = [...unitMap.values()]
      .map((u) => ({
        ...u,
        profit: u.income - u.expenses
      }))
      .filter(
        (u) =>
          u.income > 0 ||
          u.expenses > 0 ||
          u.taxes > 0 ||
          u.por_cobrar > 0 ||
          u.trips > 0
      )
      .sort((a, b) => b.income - a.income || a.label.localeCompare(b.label, 'es'));

    const accounts = accountsRes.rows.map((row) => ({
      id: row.id,
      account_name: row.account_name,
      bank_name: row.bank_name,
      account_type: row.account_type || 'Otro',
      business_unit: row.business_unit,
      income: parseFloat(row.income) || 0,
      expenses: parseFloat(row.expenses) || 0,
      balance: parseFloat(row.balance) || 0
    }));

    const accountsByTypeMap = new Map();
    const accountsByBankMap = new Map();
    let totalCashInAccounts = 0;

    for (const acc of accounts) {
      totalCashInAccounts += acc.balance;
      const t = acc.account_type || 'Otro';
      if (!accountsByTypeMap.has(t)) {
        accountsByTypeMap.set(t, { account_type: t, total_balance: 0, income: 0, expenses: 0, count: 0 });
      }
      const tg = accountsByTypeMap.get(t);
      tg.total_balance += acc.balance;
      tg.income += acc.income;
      tg.expenses += acc.expenses;
      tg.count += 1;

      const bank = (acc.bank_name || 'Sin banco').trim();
      if (!accountsByBankMap.has(bank)) {
        accountsByBankMap.set(bank, { bank_name: bank, total_balance: 0, count: 0 });
      }
      const bg = accountsByBankMap.get(bank);
      bg.total_balance += acc.balance;
      bg.count += 1;
    }

    const expensesByType = expensesByTypeRes.rows.map((row) => ({
      expense_type: row.expense_type,
      total: parseFloat(row.total) || 0,
      count: parseInt(row.expense_count, 10) || 0
    }));

    res.json({
      success: true,
      data: {
        period: { start: rangeStart, end: rangeEnd },
        summary: {
          total_income: totalIncome,
          total_expenses: totalExpenses,
          net_flow: netFlow,
          total_trips: totalTrips,
          contracts_quoted_value: contractsValue,
          por_cobrar_total: porCobrarTotal,
          por_cobrar_count: porCobrarContracts.length,
          total_taxes: totalTaxes,
          accounts_net_balance: totalCashInAccounts,
          has_profit: netFlow >= 0
        },
        by_unit: byUnit,
        por_cobrar_contracts: porCobrarContracts.map((c) => ({
          contract_number: c.contract_number,
          client_name: c.client_name,
          start_date: c.start_date,
          amount_due: getContractAmountDue(c),
          business_unit:
            unitKeyToLabel.get(contractBusinessUnitKey(c, vehicleIdToKeys)) ||
            contractBusinessUnitKey(c, vehicleIdToKeys)
        })),
        accounts,
        accounts_by_type: [...accountsByTypeMap.values()].sort(
          (a, b) => b.total_balance - a.total_balance
        ),
        accounts_by_bank: [...accountsByBankMap.values()].sort(
          (a, b) => b.total_balance - a.total_balance
        ),
        expenses_by_type: expensesByType
      }
    });
  } catch (error) {
    console.error('Error company report:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = {
  getUnitReport,
  getCompanyReport
};
