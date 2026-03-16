const { Router } = require('express');
const reportsController = require('./reports.controller');
const { authenticate } = require('../../middleware/auth');

const router = Router();

router.get('/daily', authenticate, reportsController.daily);
router.get('/monthly', authenticate, reportsController.monthly);
router.get('/yearly', authenticate, reportsController.yearly);
router.get('/staff/:id', authenticate, reportsController.staffReport);
router.get('/export/monthly', authenticate, reportsController.exportMonthly);
router.get('/export/yearly', authenticate, reportsController.exportYearly);

module.exports = router;
