const express = require('express');
const router = express.Router();
const {
  getVehicleReportPortal,
  postVehicleReport
} = require('../controllers/vehicleReportPortalController');

router.get('/:vehicleKey', getVehicleReportPortal);
router.post('/:vehicleKey/reports', postVehicleReport);

module.exports = router;
