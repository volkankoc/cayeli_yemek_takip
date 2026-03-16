const { Router } = require('express');
const mealTypesController = require('./meal-types.controller');
const { authenticate, requireAdmin } = require('../../middleware/auth');
const { validate } = require('../../middleware/validate');
const { createMealTypeSchema, updateMealTypeSchema } = require('./meal-types.schema');

const router = Router();

router.get('/', authenticate, mealTypesController.getAll);
router.post('/', authenticate, requireAdmin, validate(createMealTypeSchema), mealTypesController.create);
router.put('/:id', authenticate, requireAdmin, validate(updateMealTypeSchema), mealTypesController.update);

module.exports = router;
