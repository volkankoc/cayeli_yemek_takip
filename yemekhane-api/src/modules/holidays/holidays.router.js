const { Router } = require('express');
const holidaysController = require('./holidays.controller');
const { authenticate, requireAdmin } = require('../../middleware/auth');

const router = Router();

router.get('/', authenticate, holidaysController.getAll);
router.post('/', authenticate, requireAdmin, holidaysController.create);
router.delete('/:id', authenticate, requireAdmin, holidaysController.remove);

module.exports = router;
