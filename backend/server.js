const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Import routes
const clientsRoutes = require('./routes/clients');
const quotesRoutes = require('./routes/quotes');
const contractsRoutes = require('./routes/contracts');
const paymentsRoutes = require('./routes/payments');
const paymentAccountsRoutes = require('./routes/paymentAccounts');
const expensesRoutes = require('./routes/expenses');
const driversRoutes = require('./routes/drivers');
const vehiclesRoutes = require('./routes/vehicles');
const assignmentsRoutes = require('./routes/assignments');
const dashboardRoutes = require('./routes/dashboard');

// Use routes
app.use('/api/clients', clientsRoutes);
app.use('/api/quotes', quotesRoutes);
app.use('/api/contracts', contractsRoutes);
app.use('/api/payments', paymentsRoutes);
app.use('/api/payment-accounts', paymentAccountsRoutes);
app.use('/api/expenses', expensesRoutes);
app.use('/api/drivers', driversRoutes);
app.use('/api/vehicles', vehiclesRoutes);
app.use('/api/assignments', assignmentsRoutes);
app.use('/api/dashboard', dashboardRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'Server is running' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, error: 'Something went wrong!' });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`API available at http://localhost:${PORT}/api`);
});

module.exports = app;
