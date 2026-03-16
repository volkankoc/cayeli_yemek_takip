const { Router } = require('express');
const settingsController = require('./settings.controller');
const { authenticate, requireAdmin } = require('../../middleware/auth');

const router = Router();

router.get('/', authenticate, settingsController.getAll);
router.put('/', authenticate, requireAdmin, settingsController.update);

module.exports = router;
