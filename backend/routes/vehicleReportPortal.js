const express = require('express');
const router = express.Router();
const {
  getVehicleReportPortal,
  postVehicleReport
} = require('../controllers/vehicleReportPortalController');
const {
  getPortalInspectionContext,
  createPortalInspection,
  updatePortalInspection,
  completePortalInspection
} = require('../controllers/vehicleInspectionController');

router.get('/:vehicleKey', getVehicleReportPortal);
router.post('/:vehicleKey/reports', postVehicleReport);

router.get('/:vehicleKey/inspections/context', getPortalInspectionContext);
router.post('/:vehicleKey/inspections', createPortalInspection);
router.patch('/:vehicleKey/inspections/:inspectionId', updatePortalInspection);
router.post('/:vehicleKey/inspections/:inspectionId/complete', completePortalInspection);

module.exports = router;
