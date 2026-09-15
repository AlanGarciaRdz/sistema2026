const express = require('express');
const router = express.Router();
const { getUnitReport, getCompanyReport } = require('../controllers/reportsController');

router.get('/unit', getUnitReport);
router.get('/company', getCompanyReport);

module.exports = router;
