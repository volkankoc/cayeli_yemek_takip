const { Router } = require('express');
const settingsController = require('./settings.controller');
const { authenticate, requirePermission } = require('../../middleware/auth');

const router = Router();

router.get('/kiosk', authenticate, settingsController.getKiosk);
router.get('/', authenticate, requirePermission('settings.read'), settingsController.getAll);
router.put('/', authenticate, requirePermission('settings.write'), settingsController.update);

module.exports = router;
