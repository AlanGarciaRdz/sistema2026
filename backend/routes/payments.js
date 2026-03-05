const express = require('express');
const router = express.Router();
const {
  getAllPayments,
  getPaymentById,
  getPaymentsByContractNumber,
  createPayment,
  updatePayment,
  deletePayment
} = require('../controllers/paymentsController');

router.get('/', getAllPayments);
router.get('/contract/:contract_number', getPaymentsByContractNumber);
router.get('/:id', getPaymentById);
router.post('/', createPayment);
router.put('/:id', updatePayment);
router.delete('/:id', deletePayment);

module.exports = router;
