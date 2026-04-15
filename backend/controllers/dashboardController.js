const pool = require('../config/db');

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

/** Rango [desde, hasta] normalizado o null. */
const normalizeQueryRange = (a, b) => {
  if (a == null || b == null || a === '' || b === '') return null;
  let x = String(a).trim();
  let y = String(b).trim();
  if (!DATE_ONLY.test(x) || !DATE_ONLY.test(y)) return null;
  if (x > y) {
    const t = x;
    x = y;
    y = t;
  }
  return [x, y];
};

// Get dashboard metrics and data
const getDashboardData = async (req, res) => {
  try {
    const { start, end, metricStart, metricEnd } = req.query;
    const userRange = normalizeQueryRange(start, end);
    const metricFallback = !userRange && normalizeQueryRange(metricStart, metricEnd);
    const metricsRange = userRange || metricFallback;
    const hasUserAccountsRange = Boolean(userRange);

    // Get total clients
    const clientsResult = await pool.query('SELECT COUNT(*) as total FROM clients');
    
    // Get active contracts
    const activeContractsResult = await pool.query(
      "SELECT COUNT(*) as total FROM contracts WHERE status = 'Agendado'"
    );
    
    // Get pending quotes
    const pendingQuotesResult = await pool.query(
      "SELECT COUNT(*) as total FROM quotes WHERE status = 'Pendiente'"
    );
    
    // Ingresos: mismo criterio que Payments.jsx (todos los tipos, incl. transferencias internas).
    // Rango: URL start/end, o metricStart/metricEnd (mes local del navegador), o mes en America/Mexico_City.
    const revenueQuery = metricsRange
      ? `SELECT COALESCE(SUM(amount), 0) as total FROM payments
         WHERE payment_date::date >= $1::date AND payment_date::date <= $2::date`
      : `WITH mx AS (
           SELECT (CURRENT_TIMESTAMP AT TIME ZONE 'America/Mexico_City')::date AS today_mx
         )
         SELECT COALESCE(SUM(p.amount), 0) AS total
         FROM payments p, mx
         WHERE p.payment_date::date >= date_trunc('month', mx.today_mx)::date
           AND p.payment_date::date < (date_trunc('month', mx.today_mx) + interval '1 month')::date`;
    const revenueResult = await pool.query(revenueQuery, metricsRange || []);

    // Egresos: misma base que Egresos.jsx.
    const expensesQuery = metricsRange
      ? `SELECT COALESCE(SUM(amount), 0) as total FROM expenses
         WHERE expense_date::date >= $1::date AND expense_date::date <= $2::date`
      : `WITH mx AS (
           SELECT (CURRENT_TIMESTAMP AT TIME ZONE 'America/Mexico_City')::date AS today_mx
         )
         SELECT COALESCE(SUM(e.amount), 0) AS total
         FROM expenses e, mx
         WHERE e.expense_date::date >= date_trunc('month', mx.today_mx)::date
           AND e.expense_date::date < (date_trunc('month', mx.today_mx) + interval '1 month')::date`;
    const expensesResult = await pool.query(expensesQuery, metricsRange || []);

    // Cuentas: solo si el usuario eligió fechas en la URL (no aplica a metricStart/metricEnd).
    const accountsQuery = hasUserAccountsRange
      ? `SELECT pa.id, pa.account_name, pa.bank_name,
           COALESCE(pa.business_unit, 'Sin unidad') as business_unit,
           COALESCE(p.total, 0)::numeric - COALESCE(e.total, 0)::numeric as balance
         FROM payment_accounts pa
         LEFT JOIN (
           SELECT payment_account_id, SUM(amount) as total FROM payments
           WHERE payment_date >= $1 AND payment_date <= $2 GROUP BY payment_account_id
         ) p ON pa.id = p.payment_account_id
         LEFT JOIN (
           SELECT payment_account_id, SUM(amount) as total FROM expenses
           WHERE expense_date >= $1 AND expense_date <= $2 GROUP BY payment_account_id
         ) e ON pa.id = e.payment_account_id
         WHERE pa.status = 'Active' OR pa.status IS NULL
         ORDER BY pa.business_unit, pa.account_name`
      : `SELECT pa.id, pa.account_name, pa.bank_name,
           COALESCE(pa.business_unit, 'Sin unidad') as business_unit,
           COALESCE(p.total, 0)::numeric - COALESCE(e.total, 0)::numeric as balance
         FROM payment_accounts pa
         LEFT JOIN (
           SELECT payment_account_id, SUM(amount) as total FROM payments GROUP BY payment_account_id
         ) p ON pa.id = p.payment_account_id
         LEFT JOIN (
           SELECT payment_account_id, SUM(amount) as total FROM expenses GROUP BY payment_account_id
         ) e ON pa.id = e.payment_account_id
         WHERE pa.status = 'Active' OR pa.status IS NULL
         ORDER BY pa.business_unit, pa.account_name`;
    const accountsResult = await pool.query(accountsQuery, hasUserAccountsRange ? userRange : []);
    
    // Get 5 most recent contracts
    const recentContractsResult = await pool.query(`
      SELECT co.id, co.contract_number, co.start_date, co.end_date,
             co.total_amount, co.status, c.name as client_name
      FROM contracts co
      LEFT JOIN clients c ON co.client_id = c.id
      ORDER BY co.created_at DESC
      LIMIT 5
    `);
    
    // Get 5 upcoming assignments
    const upcomingAssignmentsResult = await pool.query(`
      SELECT a.id, a.driving_date, co.contract_number,
             d.name as driver_name, v.vehicle_code, c.name as client_name
      FROM assignments a
      LEFT JOIN contracts co ON a.contract_id = co.id
      LEFT JOIN clients c ON co.client_id = c.id
      LEFT JOIN drivers d ON a.driver_id = d.id
      LEFT JOIN vehicles v ON a.vehicle_id = v.id
      WHERE a.driving_date >= CURRENT_DATE
      ORDER BY a.driving_date ASC
      LIMIT 5
    `);
    
    // Group accounts by business_unit
    const accountsByUnit = {};
    for (const row of accountsResult.rows) {
      const unit = row.business_unit || 'Sin unidad';
      if (!accountsByUnit[unit]) {
        accountsByUnit[unit] = { businessUnit: unit, accounts: [], totalBalance: 0 };
      }
      const balance = parseFloat(row.balance) || 0;
      accountsByUnit[unit].accounts.push({
        id: row.id,
        account_name: row.account_name,
        bank_name: row.bank_name,
        balance
      });
      accountsByUnit[unit].totalBalance += balance;
    }
    const accountsByBusinessUnit = Object.values(accountsByUnit);

    const accountsByBankMap = {};
    for (const row of accountsResult.rows) {
      const raw = row.bank_name != null ? String(row.bank_name).trim() : '';
      const bank = raw || 'Sin banco';
      if (!accountsByBankMap[bank]) {
        accountsByBankMap[bank] = { bankName: bank, totalBalance: 0, accountCount: 0 };
      }
      const balance = parseFloat(row.balance) || 0;
      accountsByBankMap[bank].totalBalance += balance;
      accountsByBankMap[bank].accountCount += 1;
    }
    const accountsByBank = Object.values(accountsByBankMap).sort(
      (a, b) => b.totalBalance - a.totalBalance || a.bankName.localeCompare(b.bankName, 'es')
    );

    const dashboardData = {
      metrics: {
        totalClients: parseInt(clientsResult.rows[0].total),
        activeContracts: parseInt(activeContractsResult.rows[0].total),
        pendingQuotes: parseInt(pendingQuotesResult.rows[0].total),
        currentMonthRevenue: parseFloat(revenueResult.rows[0].total),
        currentMonthExpenses: parseFloat(expensesResult.rows[0].total),
        dateRange: userRange ? { start: userRange[0], end: userRange[1] } : null
      },
      accountsByBank,
      accountsByBusinessUnit,
      recentContracts: recentContractsResult.rows,
      upcomingAssignments: upcomingAssignmentsResult.rows
    };
    
    res.json({ success: true, data: dashboardData });
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = {
  getDashboardData
};
