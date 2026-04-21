const { Router } = require('express');
const { authenticate, requireAdmin } = require('../../middleware/auth');
const controller = require('./permissions.controller');

const router = Router();
router.use(authenticate, requireAdmin);
router.get('/matrix', controller.getMatrix);
router.put('/matrix', controller.updateRole);

module.exports = router;
