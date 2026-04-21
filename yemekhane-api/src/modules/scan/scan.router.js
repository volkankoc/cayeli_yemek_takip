const { Router } = require('express');
const scanController = require('./scan.controller');
const { authenticate, requirePermission } = require('../../middleware/auth');
const { validate } = require('../../middleware/validate');
const { scanSchema } = require('./scan.schema');

const router = Router();

router.post('/', authenticate, requirePermission('scan.execute'), validate(scanSchema), scanController.scan);

module.exports = router;
