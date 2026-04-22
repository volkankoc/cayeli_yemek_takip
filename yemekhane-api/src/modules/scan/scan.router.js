const { Router } = require('express');
const scanController = require('./scan.controller');
const { authenticate, requirePermission } = require('../../middleware/auth');
const { validate } = require('../../middleware/validate');
const { scanSchema, cancelLastScanSchema, cancelScanSchema } = require('./scan.schema');

const router = Router();

router.post('/', authenticate, requirePermission('scan.execute'), validate(scanSchema), scanController.scan);
router.post('/cancel-last', authenticate, requirePermission('scan.execute'), validate(cancelLastScanSchema), scanController.cancelLast);
router.post('/cancel', authenticate, requirePermission('scan.execute'), validate(cancelScanSchema), scanController.cancelScan);

module.exports = router;
