const express = require('express');
const router = express.Router();
const {
  getAllExpenses,
  getExpenseById,
  createExpense,
  validateExpense,
  updateExpense,
  deleteExpense
} = require('../controllers/expensesController');

router.get('/', getAllExpenses);
router.patch('/:id/validate', validateExpense);
router.get('/:id', getExpenseById);
router.post('/', createExpense);
router.put('/:id', updateExpense);
router.delete('/:id', deleteExpense);

module.exports = router;
