const express = require('express');
const router = express.Router();
const {
  getAllContracts,
  getContractById,
  createContract,
  updateContract,
  syncContractCalendar,
  deleteContract
} = require('../controllers/contractsController');

router.get('/', getAllContracts);
router.post('/:id/calendar-sync', syncContractCalendar);
router.get('/:id', getContractById);
router.post('/', createContract);
router.put('/:id', updateContract);
router.delete('/:id', deleteContract);

module.exports = router;
