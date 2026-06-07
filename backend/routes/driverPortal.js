const express = require('express');
const router = express.Router();
const {
  getDriverPortal,
  postDriverExpense,
  postDriverExpensesBulk,
  putDriverExpense,
  deleteDriverExpense,
  postDriverPayment
} = require('../controllers/driverPortalController');

router.get('/:contractNumber', getDriverPortal);
router.post('/:contractNumber/expenses/bulk', postDriverExpensesBulk);
router.post('/:contractNumber/expenses', postDriverExpense);
router.put('/:contractNumber/expenses/:expenseId', putDriverExpense);
router.delete('/:contractNumber/expenses/:expenseId', deleteDriverExpense);
router.post('/:contractNumber/payments', postDriverPayment);

module.exports = router;
