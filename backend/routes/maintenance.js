const express = require('express');
const router = express.Router();
const {
  getAllMaintenance,
  getMaintenanceById,
  createMaintenance,
  updateMaintenance,
  deleteMaintenance,
  syncMaintenanceExpenses
} = require('../controllers/maintenanceController');

router.get('/', getAllMaintenance);
router.post('/sync-expenses', syncMaintenanceExpenses);
router.get('/:id', getMaintenanceById);
router.post('/', createMaintenance);
router.put('/:id', updateMaintenance);
router.delete('/:id', deleteMaintenance);

module.exports = router;
