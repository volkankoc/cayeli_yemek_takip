const { Router } = require('express');
const staffController = require('./staff.controller');
const { authenticate, requireAdmin } = require('../../middleware/auth');
const { validate } = require('../../middleware/validate');
const { createStaffSchema, updateStaffSchema, updateMealRightsSchema } = require('./staff.schema');

const router = Router();

router.get('/', authenticate, staffController.getAll);
router.post('/', authenticate, requireAdmin, validate(createStaffSchema), staffController.create);
router.get('/:id', authenticate, staffController.getById);
router.put('/:id', authenticate, requireAdmin, validate(updateStaffSchema), staffController.update);
router.delete('/:id', authenticate, requireAdmin, staffController.remove);

// Meal rights sub-routes
router.get('/:id/meal-rights', authenticate, staffController.getMealRights);
router.put('/:id/meal-rights', authenticate, requireAdmin, validate(updateMealRightsSchema), staffController.updateMealRights);

module.exports = router;
