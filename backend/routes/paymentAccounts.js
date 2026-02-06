const express = require('express');
const router = express.Router();
const {
  getAllPaymentAccounts,
  getPaymentAccountById,
  createPaymentAccount,
  updatePaymentAccount,
  deletePaymentAccount
} = require('../controllers/paymentAccountsController');

router.get('/', getAllPaymentAccounts);
router.get('/:id', getPaymentAccountById);
router.post('/', createPaymentAccount);
router.put('/:id', updatePaymentAccount);
router.delete('/:id', deletePaymentAccount);

module.exports = router;
