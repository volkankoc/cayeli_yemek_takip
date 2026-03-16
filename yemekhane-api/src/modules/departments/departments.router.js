const { Router } = require('express');
const departmentsController = require('./departments.controller');
const { authenticate, requireAdmin } = require('../../middleware/auth');

const router = Router();

router.get('/', authenticate, departmentsController.getAll);
router.post('/', authenticate, requireAdmin, departmentsController.create);
router.put('/:id', authenticate, requireAdmin, departmentsController.update);
router.delete('/:id', authenticate, requireAdmin, departmentsController.remove);

module.exports = router;
