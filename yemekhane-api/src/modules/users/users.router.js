const express = require('express');
const { authenticate, requireAdmin } = require('../../middleware/auth');
const ctrl = require('./users.controller');

const router = express.Router();

router.use(authenticate, requireAdmin);

router.get('/',       ctrl.getAll);
router.get('/:id',    ctrl.getOne);
router.post('/',      ctrl.create);
router.put('/:id',    ctrl.update);
router.delete('/:id', ctrl.remove);

module.exports = router;
