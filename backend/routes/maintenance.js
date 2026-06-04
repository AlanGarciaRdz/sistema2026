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
const {
  getFleetOverview,
  updateVehicleMileage,
  createServiceItem,
  updateServiceItem,
  deleteServiceItem,
  ensureDieselAdblue
} = require('../controllers/fleetMaintenanceController');

router.get('/fleet', getFleetOverview);
router.patch('/vehicles/:vehicleId/mileage', updateVehicleMileage);
router.post('/vehicles/:vehicleId/adblue', ensureDieselAdblue);
router.post('/service-items', createServiceItem);
router.put('/service-items/:id', updateServiceItem);
router.delete('/service-items/:id', deleteServiceItem);
router.get('/', getAllMaintenance);
router.post('/sync-expenses', syncMaintenanceExpenses);
router.get('/:id', getMaintenanceById);
router.post('/', createMaintenance);
router.put('/:id', updateMaintenance);
router.delete('/:id', deleteMaintenance);

module.exports = router;
