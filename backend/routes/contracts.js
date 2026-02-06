const express = require('express');
const router = express.Router();
const {
  getAllContracts,
  getContractById,
  createContract,
  updateContract,
  deleteContract
} = require('../controllers/contractsController');

router.get('/', getAllContracts);
router.get('/:id', getContractById);
router.post('/', createContract);
router.put('/:id', updateContract);
router.delete('/:id', deleteContract);

module.exports = router;
