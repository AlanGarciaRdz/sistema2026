const express = require('express');
const router = express.Router();
const {
  getDriverPortal,
  postDriverExpense,
  putDriverExpense,
  postDriverPayment
} = require('../controllers/driverPortalController');

router.get('/:contractNumber', getDriverPortal);
router.post('/:contractNumber/expenses', postDriverExpense);
router.put('/:contractNumber/expenses/:expenseId', putDriverExpense);
router.post('/:contractNumber/payments', postDriverPayment);

module.exports = router;
