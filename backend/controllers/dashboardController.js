const pool = require('../config/db');

// Get dashboard metrics and data
const getDashboardData = async (req, res) => {
  try {
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
    
    // Get total revenue for current month
    const revenueResult = await pool.query(`
      SELECT COALESCE(SUM(amount), 0) as total
      FROM payments
      WHERE EXTRACT(MONTH FROM payment_date) = EXTRACT(MONTH FROM CURRENT_DATE)
        AND EXTRACT(YEAR FROM payment_date) = EXTRACT(YEAR FROM CURRENT_DATE)
    `);
    
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
    
    const dashboardData = {
      metrics: {
        totalClients: parseInt(clientsResult.rows[0].total),
        activeContracts: parseInt(activeContractsResult.rows[0].total),
        pendingQuotes: parseInt(pendingQuotesResult.rows[0].total),
        currentMonthRevenue: parseFloat(revenueResult.rows[0].total)
      },
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
